# Tauri Capabilities

Capability review marker: `local-first-tauri-capability-reviewed`

This note records why Incident Workbench needs each non-core Tauri permission. Keep it updated whenever `src-tauri/capabilities/default.json` changes.

## Permission Rationale

| Permission           | Why it is present                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `stronghold:default` | Stores Jira, Slack, Statuspage, Zendesk, and local admin credentials in the encrypted desktop vault.        |
| `shell:allow-spawn`  | Starts the bundled `incident-workbench-api` FastAPI sidecar from the Rust shell during packaged app launch. |

## Sidecar Scope

The only shell command scope is the bundled sidecar `binaries/incident-workbench-api`. The allowed arguments are limited to:

- `--port`
- a numeric port value matching `[0-9]{2,5}`

The desktop shell constructs this command in Rust at startup. The frontend does not need general shell execution, arbitrary sidecar arguments, or `shell:allow-execute`.

## Review Rules

- Do not add `args: true` to shell permissions.
- Do not add `shell:allow-execute` unless a concrete feature needs synchronous command execution and has tests.
- Do not add filesystem, process, updater, notification, shortcut, clipboard, dialog, or broader shell permissions without adding a row to this document.
- Re-run the local-first Tauri drift scanner after any capability change.
