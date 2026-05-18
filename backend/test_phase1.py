"""Phase 1 tests for data aggregation."""

import asyncio
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from config import settings
from main import app
from models.incident import IncidentSource, Severity
from routers import health as health_router
from routers.ingest import _resolve_safe_export_path
from services.jira_client import JiraClient
from services.normalizer import IncidentNormalizer
from services.slack_client import SlackClient
from test_helpers import login_admin

pytestmark = pytest.mark.unit


def test_normalizer_jira():
    """Test Jira issue normalization."""
    sample_issue = {
        "key": "OPS-123",
        "fields": {
            "summary": "Production outage in us-east-1",
            "description": "Database connection pool exhausted",
            "created": "2024-01-15T10:30:00.000+0000",
            "resolutiondate": "2024-01-15T12:45:00.000+0000",
            "priority": {"name": "Highest"},
            "status": {"name": "Resolved"},
            "assignee": {"displayName": "John Doe"},
            "labels": ["production", "database"],
            "project": {"key": "OPS"},
        },
    }

    incident = IncidentNormalizer.normalize_jira_issue(sample_issue)

    assert incident.external_id == "OPS-123"
    assert incident.source == IncidentSource.JIRA
    assert incident.severity == Severity.SEV1
    assert incident.title == "Production outage in us-east-1"
    assert incident.description == "Database connection pool exhausted"
    assert incident.resolved_at is not None

    print("✓ Jira normalization test passed")


def test_normalizer_slack():
    """Test Slack thread normalization."""
    sample_messages = [
        {
            "text": "SEV1: API is down in production",
            "ts": "1705315800.123456",
            "user": "U12345",
        },
        {
            "text": "Investigating database connection issues",
            "ts": "1705316100.123456",
            "user": "U12345",
        },
        {
            "text": "Fixed by restarting connection pool",
            "ts": "1705319700.123456",
            "user": "U12345",
        },
    ]

    incident = IncidentNormalizer.normalize_slack_thread(
        messages=sample_messages, channel="C12345", source=IncidentSource.SLACK
    )

    assert incident.external_id == "C12345_1705315800.123456"
    assert incident.source == IncidentSource.SLACK
    assert incident.severity == Severity.SEV1  # Inferred from "SEV1" in text
    assert "API is down" in incident.title
    assert len(incident.description) > 0
    assert incident.resolved_at is not None

    print("✓ Slack normalization test passed")


def test_slack_export_parser():
    """Test Slack export JSON parsing."""
    # Test list format
    export_list = [
        {"text": "Message 1", "ts": "1234567890.123456"},
        {"text": "Message 2", "ts": "1234567891.123456"},
    ]

    messages = SlackClient.parse_export(export_list)
    assert len(messages) == 2

    # Test dict format
    export_dict = {
        "messages": [
            {"text": "Message 1", "ts": "1234567890.123456"},
        ]
    }

    messages = SlackClient.parse_export(export_dict)
    assert len(messages) == 1

    # Test JSON string
    export_json = json.dumps(export_list)
    messages = SlackClient.parse_export(export_json)
    assert len(messages) == 2

    print("✓ Slack export parser test passed")


def test_slack_export_ingest_inline_json_tracks_updates():
    """Inline Slack export JSON ingestion should work and track upserts correctly."""
    client = TestClient(app)
    headers = login_admin(client)

    # Start from a clean state for deterministic counter assertions.
    client.delete("/incidents", headers=headers)

    messages = [
        {
            "text": "SEV2: API degraded",
            "ts": "1705315800.123456",
            "user": "U12345",
        }
    ]
    payload = {
        "json_content": json.dumps(messages),
        "channel_name": "incidents",
    }

    first = client.post("/ingest/slack-export", json=payload, headers=headers)
    assert first.status_code == 200
    first_data = first.json()
    assert first_data["incidents_ingested"] == 1
    assert first_data["incidents_updated"] == 0
    assert first_data["errors"] == []

    second = client.post("/ingest/slack-export", json=payload, headers=headers)
    assert second.status_code == 200
    second_data = second.json()
    assert second_data["incidents_ingested"] == 0
    assert second_data["incidents_updated"] == 1
    assert second_data["errors"] == []

    # Clean up shared DB state.
    client.delete("/incidents", headers=headers)


def test_slack_export_file_path_stays_under_import_dir(monkeypatch, tmp_path: Path):
    """File-path ingestion should resolve only relative paths below the import root."""
    export_dir = tmp_path / "imports"
    nested_dir = export_dir / "nested"
    nested_dir.mkdir(parents=True)
    export_file = nested_dir / "incident.json"
    export_file.write_text("[]", encoding="utf-8")
    monkeypatch.setattr(settings, "slack_export_dir", export_dir)

    assert _resolve_safe_export_path("nested/incident.json") == export_file.resolve()

    with pytest.raises(ValueError, match="relative path"):
        _resolve_safe_export_path("../incident.json")

    with pytest.raises(ValueError, match="relative path"):
        _resolve_safe_export_path(str(export_file))

    with pytest.raises(ValueError, match=r"\.json"):
        _resolve_safe_export_path("nested/incident.txt")


def test_health_check_hides_dependency_exception_details(monkeypatch):
    """Health output should not expose stack trace details to callers."""

    def fail_connection():
        raise RuntimeError("database password leaked in exception")

    class FailingOllamaClient:
        async def is_available(self) -> bool:
            raise RuntimeError("ollama token leaked in exception")

        async def close(self) -> None:
            return None

    monkeypatch.setattr(health_router.db, "get_connection", fail_connection)
    monkeypatch.setattr(health_router, "OllamaClient", FailingOllamaClient)

    payload = asyncio.run(health_router.health_check())

    assert payload == {
        "status": "ok",
        "database": "error",
        "ollama": "error",
    }


@pytest.mark.asyncio
async def test_jira_client_mock():
    """Test JiraClient initialization (without real API call)."""
    client = JiraClient(
        url="https://example.atlassian.net",
        email="test@example.com",
        api_token="fake-token",
    )

    assert client.url == "https://example.atlassian.net"
    assert client.email == "test@example.com"
    assert client.api_token == "fake-token"

    print("✓ Jira client initialization test passed")


@pytest.mark.asyncio
async def test_slack_client_mock():
    """Test SlackClient initialization (without real API call)."""
    client = SlackClient(bot_token="xoxb-fake-token")

    assert client.bot_token == "xoxb-fake-token"
    assert client.base_url == "https://slack.com/api"

    print("✓ Slack client initialization test passed")


def main():
    """Run all tests."""
    print("Running Phase 1 tests...\n")

    # Synchronous tests
    test_normalizer_jira()
    test_normalizer_slack()
    test_slack_export_parser()

    # Async tests
    asyncio.run(test_jira_client_mock())
    asyncio.run(test_slack_client_mock())

    print("\n✓ All Phase 1 tests passed!")


if __name__ == "__main__":
    main()
