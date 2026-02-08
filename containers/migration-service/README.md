# migration-service (Deprecated)

**Status: Deprecated.** This container is excluded from the active container list (see documentation/CURRENT_STATE.md, Plan Phase 3.1).

## Reason

- The directory contains only services and types (MigrationService, MigrationStepService); there is no HTTP server, no routes, and no config/default.yaml in the standard runnable shape.
- Migration logic and HTTP routes live in **configuration-service** (e.g. `/api/v1/migration/*`). Use that service for migration execution and steps.

## Contents

- `src/services/` – Migration and step services (logic only).
- `src/types/` – Fastify and migration types.
- `src/config/` – Config loader (expects a config file that may not be present in minimal layout).

Do not add new features here. For migration behavior, use configuration-service.
