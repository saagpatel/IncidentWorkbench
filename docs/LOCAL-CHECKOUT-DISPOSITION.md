# IncidentWorkbench — Local Checkout Disposition

There are two on-disk copies of this repo on the operator's machine.
**Only `/Users/d/Projects/IncidentWorkbench` is canonical.** The other
copy at `/Users/d/Projects/ITPRJsViaClaude/IncidentWorkbench` is a
leftover from the `saagar210` → `saagpatel` GitHub account migration
and should be removed.

> **Audience:** anyone deciding which path to `cd` into, or wondering
> why `find ~/Projects -name IncidentWorkbench` returns two results.

---

## The two checkouts

| Path                                                  | Branch                           | Remote(s)                                                                             | Status                                                                                  |
| ----------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `/Users/d/Projects/IncidentWorkbench`                 | `main`                           | `origin → saagpatel/IncidentWorkbench`                                                | **Canonical** — work here.                                                              |
| `/Users/d/Projects/ITPRJsViaClaude/IncidentWorkbench` | `codex/chore/bootstrap-codex-os` | `origin → saagpatel/IncidentWorkbench`, `legacy-origin → saagar210/IncidentWorkbench` | Stale — pre-migration clone with a `legacy-origin` remote pointing at a frozen account. |

Both copies point `origin` at the same GitHub repository
(`saagpatel/IncidentWorkbench`). They are not divergent forks. The
duplication is purely a filesystem-organization artifact from when
the project lived under the `saagar210` username and `ITPRJsViaClaude/`
was the active portfolio bucket.

---

## Why the duplicate exists

When the operator migrated from the `saagar210` GitHub account to
`saagpatel`, projects in `ITPRJsViaClaude/` (the IT-projects-via-Claude
bucket) kept their original on-disk clones. When the operator
re-cloned the repo from the new `saagpatel` remote, they put the new
clone in the top-level `~/Projects/` directory instead of replacing
the existing one in `ITPRJsViaClaude/`.

The result: two checkouts of the same upstream, one on a stale codex
bootstrap branch from 2026-03-22, one tracking `main`.

---

## Disposition

| Path                                                  | Recommended action                                   |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `/Users/d/Projects/IncidentWorkbench`                 | Keep. Make all future commits here.                  |
| `/Users/d/Projects/ITPRJsViaClaude/IncidentWorkbench` | Delete locally after confirming no uncommitted work. |

### Safe deletion procedure

Run these only after confirming the dup has no uncommitted work you
care about:

```bash
# 1. Confirm the dup is not divergent
cd /Users/d/Projects/ITPRJsViaClaude/IncidentWorkbench
git fetch origin
git status                   # should be clean or only show codex-os scaffolding edits
git log --oneline origin/main..codex/chore/bootstrap-codex-os | head -10
# ↑ shows commits ONLY on the local stale branch that are not on origin/main

# 2. Stash anything you want to preserve (probably nothing)
git stash push -u -m "pre-deletion stash of dup checkout"

# 3. Remove the dup directory
cd /Users/d/Projects/ITPRJsViaClaude
rm -rf IncidentWorkbench
```

After deletion, the operator's tooling that targets
`/Users/d/Projects/IncidentWorkbench` (the canonical path) is the
only checkout that matters.

---

## Why a doc instead of just deleting the dup

The dup deletion is operator-side filesystem work. This file is in the
canonical repo so the next portfolio scan finds the disposition signal
without having to re-derive it from the two paths. Three reasons:

1. **Portfolio scans don't see filesystem state** — they look at the
   GitHub repo. A note here means the dup question is answered the
   next time someone wonders.
2. **Anyone else who clones** (or another agent on a different machine)
   won't have the dup problem and shouldn't need this context — but
   if a future portfolio audit re-creates the dup pattern (e.g., by
   cloning into a new portfolio bucket), the disposition rule is
   already written down.
3. **The dup is operator-only to delete safely** — Claude Code should
   not autonomously `rm -rf` directories, especially ones it didn't
   create. Documenting the recommendation is the appropriate scope.

---

## What IncidentWorkbench actually is

(Context for anyone landing here without prior exposure.)

IncidentWorkbench is a local-first macOS desktop app for incident
retrospectives. It ingests incident records from Jira or Slack
(including paste-and-inspect raw Slack export JSON), groups related
incidents using a local Ollama LLM, and generates DOCX quarterly
review reports — without shipping operational data to any cloud
service. Tauri 2 + React TS frontend, FastAPI Python sidecar for the
ML grouping, Stronghold encrypted vault for credentials.

For full detail see `README.md`.

---

## Portfolio operating system instructions

| Aspect               | Posture                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| Canonical local path | `/Users/d/Projects/IncidentWorkbench`                                        |
| Dup local path       | `/Users/d/Projects/ITPRJsViaClaude/IncidentWorkbench` — safe to delete       |
| Portfolio status     | Treat as `Active` once dup is cleaned up; no other state change required     |
| Resurface conditions | Only if a third clone appears (would mean the migration cleanup didn't take) |

---

## Last known reference

| Field                            | Value                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Canonical remote                 | `https://github.com/saagpatel/IncidentWorkbench.git`                                                  |
| Frozen legacy remote             | `https://github.com/saagar210/IncidentWorkbench.git` (only referenced by the stale dup)               |
| Last meaningful commit on `main` | `60666d8` docs: update README with comprehensive project documentation                                |
| Stale dup last meaningful commit | `d7300e4` build(lockfile): sync incident workbench package lock (on `codex/chore/bootstrap-codex-os`) |
