"""Atlassian Statuspage integration client."""

import httpx

from clients.http import new_async_client, request_with_retries
from exceptions import StatuspageAPIError


class StatuspageClient:
    """Client for read-only Statuspage incident ingestion."""

    MAX_ITEMS_PER_REQUEST = 100

    def __init__(self, page_id: str, api_key: str) -> None:
        self.page_id = page_id.strip()
        self.api_key = api_key
        self.base_url = "https://api.statuspage.io/v1"

    @property
    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"OAuth {self.api_key}"}

    async def test_connection(self) -> dict:
        """Validate Statuspage credentials by reading the first incidents page."""
        incidents = await self.fetch_incidents(max_pages=1, limit=1)
        return {
            "page_id": self.page_id,
            "sample_incidents": len(incidents),
        }

    async def fetch_incidents(
        self,
        *,
        query: str | None = None,
        max_pages: int = 1,
        limit: int = MAX_ITEMS_PER_REQUEST,
    ) -> list[dict]:
        """Fetch Statuspage incidents with bounded pagination."""
        if not self.page_id:
            raise StatuspageAPIError("Statuspage page ID is required.")

        page_limit = min(max(limit, 1), self.MAX_ITEMS_PER_REQUEST)
        incidents: list[dict] = []

        try:
            async with new_async_client(timeout=httpx.Timeout(30.0)) as client:
                for page in range(1, max_pages + 1):
                    params: dict[str, int | str] = {
                        "limit": page_limit,
                        "page": page,
                    }
                    if query:
                        params["q"] = query

                    response = await request_with_retries(
                        client,
                        "GET",
                        f"{self.base_url}/pages/{self.page_id}/incidents",
                        params=params,
                        headers=self._headers,
                        max_attempts=3,
                    )
                    self._raise_for_response(response)

                    data = response.json()
                    if not isinstance(data, list):
                        raise StatuspageAPIError(
                            "Statuspage returned an unexpected incident payload.",
                            details={"payload_type": type(data).__name__},
                        )

                    incidents.extend(data)
                    if len(data) < page_limit:
                        break

            return incidents

        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            raise StatuspageAPIError(
                "Could not connect to Statuspage API.",
                details={"page_id": self.page_id},
            ) from exc
        except StatuspageAPIError:
            raise
        except Exception as exc:
            raise StatuspageAPIError(
                f"Unexpected error fetching Statuspage incidents: {str(exc)}",
                details={"page_id": self.page_id, "error": str(exc)},
            ) from exc

    @staticmethod
    def _raise_for_response(response: httpx.Response) -> None:
        if response.status_code < 400:
            return

        details = {"status_code": response.status_code, "body": response.text}
        if response.status_code == 401:
            raise StatuspageAPIError("Could not authenticate to Statuspage.", details=details)
        if response.status_code == 403:
            raise StatuspageAPIError(
                "Statuspage API key is not authorized for this page.",
                details=details,
            )
        if response.status_code == 404:
            raise StatuspageAPIError("Statuspage page was not found.", details=details)
        if response.status_code >= 500:
            raise StatuspageAPIError(
                f"Statuspage API is unavailable: {response.status_code}",
                details=details,
            )

        raise StatuspageAPIError(
            f"Statuspage API error: {response.status_code}",
            details=details,
        )
