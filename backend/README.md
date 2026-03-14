# Incident Workbench Backend

FastAPI backend for the Incident Workbench desktop application.

## What It Currently Does

- Session auth with cookie + CSRF protection
- Jira, Slack, and Slack-export incident ingestion
- Incident listing and metrics
- Ollama-backed embedding and clustering
- DOCX report generation and downloads
- SQLite migrations, idempotency, and basic observability

## Setup

```bash
cd backend
python3 -m venv .venv
./.venv/bin/pip install -e ".[dev]"
```

For local admin access, export bootstrap credentials before starting the backend:

```bash
export WORKBENCH_BOOTSTRAP_ADMIN_USERNAME=local-admin
export WORKBENCH_BOOTSTRAP_ADMIN_PASSWORD='choose-a-strong-local-password'
```

## Run Locally

Repo-preferred path:

```bash
cd ..
bash scripts/dev.sh
```

Backend-only path:

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8765 --reload
```

## Verification

Quick checks:

```bash
python test_phase0.py
python test_phase1.py
python test_phase2.py
python test_phase5.py
```

Full backend gate:

```bash
cd ..
bash .codex/scripts/run_verify_commands.sh
```

That gate runs the commands listed in [`.codex/verify.commands`](../.codex/verify.commands).

## Useful Endpoints

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- `POST /auth/login`
- `GET /auth/me`
- `POST /ingest/slack-export`
- `GET /incidents`
- `GET /incidents/metrics`
- `POST /clusters/run`
- `POST /reports/generate`

## Local Smoke Fixture

Use [`tests/fixtures/slack-export-smoke.json`](../tests/fixtures/slack-export-smoke.json) for deterministic local ingest and clustering checks.
