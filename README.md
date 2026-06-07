# IncidentWorkbench

[![TypeScript](https://img.shields.io/badge/TypeScript-%233178c6?style=flat-square&logo=typescript)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#) [![Platform](https://img.shields.io/badge/platform-macOS-lightgrey?style=flat-square)](#)

> Turn messy incident history into a review-ready story — without opening ten tabs or copy-pasting a single screenshot.

Incident Workbench is a local-first desktop app for incident retrospectives. It pulls incident records from Jira, Slack, Statuspage, or Zendesk, groups related failures using a local LLM, surfaces the recurring patterns, and generates polished DOCX quarterly review reports — without shipping your operational data to a cloud service.

## Features

- **Multi-Source Ingestion** — Import incidents from Jira, pull from Slack, Statuspage, or Zendesk, or paste a Slack export JSON for deterministic offline testing
- **LLM-Assisted Clustering** — Group related incidents by theme using local Ollama models; no cloud API keys required
- **DOCX Report Generation** — One-click quarterly review reports with charts and executive summaries, ready for leadership
- **Metrics Dashboard** — Severity mix, volume trends, and frequency charts to contextualize the incident landscape before writing a word
- **Stronghold Vault** — Credentials stored in Tauri's Stronghold encrypted vault; nothing sensitive hits disk in plaintext
- **Paste-and-Inspect Workflow** — Drop a raw Slack export JSON directly into the app for fast local iteration without live credentials

## Quick Start

### Prerequisites

- Node.js 22.13+
- pnpm 11.5.2 via Corepack
- Rust toolchain (stable) + Tauri v2 prerequisites for macOS
- Python 3.12+ (for the FastAPI backend sidecar)
- [Ollama](https://ollama.ai) (optional, for AI clustering)

### Installation

```bash
git clone https://github.com/saagpatel/IncidentWorkbench.git
cd IncidentWorkbench
pnpm install
cp .env.example .env
# Install Python backend dependencies (uses pyproject.toml, not requirements.txt)
cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]" && cd ..
```

### Run (development)

```bash
bash scripts/dev.sh
```

> `pnpm dev` runs only the Vite frontend server. `bash scripts/dev.sh` starts the Python sidecar and the full Tauri desktop shell together.

## Tech Stack

| Layer           | Technology                |
| --------------- | ------------------------- |
| Desktop shell   | Tauri 2 + Rust            |
| Frontend        | React + TypeScript + Vite |
| Backend sidecar | Python + FastAPI          |
| AI clustering   | Ollama (local LLM)        |
| Storage         | SQLite                    |
| Charts          | Recharts                  |
| State           | TanStack Query            |
| Credentials     | Tauri Stronghold          |

## Architecture

IncidentWorkbench is a Tauri 2 desktop app with a Python FastAPI sidecar that handles data ingestion, LLM orchestration, and DOCX generation. The frontend is a React SPA that communicates with both the Rust Tauri layer (credentials, native OS integration) and the Python backend (incident logic). Jira, Slack, Statuspage, and Zendesk are treated as source systems; imported incident records stay local. Ollama runs locally on the same machine and is accessed via HTTP from the sidecar — no cloud inference endpoint is required.

## License

MIT
