"""Zendesk Support integration client."""

import httpx

from clients.http import new_async_client, request_with_retries
from exceptions import ZendeskAPIError


class ZendeskClient:
    """Client for read-only Zendesk ticket ingestion."""

    MAX_ITEMS_PER_REQUEST = 100

    def __init__(self, url: str, email: str, api_token: str) -> None:
        self.url = url.rstrip("/")
        self.email = email
        self.api_token = api_token
        self.auth = (f"{email}/token", api_token)

    async def test_connection(self) -> dict:
        """Validate Zendesk credentials by reading the current user."""
        if not self.url:
            raise ZendeskAPIError("Zendesk URL is required.")

        try:
            async with new_async_client(timeout=httpx.Timeout(10.0)) as client:
                response = await request_with_retries(
                    client,
                    "GET",
                    f"{self.url}/api/v2/users/me.json",
                    auth=self.auth,
                    max_attempts=2,
                )
                self._raise_for_response(response)

                data = response.json()
                user = data.get("user") if isinstance(data, dict) else None
                if not isinstance(user, dict):
                    raise ZendeskAPIError(
                        "Zendesk returned an unexpected user payload.",
                        details={"payload_type": type(data).__name__},
                    )

                return {
                    "url": self.url,
                    "user": user.get("name", "Unknown"),
                    "email": user.get("email", self.email),
                }

        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            raise ZendeskAPIError(
                "Could not connect to Zendesk API.",
                details={"url": self.url},
            ) from exc
        except ZendeskAPIError:
            raise
        except Exception as exc:
            raise ZendeskAPIError(
                f"Unexpected error testing Zendesk connection: {str(exc)}",
                details={"url": self.url, "error": str(exc)},
            ) from exc

    async def search_tickets(
        self,
        *,
        query: str,
        max_pages: int = 1,
        limit: int = MAX_ITEMS_PER_REQUEST,
    ) -> list[dict]:
        """Search Zendesk tickets with bounded pagination."""
        if not self.url:
            raise ZendeskAPIError("Zendesk URL is required.")

        normalized_query = query.strip()
        if not normalized_query:
            raise ZendeskAPIError("Zendesk search query is required.")

        page_limit = min(max(limit, 1), self.MAX_ITEMS_PER_REQUEST)
        tickets: list[dict] = []

        try:
            async with new_async_client(timeout=httpx.Timeout(30.0)) as client:
                for page in range(1, max_pages + 1):
                    response = await request_with_retries(
                        client,
                        "GET",
                        f"{self.url}/api/v2/search.json",
                        params={
                            "query": normalized_query,
                            "page": page,
                            "per_page": page_limit,
                        },
                        auth=self.auth,
                        max_attempts=3,
                    )
                    self._raise_for_response(response)

                    data = response.json()
                    if not isinstance(data, dict):
                        raise ZendeskAPIError(
                            "Zendesk returned an unexpected search payload.",
                            details={"payload_type": type(data).__name__},
                        )

                    results = data.get("results")
                    if not isinstance(results, list):
                        raise ZendeskAPIError(
                            "Zendesk search response is missing results.",
                            details={"payload_type": type(results).__name__},
                        )

                    page_tickets = [
                        result
                        for result in results
                        if isinstance(result, dict) and result.get("result_type") == "ticket"
                    ]
                    tickets.extend(page_tickets)

                    if len(results) < page_limit or not data.get("next_page"):
                        break

            return tickets

        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            raise ZendeskAPIError(
                "Could not connect to Zendesk API.",
                details={"url": self.url},
            ) from exc
        except ZendeskAPIError:
            raise
        except Exception as exc:
            raise ZendeskAPIError(
                f"Unexpected error searching Zendesk tickets: {str(exc)}",
                details={"url": self.url, "error": str(exc)},
            ) from exc

    @staticmethod
    def _raise_for_response(response: httpx.Response) -> None:
        if response.status_code < 400:
            return

        details = {"status_code": response.status_code, "body": response.text}
        if response.status_code == 401:
            raise ZendeskAPIError("Could not authenticate to Zendesk.", details=details)
        if response.status_code == 403:
            raise ZendeskAPIError(
                "Zendesk API token is not authorized for this operation.",
                details=details,
            )
        if response.status_code == 404:
            raise ZendeskAPIError("Zendesk instance or resource was not found.", details=details)
        if response.status_code == 429:
            raise ZendeskAPIError("Zendesk API rate limit exceeded.", details=details)
        if response.status_code >= 500:
            raise ZendeskAPIError(
                f"Zendesk API is unavailable: {response.status_code}",
                details=details,
            )

        raise ZendeskAPIError(
            f"Zendesk API error: {response.status_code}",
            details=details,
        )
