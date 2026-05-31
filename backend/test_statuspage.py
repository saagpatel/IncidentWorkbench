"""Statuspage integration tests."""

import httpx
import pytest
from fastapi.testclient import TestClient

from exceptions import StatuspageAPIError
from main import app
from services import statuspage_client as statuspage_module
from services.statuspage_client import StatuspageClient
from test_helpers import login_admin

pytestmark = pytest.mark.unit


def _statuspage_incident(incident_id: str = "inc-1") -> dict:
    return {
        "id": incident_id,
        "name": "Checkout API outage",
        "impact": "major",
        "status": "resolved",
        "created_at": "2024-01-15T10:30:00Z",
        "resolved_at": "2024-01-15T11:00:00Z",
        "incident_updates": [
            {
                "status": "investigating",
                "display_at": "2024-01-15T10:30:00Z",
                "body": "Investigating checkout errors.",
            }
        ],
    }


@pytest.mark.asyncio
async def test_statuspage_client_fetches_incidents_with_oauth_header(monkeypatch):
    """Statuspage client should call the documented endpoint with OAuth auth."""
    seen_headers = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_headers.append(request.headers.get("Authorization"))
        assert request.url.path == "/v1/pages/page-123/incidents"
        assert request.url.params["limit"] == "100"
        assert request.url.params["page"] == "1"
        assert request.url.params["q"] == "checkout"
        return httpx.Response(200, json=[_statuspage_incident()])

    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(
        statuspage_module,
        "new_async_client",
        lambda timeout=None: httpx.AsyncClient(transport=transport, timeout=timeout),
    )

    client = StatuspageClient(page_id="page-123", api_key="secret")
    incidents = await client.fetch_incidents(query="checkout")

    assert len(incidents) == 1
    assert incidents[0]["id"] == "inc-1"
    assert seen_headers == ["OAuth secret"]


@pytest.mark.asyncio
async def test_statuspage_client_rejects_auth_failure(monkeypatch):
    """Statuspage auth failures should become domain errors without leaking tokens."""

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"message": "Could not authenticate"})

    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(
        statuspage_module,
        "new_async_client",
        lambda timeout=None: httpx.AsyncClient(transport=transport, timeout=timeout),
    )

    client = StatuspageClient(page_id="page-123", api_key="secret")
    with pytest.raises(StatuspageAPIError) as exc:
        await client.fetch_incidents()

    assert "authenticate" in exc.value.message
    assert "secret" not in str(exc.value.details)


def test_statuspage_ingest_tracks_insert_and_update(monkeypatch):
    """Statuspage ingest should normalize incidents and count upserts."""
    client = TestClient(app)
    headers = login_admin(client)
    client.delete("/incidents", headers=headers)

    async def fake_fetch_incidents(self, *, query=None, max_pages=1, limit=100):
        assert self.page_id == "page-123"
        assert self.api_key == "secret"
        assert query == "checkout"
        assert max_pages == 2
        return [_statuspage_incident()]

    monkeypatch.setattr(StatuspageClient, "fetch_incidents", fake_fetch_incidents)

    payload = {
        "page_id": "page-123",
        "api_key": "secret",
        "query": "checkout",
        "max_pages": 2,
    }

    first = client.post("/ingest/statuspage", json=payload, headers=headers)
    assert first.status_code == 200
    assert first.json() == {
        "incidents_ingested": 1,
        "incidents_updated": 0,
        "errors": [],
    }

    second = client.post("/ingest/statuspage", json=payload, headers=headers)
    assert second.status_code == 200
    assert second.json() == {
        "incidents_ingested": 0,
        "incidents_updated": 1,
        "errors": [],
    }

    incidents = client.get("/incidents?source=statuspage", headers=headers)
    assert incidents.status_code == 200
    body = incidents.json()
    assert body["total"] == 1
    assert body["incidents"][0]["source"] == "statuspage"

    client.delete("/incidents", headers=headers)


def test_statuspage_ingest_reports_normalization_errors(monkeypatch):
    """Bad Statuspage records should not abort the whole batch."""
    client = TestClient(app)
    headers = login_admin(client)
    client.delete("/incidents", headers=headers)

    async def fake_fetch_incidents(self, *, query=None, max_pages=1, limit=100):
        return [{"name": "Missing ID"}]

    monkeypatch.setattr(StatuspageClient, "fetch_incidents", fake_fetch_incidents)

    response = client.post(
        "/ingest/statuspage",
        json={"page_id": "page-123", "api_key": "secret"},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["incidents_ingested"] == 0
    assert body["incidents_updated"] == 0
    assert len(body["errors"]) == 1
    assert "missing id" in body["errors"][0]

    client.delete("/incidents", headers=headers)
