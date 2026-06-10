# Backend Reliability Contract (Codex)

<!-- comm-contract:start -->

## Communication Contract

- Inherit global Codex communication and reporting rules from `/Users/d/.codex/AGENTS.override.md` and `/Users/d/.codex/policies/communication/BigPictureReportingV1.md`.
- Repo-specific instructions below add project constraints only; do not restate global voice or status-reporting rules here.
<!-- comm-contract:end -->

## Scope

Applies to backend changes in `/backend`: API, auth, DB schema/migrations, background jobs, external integrations, observability, and security.

## Mandatory sequence

1. Run a spec pressure test (security + data + contract + failure modes).
2. Implement the minimal safe change.
3. Run the read-only reviewer agent and collect findings.
4. Run the fixer agent on accepted findings (highest severity first).
5. Re-run reviewer + required gates in `.codex/verify.commands`.

## Blocking conditions

- Any failing required gate blocks completion.
- Any open critical/high review finding blocks completion.
- Any migration that skips expand/contract safety checks on live tables blocks completion.

## No-silent-risk policy

If verification cannot run, completion is blocked unless a temporary waiver includes owner, mitigation issue, and expiry <= 7 days.

## Worktree policy

Use a dedicated worktree for any change touching auth, migrations, queue/webhook logic, or more than 3 backend files.

## Inherited Operating Rules

- Inherit global git, review/fix, testing, docs, UI, security, skill-use, and reporting gates from `/Users/d/.codex/AGENTS.md` and active session instructions.
- Use `.codex/verify.commands` and `.codex/scripts/run_verify_commands.sh` as this repo-local verification authority when present.
- API/command surface changes must update generated contract artifacts and request/response examples.

<!-- portfolio-context:start -->

# Portfolio Context

## What This Project Is

IncidentWorkbench is a local-first desktop app for turning Jira or Slack incident history into review-ready retrospectives. It groups related failures with a local Ollama workflow, summarizes recurring patterns, and generates quarterly DOCX reports without sending operational data to cloud inference.

## Current State

The repo is active product work. The README defines the desktop app, Python sidecar, local clustering flow, report generation, and Stronghold credential posture. Current uncommitted files are unrelated PR-template and lockfile work, so context recovery should remain documentation-only.

## Stack

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

## How To Run

- Install JavaScript dependencies with `pnpm install`.
- Install backend dependencies with `pip install -r backend/requirements.txt`.
- Run the development app with `pnpm dev`.
- Run the repo's required lint, typecheck, test, coverage, diff coverage, and docs gates before shipping behavior changes.

## Known Risks

- Incident data and credentials are sensitive; keep the workflow local-first.
- Credentials must stay in Tauri Stronghold rather than plaintext files.
- Do not replace local Ollama clustering with cloud inference without an explicit privacy and architecture decision.
- Keep auth, migration, queue, webhook, and secret-storage work in dedicated worktrees.

## Next Recommended Move

Resolve the existing PR-template and lockfile drift separately, then use the README workflow and required gates before changing ingestion, clustering, credential, or report behavior.

<!-- portfolio-context:end -->
