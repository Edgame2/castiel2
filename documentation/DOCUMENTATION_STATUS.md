# Documentation Status

## Overview

Documentation for the Castiel platform is organized under `documentation/`. The **containers** (microservices and UI) are the primary runtime units and are documented in detail under `documentation/containers/`.

## Current Structure

```
documentation/
├── README.md                           # Main index
├── DOCUMENTATION_STATUS.md             # This file
├── UI_CONTAINER_ARCHITECTURE.md        # UI-specific architecture
├── containers/                         # Container documentation (source of truth)
│   ├── README.md                       # Main file: all containers, categories, integration
│   ├── ai-service.md                   # Full-spec per container (~50 files)
│   ├── api-gateway.md
│   └── ...
├── global/                             # Architecture, CAIS, ModuleImplementationGuide, etc.
├── database/                           # Cosmos DB reference
├── guides/                             # Setup, docker, OAuth, admin, permissions
├── integrations/                       # e.g. secret-management usage
├── business/                           # Plan, progress, status, team
└── archive/                            # Historical summaries (consolidation, expansion, reorganization)
```

## Containers Documentation

- **Main index:** [documentation/containers/README.md](containers/README.md) – Integration overview, container list with ports, containers by category (purpose, dependencies, storage, events), summary diagram, and links to detailed docs.
- **Per-container:** One file per container (e.g. `containers/ai-service.md`) with:
  - Reference (purpose, config, env, API, events, dependencies, Cosmos containers)
  - Architecture (services, routes, data flow)
  - Deployment (port, health, scaling, docker-compose service name)
  - Security / tenant isolation
  - Links to container README, openapi.yaml, config

Container list and ports are derived from `docker-compose.yml` and the `containers/` directory. Removed or deprecated containers (e.g. cache-management, collaboration-intelligence, dashboard-analytics, compliance-service, migration-service) are not included.

## Referenced Document Names (canonical mapping)

Some documents are referenced in the codebase or review by short names. Use this mapping to find the actual file:

| Referenced name | Location / equivalent |
|-----------------|------------------------|
| **CAIS_ARCHITECTURE.md** | [documentation/global/Architecture.md](global/Architecture.md) – system and CAIS architecture |
| **ML_OPERATIONAL_STANDARDS.md** | Not yet a single doc; see [ModuleImplementationGuide.md](global/ModuleImplementationGuide.md) (config, security, testing) and [Architecture.md](global/Architecture.md) for operational patterns |
| **IMPLEMENTATION_STATUS_AND_PLAN.md** | [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) (repo root) – implementation status and plan references |
| **COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY.md** | Referenced in layer/plan comments (e.g. ml-service Layer 2, risk-analytics Layer 6); detailed layer requirements are described in plan docs under `.cursor/plans/` and in container CHANGELOGs |

## Other Documentation

- **global/** – Architecture, CAIS overview, DataFlow, Deployment, ModuleImplementationGuide, ModuleOverview, TechnologyStack, etc.
- **guides/** – setup-guide, docker-setup, getting-started, google-oauth-setup, admin-guide, permission-matrix.
- **database/** – COSMOS_DB_CONTAINERS_REFERENCE.md.

## Maintenance

Update documentation when:

- New containers are added (add to `containers/README.md` and create `containers/<name>.md`)
- Container purpose, config, or integration changes
- API endpoints or events change (update per-container doc and openapi/logs-events as needed)
