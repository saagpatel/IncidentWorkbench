# Backend Reliability Contract (Codex)

<!-- comm-contract:start -->

## Communication Contract (Global)

- Follow `/Users/d/.codex/policies/communication/BigPictureReportingV1.md` for all user-facing updates.
- Use exact section labels from `BigPictureReportingV1.md` for formal delivery, blocker, waiting, risk, decision, or explicit status/report requests.
- Keep ordinary in-flight updates conversational, warm, PM-readable, operator-grade, and low-noise.
- Keep technical details in internal artifacts unless explicitly requested by the user or required by failure, risk, or verification.
- Honor toggles literally: `simple mode`, `show receipts`, `tech mode`, `debug mode`.
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

## Definition of Done: Tests + Docs (Blocking)

- Any production code change must include meaningful test updates in the same PR.
- Meaningful tests must include at least:
  - one primary behavior assertion
  - two non-happy-path assertions (edge, boundary, invalid input, or failure mode)
- Trivial assertions are forbidden (`expect(true).toBe(true)`, snapshot-only without semantic assertions, render-only smoke tests without behavior checks).
- Mock only external boundaries (network, clock, randomness, third-party SDKs). Do not mock the unit under test.
- UI changes must cover state matrix: loading, empty, error, success, disabled, focus-visible.
- API/command surface changes must update generated contract artifacts and request/response examples.
- Architecture-impacting changes must include an ADR in `/docs/adr/`.
- Required checks are blocking when `fail` or `not-run`: lint, typecheck, tests, coverage, diff coverage, docs check.
- Reviewer -> fixer -> reviewer loop is required before merge.

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
