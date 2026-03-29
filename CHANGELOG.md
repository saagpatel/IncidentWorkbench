# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-13

### Added
- Backend ShipOS guardrails enforcement
- Lean dev mode and cleanup workflows
- Safe cleanup workflow for generated artifacts

### Fixed
- All critical code review findings
- Release: hardened audit risks and added CI gates
- Release: hardened local readiness path
- Security: removed hardcoded bootstrap credentials
- CI: resolved gitleaks blockers and improved scan diagnostics
- CI: resolved dependency and secret scan blockers
- Backend: closed security review blockers

### Changed
- Refreshed product story and onboarding in README
- Updated README with production-ready status and comprehensive documentation
- Removed legacy phase docs and streamlined guides
- Bootstrapped tests and docs defaults
