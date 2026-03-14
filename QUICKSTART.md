# Incident Workbench Quickstart

This quickstart is for the verified local path in this repo. It assumes you want the shortest route to a working desktop app, not a production deployment.

## 1. Install Dependencies

```bash
npm ci

cd backend
python3 -m venv .venv
./.venv/bin/pip install -e ".[dev]"
cd ..
```

## 2. Install Ollama Models

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

## 3. Verify The Machine

```bash
bash scripts/verify-installation.sh
```

## 4. Export A Local Admin Account

```bash
export WORKBENCH_BOOTSTRAP_ADMIN_USERNAME=local-admin
export WORKBENCH_BOOTSTRAP_ADMIN_PASSWORD='choose-a-strong-local-password'
```

These credentials are for local development only.

## 5. Launch The App

```bash
bash scripts/dev.sh
```

What to expect:

- FastAPI starts from `backend/.venv`
- Tauri starts the desktop shell
- The script auto-builds the sidecar if it is missing

## 6. First Run In The UI

1. Unlock the Stronghold vault with a passphrase.
2. Sign in with the bootstrap admin credentials you exported.
3. Open **Incidents**.
4. Paste the contents of [`tests/fixtures/slack-export-smoke.json`](tests/fixtures/slack-export-smoke.json) into **Import Slack Export**.
5. Use channel name `incidents-smoke`.
6. Import the data.
7. Open **Clusters** and run clustering.
8. Open **Reports** and generate a DOCX report.

## 7. Verified Expected Result

On the current verified path:

- The app launches in Tauri dev mode
- Admin login succeeds
- The smoke fixture imports successfully
- Incident metrics populate
- Clustering completes
- A DOCX report is generated under `~/.incident-workbench/reports/`

## Troubleshooting

### The app says the backend is unavailable

Run:

```bash
curl http://127.0.0.1:8765/health/ready
```

You should get `{"status":"ready"}`.

### The app says clustering failed

Run:

```bash
curl http://127.0.0.1:11434/api/tags
```

Both required Ollama models must be present.

### Tauri says the sidecar is missing

Run:

```bash
bash scripts/build-sidecar.sh
```

`scripts/dev.sh` should now do this automatically if needed.
