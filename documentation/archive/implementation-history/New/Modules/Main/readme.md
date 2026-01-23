
Tous les projets
Coder




Intelligent project planning with adaptive questioning
Dernier message il y a 37 minutes
Pages, components, and API endpoints inventory
Dernier message il y a 2 heures
Module improvement recommendations
Dernier message il y a 23 heures
Collaboration and organization module UI components
Dernier message il y a 23 heures
Github-style collaboration and organization structure
Dernier message il y a 1 jour
User management system with role-based access control
Dernier message il y a 3 jours
Unified agent system with quality validation scoring
Dernier message il y a 6 jours
High quality, consistency and autonomy recommendations
Dernier message il y a 6 jours
Project recommendations and additions
Dernier message il y a 6 jours
Integration system modular architecture design
Dernier message il y a 6 jours
IDE features for high-quality code generation
Dernier message il y a 6 jours
Instructions
Ajouter des instructions pour personnaliser les réponses de Claude.

Fichiers
7 % de la capacité du projet utilisée
Indexation.

README.md
69 lignes

md



PROJECT_DESCRIPTION.md
409 lignes

md



module-list.md
147 lignes

md



MODULE_INDEX.md
246 lignes

md



module-breakdown.md
786 lignes

md



collaboration-organization.md
1 180 lignes

md



44-utilities.md
360 lignes

md



43-validation.md
354 lignes

md



42-shared-types.md
442 lignes

md



41-middleware.md
590 lignes

md



40-services.md
479 lignes

md



39-database.md
537 lignes

md



38-api-server.md
501 lignes

md



35-workflows.md
331 lignes

md



34-compliance.md
366 lignes

md



33-pattern-library.md
323 lignes

md



32-capacity-planning.md
369 lignes

md



31-pair-programming.md
276 lignes

md



30-learning-resources.md
305 lignes

md



29-technical-debt.md
403 lignes

md



28-dependency-management.md
366 lignes

md



27-release-management.md
362 lignes

md



26-architecture-design.md
335 lignes

md



25-incident-management.md
398 lignes

md



24-code-reviews.md
346 lignes

md



23-knowledge-base.md
452 lignes

md



22-messaging.md
357 lignes

md



21-calendar-planning.md
423 lignes

md



20-environment-management.md
403 lignes

md



19-module-detection.md
367 lignes

md



18-roadmap-management.md
451 lignes

md



17-task-management.md
429 lignes

md



16-project-management.md
390 lignes

md



15-intent-anticipation.md
491 lignes

md



14-agents.md
552 lignes

md



13-model-integration.md
486 lignes

md



12-context-aggregation.md
464 lignes

md



11-execution.md
362 lignes

md



10-planning.md
349 lignes

md



09-command-palette.md
516 lignes

md



08-activity-bar-views.md
462 lignes

md



07-ui-components.md
643 lignes

md



06-file-management.md
321 lignes

md



05-monaco-editor.md
428 lignes

md



04-platform-services.md
479 lignes

md



03-build-configuration.md
430 lignes

md



02-ipc-communication.md
626 lignes

md



01-electron-main-process.md
417 lignes

md



README.md
3.05 Ko •69 lignes
•
Le formatage peut être différent de la source

# Modules Documentation

This directory contains documentation about the logical module structure of the Coder IDE project.

## Documents

- **[module-list.md](./module-list.md)** - Quick reference list of all modules
- **[module-breakdown.md](./module-breakdown.md)** - Detailed module descriptions and architecture
- **[PROJECT_DESCRIPTION.md](./PROJECT_DESCRIPTION.md)** - High-level project description
- **[MODULE_INDEX.md](./MODULE_INDEX.md)** - Complete index of all modules and documentation status
- **[collaboration-organization.md](./collaboration-organization.md)** - Comprehensive collaboration modules documentation

## Individual Module Documentation

Each module has its own detailed documentation file:

### Platform & Infrastructure
- [01-electron-main-process.md](./01-electron-main-process.md) - Electron main process
- [02-ipc-communication.md](./02-ipc-communication.md) - IPC communication
- [03-build-configuration.md](./03-build-configuration.md) - Build system
- [04-platform-services.md](./04-platform-services.md) - Platform services

### Editor & UI
- [05-monaco-editor.md](./05-monaco-editor.md) - Monaco editor integration
- [06-file-management.md](./06-file-management.md) - File management

### AI & Intelligence
- [10-planning.md](./10-planning.md) - AI planning system
- [11-execution.md](./11-execution.md) - Code execution engine

See **[MODULE_INDEX.md](./MODULE_INDEX.md)** for complete list and status.

## Overview

The Coder IDE project is organized into **8 major module categories** with **39+ logical modules**:

1. **Platform & Infrastructure** (4 modules) - Foundation layer
2. **Editor & UI** (5 modules) - User interface layer
3. **AI & Intelligence** (6 modules) - AI capabilities layer
4. **Project Management** (5 modules) - Project organization layer
5. **Collaboration & Organization** (4 modules) - Team features layer
6. **Productivity & Workflow** (8+ modules) - Specialized features layer
7. **Backend Services** (4 modules) - Server layer
8. **Shared & Common** (3 modules) - Common utilities layer

## Quick Start

1. Start with **[PROJECT_DESCRIPTION.md](./PROJECT_DESCRIPTION.md)** for high-level overview
2. Check **[MODULE_INDEX.md](./MODULE_INDEX.md)** for documentation status
3. Read **[module-list.md](./module-list.md)** for quick reference
4. Explore individual module documentation files for detailed information
5. Use **[module-breakdown.md](./module-breakdown.md)** for architecture overview

## Module Principles

- **Clear Separation of Concerns**: Each module has a single, well-defined responsibility
- **Explicit Interfaces**: Modules communicate through well-defined interfaces
- **Type Safety**: TypeScript ensures type safety across module boundaries
- **Dependency Management**: Clear dependency hierarchy prevents circular dependencies
- **Testability**: Each module can be tested independently

## Contributing

When adding new features:
1. Identify the appropriate module category
2. Check if a similar module already exists
3. Follow the module structure and naming conventions
4. Update this documentation if creating a new module