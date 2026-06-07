# One-Pager Outline

## Product Summary

Incident Workbench is a local-first desktop app for turning incident history into review-ready operational narratives. It imports incidents from local fixtures or source systems, groups related failures, surfaces metrics, and generates DOCX quarterly review reports.

## Audience

- Engineering manager preparing incident review materials.
- SRE or support lead looking for recurring operational patterns.
- Reviewer evaluating local-first desktop product quality across Tauri, React, FastAPI, SQLite, and Stronghold.

## Key Value

- Centralizes incident import, triage, clustering, metrics, and report generation in one desktop app.
- Keeps operational data local by default.
- Uses Stronghold for credential storage and a bundled sidecar for backend workflows.
- Supports fixture-driven demos and tests so public materials can avoid sensitive production data.

## Proof Points

- Tauri 2 shell with scoped sidecar spawn capability.
- React + TypeScript frontend with Vite.
- Python FastAPI sidecar for ingestion, clustering, reporting, auth, and observability.
- SQLite backend with migrations and safety rehearsal.
- Canonical verifier covers backend quality gates plus Rust/Tauri format, clippy, and tests.

## Current Demo Limits

- Live Jira, Slack, Statuspage, and Zendesk ingestion should not be shown in public demos without sanitized accounts.
- Local Ollama availability can affect clustering output and should have a fallback story.
- DOCX output should be reviewed manually before external use.
- Screenshots and deck artifacts still need a dedicated capture/render pass.
