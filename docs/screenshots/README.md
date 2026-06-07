# Screenshot Capture Plan

## Purpose

This folder tracks screenshots needed for portfolio review, release notes, and demo rehearsal. Captures must use sanitized fixture data only.

## Capture Matrix

| File                       | Surface           | Caption                                                       |
| -------------------------- | ----------------- | ------------------------------------------------------------- |
| `01-login.png`             | Login             | Local demo session without real account identifiers.          |
| `02-ingest.png`            | Ingest            | Sanitized Slack export or fixture incident import.            |
| `03-incident-list.png`     | Incident list     | Local incident records with severity and source filters.      |
| `04-incident-detail.png`   | Incident detail   | Timeline and metadata for a fictional incident.               |
| `05-metrics.png`           | Metrics dashboard | Volume, severity mix, and trends from fixture data.           |
| `06-clusters.png`          | Clustering        | Related incidents grouped by local analysis.                  |
| `07-report-generation.png` | Report generation | Quarterly report workflow before DOCX generation.             |
| `08-report-complete.png`   | Report complete   | Generated report state with safe title and fixture period.    |
| `09-settings.png`          | Settings          | Credential status without token, password, or account values. |
| `10-health-readiness.png`  | Health/readiness  | Backend and dependency status using local-safe labels.        |

## Capture Rules

- Use deterministic fixture records or synthetic incidents.
- Hide local filesystem paths unless they are intentionally generic.
- Do not show real Slack workspace names, Jira projects, Zendesk accounts, Statuspage IDs, tokens, cookies, or customer incident titles.
- Include a short caption beside each final screenshot in release or portfolio materials.
- Re-capture screenshots after visible UI, ingestion, clustering, metrics, report, or credential-flow changes.

## Current Status

No screenshots are committed yet. This plan is the source of truth for the first capture pass.
