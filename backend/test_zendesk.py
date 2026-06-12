"""Zendesk integration tests."""

import httpx
import pytest
from fastapi.testclient import TestClient

from exceptions import ZendeskAPIError
from main import app
from services import zendesk_client as zendesk_module
from services.zendesk_client import ZendeskClient
from test_helpers import login_admin

pytestmark = pytest.mark.unit


def _zendesk_ticket(ticket_id: int | None = 42) -> dict:
    ticket = {
        "id": ticket_id,
        "result_type": "ticket",
        "subject": "Checkout API outage",
        "description": "Customers cannot complete checkout.",
        "priority": "high",
        "status": "solved",
        "type": "incident",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T11:00:00Z",
        "tags": ["incident", "checkout"],
        "assignee_id": 1001,
        "requester_id": 2002,
        "url": "https://example.zendesk.com/api/v2/tickets/42.json",
    }
    if ticket_id is None:
        ticket.pop("id")
    return ticket


@pytest.mark.asyncio
async def test_zendesk_client_searches_tickets_with_token_auth(monkeypatch):
    """Zendesk client should call search with bounded pagination and token auth."""
    seen_auth = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_auth.append(request.headers.get("Authorization"))
        assert request.url.path == "/api/v2/search.json"
        assert request.url.params["query"] == "type:ticket tags:incident"
        assert request.url.params["page"] == "1"
        assert request.url.params["per_page"] == "100"
        return httpx.Response(
            200,
            json={
                "results": [_zendesk_ticket(), {"id": 99, "result_type": "user"}],
                "next_page": None,
            },
        )

    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(
        zendesk_module,
        "new_async_client",
        lambda timeout=None: httpx.AsyncClient(transport=transport, timeout=timeout),
    )

    client = ZendeskClient(
        url="https://example.zendesk.com",
        email="ops@example.com",
        api_token="secret",
    )
    tickets = await client.search_tickets(query="type:ticket tags:incident")

    assert [ticket["id"] for ticket in tickets] == [42]
    assert len(seen_auth) == 1
    assert seen_auth[0] is not None


@pytest.mark.asyncio
async def test_zendesk_client_rejects_auth_failure_without_leaking_token(monkeypatch):
    """Zendesk auth failures should become domain errors without token disclosure."""

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "Couldn't authenticate you"})

    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(
        zendesk_module,
        "new_async_client",
        lambda timeout=None: httpx.AsyncClient(transport=transport, timeout=timeout),
    )

    client = ZendeskClient(
        url="https://example.zendesk.com",
        email="ops@example.com",
        api_token="secret",
    )
    with pytest.raises(ZendeskAPIError) as exc:
        await client.search_tickets(query="type:ticket")

    assert "authenticate" in exc.value.message
    assert "secret" not in str(exc.value.details)


@pytest.mark.asyncio
async def test_zendesk_client_rejects_unexpected_payload(monkeypatch):
    """Malformed Zendesk search payloads should fail as domain errors."""

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"count": 1})

    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(
        zendesk_module,
        "new_async_client",
        lambda timeout=None: httpx.AsyncClient(transport=transport, timeout=timeout),
    )

    client = ZendeskClient(
        url="https://example.zendesk.com",
        email="ops@example.com",
        api_token="secret",
    )
    with pytest.raises(ZendeskAPIError) as exc:
        await client.search_tickets(query="type:ticket")

    assert "missing results" in exc.value.message


def test_zendesk_ingest_tracks_insert_and_update(monkeypatch):
    """Zendesk ingest should normalize tickets and count upserts."""
    client = TestClient(app)
    headers = login_admin(client)
    client.delete("/incidents", headers=headers)

    async def fake_search_tickets(self, *, query, max_pages=1, limit=100):
        assert self.url == "https://example.zendesk.com"
        assert self.email == "ops@example.com"
        assert self.api_token == "secret"
        assert query == "type:ticket tags:incident"
        assert max_pages == 2
        return [_zendesk_ticket()]

    monkeypatch.setattr(ZendeskClient, "search_tickets", fake_search_tickets)

    payload = {
        "url": "https://example.zendesk.com",
        "email": "ops@example.com",
        "api_token": "secret",
        "query": "type:ticket tags:incident",
        "max_pages": 2,
    }

    first = client.post("/ingest/zendesk", json=payload, headers=headers)
    assert first.status_code == 200
    assert first.json() == {
        "incidents_ingested": 1,
        "incidents_updated": 0,
        "errors": [],
    }

    second = client.post("/ingest/zendesk", json=payload, headers=headers)
    assert second.status_code == 200
    assert second.json() == {
        "incidents_ingested": 0,
        "incidents_updated": 1,
        "errors": [],
    }

    incidents = client.get("/incidents?source=zendesk", headers=headers)
    assert incidents.status_code == 200
    body = incidents.json()
    assert body["total"] == 1
    assert body["incidents"][0]["source"] == "zendesk"
    assert body["incidents"][0]["severity"] == "SEV2"

    client.delete("/incidents", headers=headers)


def test_zendesk_ingest_reports_normalization_errors(monkeypatch):
    """Bad Zendesk tickets should not abort the whole batch."""
    client = TestClient(app)
    headers = login_admin(client)
    client.delete("/incidents", headers=headers)

    async def fake_search_tickets(self, *, query, max_pages=1, limit=100):
        return [_zendesk_ticket(ticket_id=None)]

    monkeypatch.setattr(ZendeskClient, "search_tickets", fake_search_tickets)

    response = client.post(
        "/ingest/zendesk",
        json={
            "url": "https://example.zendesk.com",
            "email": "ops@example.com",
            "api_token": "secret",
            "query": "type:ticket",
        },
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["incidents_ingested"] == 0
    assert body["incidents_updated"] == 0
    assert len(body["errors"]) == 1
    assert "missing id" in body["errors"][0]

    client.delete("/incidents", headers=headers)
