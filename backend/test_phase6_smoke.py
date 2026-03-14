"""Phase 6 smoke test: deterministic end-to-end incident review flow."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from database import db
from main import app
from services.ollama_client import OllamaClient
from test_helpers import login_admin

pytestmark = pytest.mark.integration

client = TestClient(app)
FIXTURE_PATH = (
    Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "slack-export-smoke.json"
)
TINY_PNG = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zxg0AAAAASUVORK5CYII="
)


def _reset_generated_state() -> None:
    """Remove reports, clusters, embeddings, and incidents for an isolated smoke run."""
    conn = db.get_connection()
    try:
        conn.execute("DELETE FROM reports")
        conn.execute("DELETE FROM cluster_members")
        conn.execute("DELETE FROM clusters")
        conn.execute("DELETE FROM cluster_runs")
        conn.execute("DELETE FROM embeddings")
        conn.execute("DELETE FROM incidents")
        conn.commit()
    finally:
        conn.close()


def _embedding_for_index(index: int) -> list[float]:
    """Return a deterministic embedding vector with clear cluster separation."""
    if index < 2:
        return [1.0, 0.0, 0.0, float(index) * 0.01]
    if index < 4:
        return [0.0, 1.0, 0.0, float(index) * 0.01]
    return [0.0, 0.0, 1.0, float(index) * 0.01]


@pytest.fixture(autouse=True)
def clean_state():
    _reset_generated_state()
    yield
    _reset_generated_state()


def test_slack_export_review_smoke(monkeypatch):
    """Import incidents, cluster them, and generate a DOCX report on the real app routes."""
    fixture_json = FIXTURE_PATH.read_text(encoding="utf-8")
    headers = login_admin(client)

    async def mock_is_available(self) -> bool:
        del self
        return True

    async def mock_embed_batch(
        self, texts: list[str], model: str = "nomic-embed-text"
    ) -> list[list[float]]:
        del self, model
        return [_embedding_for_index(index) for index, _text in enumerate(texts)]

    async def mock_generate(
        self,
        prompt: str,
        model: str = "llama3.2",
        format_schema: dict | None = None,
    ) -> str:
        del self, model
        if format_schema:
            if "vpn" in prompt.lower():
                return (
                    '{"name": "Remote Access Issues", '
                    '"summary": "VPN and remote connectivity incidents grouped together."}'
                )
            if "database" in prompt.lower() or "api" in prompt.lower():
                return (
                    '{"name": "Platform Reliability Issues", '
                    '"summary": "API and database degradation incidents grouped together."}'
                )
            return (
                '{"name": "Operational Noise Events", '
                '"summary": "Alerts and lower-severity support incidents grouped together."}'
            )

        return (
            "Q1 2026 summary: incident volume stayed manageable, clustering highlighted recurring "
            "remote access and platform reliability issues, and the main recommendation is to "
            "reduce repeated operational toil."
        )

    monkeypatch.setattr(OllamaClient, "is_available", mock_is_available)
    monkeypatch.setattr(OllamaClient, "embed_batch", mock_embed_batch)
    monkeypatch.setattr(OllamaClient, "generate", mock_generate)

    ingest = client.post(
        "/ingest/slack-export",
        json={"json_content": fixture_json, "channel_name": "incidents-smoke"},
        headers=headers,
    )
    assert ingest.status_code == 200, ingest.text
    assert ingest.json()["incidents_ingested"] == 5
    assert ingest.json()["errors"] == []

    incidents = client.get("/incidents")
    assert incidents.status_code == 200, incidents.text
    incidents_payload = incidents.json()
    assert incidents_payload["total"] == 5
    assert len(incidents_payload["incidents"]) == 5

    metrics = client.get("/incidents/metrics")
    assert metrics.status_code == 200, metrics.text
    metrics_payload = metrics.json()
    assert metrics_payload["total_incidents"] == 5
    assert metrics_payload["sev1_count"] == 1
    assert metrics_payload["sev2_count"] == 2

    clustering = client.post("/clusters/run", json={"n_clusters": 3}, headers=headers)
    assert clustering.status_code == 200, clustering.text
    run = clustering.json()["run"]
    assert run["n_clusters"] == 3
    assert len(run["clusters"]) == 3
    assert all(cluster["summary"] for cluster in run["clusters"])

    report = client.post(
        "/reports/generate",
        json={
            "cluster_run_id": run["run_id"],
            "title": "Smoke Test Report",
            "quarter_label": "Q1 2026",
            "chart_pngs": {"severity_breakdown": TINY_PNG},
        },
        headers=headers,
    )
    assert report.status_code == 200, report.text
    report_payload = report.json()
    assert report_payload["report_id"]
    assert report_payload["docx_path"].endswith(".docx")

    reports = client.get("/reports")
    assert reports.status_code == 200, reports.text
    generated_report = next(
        report_item
        for report_item in reports.json()
        if report_item["report_id"] == report_payload["report_id"]
    )
    assert generated_report["title"] == "Smoke Test Report"
    assert "incident volume stayed manageable" in generated_report["executive_summary"]

    download = client.get(f"/reports/{report_payload['report_id']}/download")
    assert download.status_code == 200, download.text
    assert (
        download.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    assert len(download.content) > 0


def test_slack_export_invalid_json_returns_parse_error():
    """Invalid Slack export JSON should return a clean parse error instead of crashing."""
    headers = login_admin(client)

    response = client.post(
        "/ingest/slack-export",
        json={"json_content": "{bad json", "channel_name": "incidents-smoke"},
        headers=headers,
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["incidents_ingested"] == 0
    assert payload["incidents_updated"] == 0
    assert payload["errors"] == ["Parse error: Invalid JSON format in export."]
