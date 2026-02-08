# security-service (Stub)

**Status: Stub.** This container is retained for future completion but is not a runnable HTTP service in its current form (Plan Phase 3.1, documentation/CURRENT_STATE.md).

## Current state

- The directory contains services and types (SecurityScannerService, SecurityScanService) but no HTTP server, no registered routes, and no standard config/default.yaml for a runnable module.
- It is kept in the container list (port 3042) for dependency references (e.g. context-service, quality-monitoring). It is not started in the default stack until completed.

## Intended role

Security analysis: secret scanning, vulnerabilities, PII, obfuscation, SAST/DAST/SCA, compliance checks, findings. To complete per ModuleImplementationGuide: add server.ts, routes, config/default.yaml, README/CHANGELOG, and wire from gateway if needed.

## Contents

- `src/services/` – Security scan and scanner services (logic only).
- `src/types/` – Security-related types.
- `src/config/` – Config loader (expects a config file that may not be present in minimal layout).
