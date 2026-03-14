# Incident Workbench

Incident Workbench is a Tauri desktop app for local IT incident review workflows. It pulls incidents from Jira or Slack, clusters similar incidents with local Ollama models, calculates operational metrics, and generates DOCX review reports without sending data to a cloud service.

## Current Status

This repo is locally launchable and packageable on the verified path below, but it should not be described as production-ready by default. The honest status today is:

- Local development path verified on macOS
- Auth-enabled flow working with a bootstrap admin account
- Slack-export smoke path verified end to end
- Desktop package build verified
- Release confidence depends on repo-defined gates, not on stale docs

## Product Scope

- React 19 + TypeScript frontend
- FastAPI backend with SQLite + migrations
- Tauri v2 desktop shell with Stronghold credential vault
- Ollama-based embeddings and text generation
- DOCX report generation with metrics and cluster summaries

## Prerequisites

- Node.js 20+ with `npm`
- Python 3.12+ with `venv`
- Rust toolchain for Tauri
- Ollama with both required models:

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

## First-Time Setup

Install dependencies exactly on the layout the repo expects:

```bash
npm ci

cd backend
python3 -m venv .venv
./.venv/bin/pip install -e ".[dev]"
cd ..
```

Then run the repo verifier:

```bash
bash scripts/verify-installation.sh
```

## Local Development

Set local-only bootstrap admin credentials before launch:

```bash
export WORKBENCH_BOOTSTRAP_ADMIN_USERNAME=local-admin
export WORKBENCH_BOOTSTRAP_ADMIN_PASSWORD='choose-a-strong-local-password'
```

Start the app:

```bash
bash scripts/dev.sh
```

What `scripts/dev.sh` now does:

- Starts the FastAPI backend from `backend/.venv`
- Auto-builds the Tauri sidecar if it is missing
- Starts Tauri dev mode against the running backend
- Picks a free frontend port if the default is already in use

If you want lower persistent disk growth in the repo:

```bash
npm run dev:lean
```

## Login And Smoke Path

The verified local smoke path is:

1. Launch the app with `bash scripts/dev.sh`.
2. Unlock the Stronghold vault with a new passphrase.
3. Sign in with the bootstrap admin credentials you exported.
4. Open the Incidents page.
5. Import the fixture from [`tests/fixtures/slack-export-smoke.json`](tests/fixtures/slack-export-smoke.json).
6. Run clustering.
7. Open Dashboard and Reports.
8. Generate and download a DOCX report.

Smoke evidence currently verified from this repo:

- Health endpoints returned ready
- Bootstrap admin login succeeded
- Slack-export fixture ingested successfully
- Metrics endpoint returned populated data
- Clustering completed with Ollama
- DOCX report generation and download succeeded
- `npm run tauri build` completed successfully

## Verification Commands

The repo-defined verification stack is:

```bash
npm run test
npm run build
bash scripts/verify-installation.sh
bash .codex/scripts/run_verify_commands.sh
bash scripts/build-sidecar.sh
bash scripts/audit-rust.sh
npm run tauri build
```

Note: `.codex/verify.commands` is the source of truth for backend gates. If docs disagree with it, trust the repo-defined gate.

## Troubleshooting

### Tauri build says the sidecar binary is missing

Run:

```bash
bash scripts/build-sidecar.sh
```

`scripts/dev.sh` now does this automatically when needed.

### Auth works in the backend but the UI is signed out

Make sure you exported:

```bash
export WORKBENCH_BOOTSTRAP_ADMIN_USERNAME=local-admin
export WORKBENCH_BOOTSTRAP_ADMIN_PASSWORD='choose-a-strong-local-password'
```

The frontend now expects the backend session and CSRF flow to be enabled.

### Clustering fails

Check Ollama first:

```bash
curl http://127.0.0.1:11434/api/tags
```

You should see both `nomic-embed-text` and `llama3.2`.

## Packaging

Build the desktop app:

```bash
bash scripts/build-sidecar.sh
npm run tauri build
```

Current verified bundle output:

- `src-tauri/target/release/bundle/macos/Incident Workbench.app`
- `src-tauri/target/release/bundle/dmg/Incident Workbench_0.1.0_aarch64.dmg`

## Project Layout

```text
src/                    React frontend
backend/                FastAPI backend
src-tauri/              Tauri shell and bundled sidecar config
scripts/                Dev, build, and verification scripts
tests/fixtures/         Deterministic smoke inputs
.codex/verify.commands  Required backend verification commands
```
