# compliance-service (Deprecated)

**Status: Deprecated.** This container is excluded from the active container list (see documentation/CURRENT_STATE.md, Plan Phase 3.1).

## Reason

- The directory contains only services and types (ComplianceCheckerService, ComplianceCheckService, CompliancePolicyService); there is no HTTP server, no routes, and no config/default.yaml in the standard runnable shape.
- Compliance needs are covered elsewhere:
  - **logging** – Audit trail, tamper-evident logs, retention.
  - **secret-management** – e.g. `/api/secrets/compliance/report`.
  - **security-service** – compliance_check and security findings.

## Contents

- `src/services/` – Compliance check and policy services (logic only).
- `src/types/` – Compliance-related types.
- `src/config/` – Config loader (expects a config file that may not be present in minimal layout).

Do not add new features here. For new compliance behavior, extend logging, secret-management, or security-service as appropriate.
