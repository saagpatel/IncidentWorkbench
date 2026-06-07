# Incident Workbench Demo Plan

## Purpose

Use this plan for local, sanitized demos of Incident Workbench. The demo should show incident ingestion, clustering, metrics, and report generation without exposing real customer incidents, Slack messages, Jira tickets, credentials, or operational timelines.

## Demo Safety Rules

- Use synthetic incidents or a sanitized Slack export fixture.
- Do not connect real Jira, Slack, Statuspage, or Zendesk accounts during a public demo.
- Do not show Stronghold prompts, `.env` files, API tokens, session cookies, or local private paths.
- Keep local Ollama output deterministic enough for rehearsal; use prepared sample summaries when live model output is not stable.
- Treat screenshots in `docs/screenshots/` as UI evidence, not proof that external integrations were exercised.

## Baseline Scenario

1. Launch the desktop app with the local FastAPI sidecar.
2. Sign in with local demo credentials.
3. Ingest a sanitized Slack export or fixture incident batch.
4. Review the incident list and severity/status filters.
5. Open metrics to show volume, severity mix, and recurring patterns.
6. Run clustering against local data and review grouped incidents.
7. Generate a quarterly review report from sanitized incidents.
8. Open settings and show credential status without revealing secrets.
9. Review health/readiness surfaces and note which external integrations are mocked or not connected.

## Evidence To Capture

- Login and safe local session state.
- Ingest flow using sanitized fixture data.
- Incident list with filters and local-only records.
- Metrics dashboard with fixture counts.
- Cluster review with explainable grouped incidents.
- Report-generation flow and completed report state.
- Settings credential status without secret values.
- Health/readiness view for backend and local dependencies.

## Verification Notes

Before using this demo externally, run:

```bash
pnpm run build
cargo test --manifest-path src-tauri/Cargo.toml
cd backend && ./.venv/bin/pytest -q -m "unit"
```

Record what was not verified, especially live third-party ingestion, real credential storage, local Ollama availability, and DOCX rendering fidelity.
