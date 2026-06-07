# Demo Deck Outline

## Purpose

Use this outline to build a short demo deck after the screenshot capture pass. The deck should support a live walkthrough, not replace it.

## Suggested Slides

1. **Problem**: Incident review work is scattered across tickets, chats, status pages, metrics, and hand-written summaries.
2. **Product**: Incident Workbench turns local incident history into clustered insights and report-ready narratives.
3. **Local-First Architecture**: Tauri desktop shell, React UI, FastAPI sidecar, SQLite storage, Stronghold credentials, and optional local Ollama.
4. **Ingest Workflow**: Fixture import plus Jira, Slack, Statuspage, and Zendesk connectors.
5. **Review Workflow**: Incident list, filters, detail view, severity mix, and trend metrics.
6. **Clustering Workflow**: Related incidents grouped into recurring operational themes.
7. **Report Workflow**: Quarterly review report generation with charts and executive summary.
8. **Security Posture**: Local storage, Stronghold credentials, scoped sidecar spawn, sanitized demo rules, and no public demo secrets.
9. **Verification**: Backend tests, migration rehearsal, OpenAPI linting, security scans, and Rust/Tauri gates.
10. **Next Steps**: Screenshot capture, one-pager rendering, deck build, and live integration evidence refresh.

## Rehearsal Notes

- Keep the live demo on sanitized fixtures or synthetic incidents.
- State which integrations are mocked, fixture-backed, or live before each demo section.
- Do not open real workspaces, real tickets, Stronghold secrets, `.env` files, or private report exports.
- Keep a fallback path: screenshots can carry the story if Ollama, a source-system connector, or DOCX generation is unavailable.
