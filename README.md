# Incident Workbench

Turn messy incident history into a review-ready story.

Incident Workbench is a local-first desktop app for incident review. It pulls incidents from Jira or Slack, groups related failures with local AI, surfaces the patterns behind the noise, and generates polished DOCX review reports without shipping your data to a cloud service.

If your current incident review process feels like "open ten tabs, copy screenshots, paste timelines, and hope nobody forgot the root theme," this app is trying to replace that with one focused workspace.

## Why it feels different

- **Local-first by default**: the app runs as a Tauri desktop app with a FastAPI backend, local SQLite storage, and local Ollama models.
- **Built for incident retrospectives**: it is not just a dashboard. It is designed to help you ingest incidents, cluster them, inspect patterns, and turn the result into a report.
- **Less copy-paste toil**: charts, summaries, and DOCX output are part of the workflow instead of separate afterthoughts.
- **Safer for sensitive operational data**: the verified path keeps incident data on your machine.

## What you can do

- Import incidents from **Jira**
- Pull incidents from **Slack**
- Paste a **Slack export JSON** directly into the app for deterministic local testing
- View incident metrics in a dashboard
- Run **LLM-assisted clustering** to group related incidents
- Generate **DOCX quarterly review reports** with charts and executive summaries
- Store credentials in a **Stronghold vault**

## The core workflow

Incident Workbench is built around a simple arc:

1. **Ingest** raw incident records from the tools your team already uses.
2. **Inspect** the incident list and metrics.
3. **Cluster** related failures to reveal recurring themes.
4. **Export** a report that leadership or postmortem stakeholders can actually read.

That means the app is not trying to be another alerting system. It is trying to make incident review faster, clearer, and much less tedious.

## Product tour

### Incidents

The Incidents screen is your intake desk. You can fetch from Jira, fetch from Slack, or import a Slack export directly. This is the fastest way to get real data into the app and start working.

### Dashboard

The Dashboard turns raw incident records into review-friendly metrics and charts so you can see severity mix, volume, and trend shape before you write a single summary sentence.

### Clusters

The Clusters view uses local Ollama-powered embeddings to group similar incidents. This is where the app starts becoming more than storage: it helps you spot repeating operational themes instead of reviewing incidents one by one.

### Reports

The Reports flow turns a cluster run plus exported charts into a DOCX report with an executive summary. This is the "stop making slides by hand" part of the app.

### Settings

The Settings screen holds Jira and Slack configuration and shows Ollama status so you can tell quickly whether the local AI path is ready.

## Reality check

This repo is much stronger than a prototype, but the honest status is still:

- the verified path is **local development on macOS**
- the app is **launchable and packageable**
- the auth-enabled desktop flow is working on the verified path
- the deterministic Slack-export smoke path is working end to end
- this should still be described as a **locally verified project**, not a polished production SaaS

In other words: this is real software you can run and use, but the right promise today is "usable local incident review workbench," not "finished enterprise platform."

## Quick start

### 1. Install prerequisites

You will need:

- Node.js 20+
- Python 3.12+
- Rust toolchain
- Ollama

Install the required local models:

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

### 2. Install repo dependencies

```bash
npm ci

cd backend
python3 -m venv .venv
./.venv/bin/pip install -e ".[dev]"
cd ..
```

### 3. Verify the machine

```bash
bash scripts/verify-installation.sh
```

### 4. Create a local admin account for development

```bash
export WORKBENCH_BOOTSTRAP_ADMIN_USERNAME=local-admin
export WORKBENCH_BOOTSTRAP_ADMIN_PASSWORD='choose-a-strong-local-password'
```

### 5. Launch the app

```bash
bash scripts/dev.sh
```

What this does:

- starts the FastAPI backend from `backend/.venv`
- auto-builds the Tauri sidecar if needed
- starts the Tauri desktop shell
- picks an open dev port when the default one is busy

If you want a leaner dev mode with lower local repo churn:

```bash
npm run dev:lean
```

## First-run walkthrough

If you want the shortest path to seeing the app work:

1. Launch with `bash scripts/dev.sh`
2. Unlock the Stronghold vault with a new passphrase
3. Sign in with the bootstrap admin credentials you exported
4. Open **Incidents**
5. Import the contents of `tests/fixtures/slack-export-smoke.json`
6. Use the channel name `incidents-smoke`
7. Run clustering
8. Open **Dashboard**
9. Open **Reports** and generate a DOCX report

## Verified working path

The current repo has been locally verified on this path:

- app launches in Tauri dev mode
- admin login succeeds
- Slack-export smoke fixture imports successfully
- metrics populate
- clustering completes with Ollama
- DOCX generation and download succeed
- `npm run tauri build` completes successfully

## Verification commands

These are the repo-defined verification commands currently used for the verified path:

```bash
npm run test
npm run build
bash scripts/verify-installation.sh
bash .codex/scripts/run_verify_commands.sh
bash scripts/build-sidecar.sh
bash scripts/audit-rust.sh
npm run tauri build
```

If docs and repo gates ever disagree, trust the repo-defined commands.

## Troubleshooting

### The app says the backend is unavailable

```bash
curl http://127.0.0.1:8765/health/ready
```

Expected result:

```json
{"status":"ready"}
```

### Clustering fails

Check that Ollama is running and both required models are installed:

```bash
curl http://127.0.0.1:11434/api/tags
```

### Tauri says the sidecar is missing

```bash
bash scripts/build-sidecar.sh
```

## Packaging

To build the desktop app:

```bash
bash scripts/build-sidecar.sh
npm run tauri build
```

Current verified macOS bundle outputs:

- `src-tauri/target/release/bundle/macos/Incident Workbench.app`
- `src-tauri/target/release/bundle/dmg/Incident Workbench_0.1.0_aarch64.dmg`

## Project layout

```text
src/                    React frontend
backend/                FastAPI backend
src-tauri/              Tauri shell and sidecar wiring
scripts/                dev, build, and verification scripts
tests/fixtures/         deterministic smoke inputs
.codex/verify.commands  backend verification source of truth
```

## Who this is for

Incident Workbench is especially interesting if you:

- run recurring incident reviews or quarterly ops reviews
- want local AI help without sending incident data off-machine
- are tired of building retrospective documents by hand
- want a desktop workflow that goes from raw incidents to leadership-ready output

If that sounds familiar, this repo is worth trying.
