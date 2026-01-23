
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



module-list.md
5.96 Ko •147 lignes
•
Le formatage peut être différent de la source

# Module List - Quick Reference

**Last Updated:** 2025-01-27  
**Purpose:** Quick reference list of all project modules

---

## 1. Platform & Infrastructure (4 modules)

| Module | Location | Purpose |
|--------|----------|---------|
| **Electron Main Process** | `src/main/` | Application entry point, window management |
| **IPC Communication** | `src/main/ipc/` | Inter-process communication |
| **Build & Configuration** | Root config files | Build system and bundling |
| **Platform Services** | `src/main/services/` | OS integration and file system |

---

## 2. Editor & UI (5 modules)

| Module | Location | Purpose |
|--------|----------|---------|
| **Monaco Editor** | `src/renderer/components/editor/` | Code editing functionality |
| **File Management** | `src/renderer/components/FileExplorer/`, `EditorTabs/` | File navigation and operations |
| **UI Components** | `src/renderer/components/ui/` | Reusable UI component library |
| **Activity Bar & Views** | `src/renderer/components/ActivityBar/`, `views/` | Sidebar navigation and views |
| **Command & Palette** | `src/renderer/components/CommandPalette/` | Command execution and shortcuts |

---

## 3. AI & Intelligence (7 modules)

| Module | Location | Purpose |
|--------|----------|---------|
| **Planning** | `src/core/planning/` | AI-assisted plan generation with quality gates |
| **Infrastructure Architecture Planning** | `src/core/planning/infrastructure/` | Cloud, container, database & architecture planning ⭐ |
| **Execution** | `src/core/execution/` | Automated code generation and execution |
| **Context Aggregation** | `src/core/context/` | Codebase context collection |
| **Model Integration** | `src/core/models/` | AI model provider integration |
| **Agents** | `src/core/agents/` | Specialized AI agents |
| **Intent & Anticipation** | `src/core/intent/`, `anticipation/` | Intent understanding and issue detection |

> **⭐ Infrastructure Architecture Planning** supports:
> - Cloud providers (Azure, AWS, GCP) - service selection, multi-cloud, cost optimization
> - Containers (Docker, Kubernetes) - best practices, security, registries
> - Databases (all types) - relational, NoSQL, graph, time-series, search, warehouse
> - Architecture decisions - patterns, technology selection, migration planning
> - Infrastructure-as-Code - Terraform, Pulumi, CloudFormation templates
> 
> See: [INFRASTRUCTURE-ARCHITECTURE-PLANNING-SPECIFICATION.md](../planning/INFRASTRUCTURE-ARCHITECTURE-PLANNING-SPECIFICATION.md)

---

## 4. Project Management (5 modules)

| Module | Location | Purpose |
|--------|----------|---------|
| **Project Management** | `src/core/` (project-related), `src/renderer/components/ProjectSelector/` | Project CRUD and selection |
| **Task Management** | `src/core/tasks/` | Global task repository |
| **Roadmap Management** | `src/core/roadmap/` | Multi-level roadmap hierarchy |
| **Module Detection** | `src/core/` (module-related) | Automatic module detection |
| **Environment Management** | `src/core/environments/` | Multi-environment configuration |

---

## 5. Collaboration & Organization (4 modules)

| Module | Location | Purpose |
|--------|----------|---------|
| **Authentication & Authorization** | `server/src/auth/`, `src/renderer/contexts/AuthContext.tsx` | User authentication and JWT |
| **User & Team Management** | `src/core/users/`, `server/src/routes/users.ts`, `teams.ts` | User profiles and teams |
| **RBAC** | `server/src/middleware/rbac.ts`, `src/core/security/` | Role-based access control |
| **Organization Context** | `src/renderer/contexts/OrganizationContext.tsx` | Organization-wide settings |

---

## 6. Productivity & Workflow (8+ modules)

| Module | Location | Purpose |
|--------|----------|---------|
| **Calendar & Planning** | `src/core/calendar/`, `src/renderer/contexts/CalendarContext.tsx` | Calendar integration |
| **Messaging** | `src/core/messaging/`, `src/renderer/contexts/MessagingContext.tsx` | Team messaging |
| **Knowledge Base** | `src/core/knowledge/`, `src/renderer/contexts/KnowledgeContext.tsx` | Documentation management |
| **Code Review** | `src/core/reviews/`, `src/renderer/contexts/ReviewContext.tsx` | Code review workflow |
| **Incident Management** | `src/core/incidents/`, `src/renderer/contexts/IncidentContext.tsx` | Incident tracking |
| **Learning & Development** | `src/core/learning/`, `src/renderer/contexts/LearningContext.tsx` | Learning resources |
| **Architecture & Design** | `src/core/architecture/`, `src/renderer/contexts/ArchitectureContext.tsx` | Architecture analysis & infrastructure planning |
| **Release Management** | `src/core/releases/`, `src/renderer/contexts/ReleaseContext.tsx` | Release planning |

### Additional Productivity Modules

| Module | Location | Purpose |
|--------|----------|---------|
| **Dependency Management** | `src/core/dependencies/` | Dependency tracking |
| **Technical Debt** | `src/core/debt/` | Technical debt management |
| **Experiments** | `src/core/experiments/` | Experiment tracking |
| **Innovation** | `src/core/innovation/` | Innovation management |
| **Pairing** | `src/core/pairing/` | Pair programming |
| **Capacity Planning** | `src/core/capacity/` | Resource capacity planning |
| **Pattern Library** | `src/core/patterns/` | Design pattern library |
| **Standards** | `src/core/standards/` | Coding standards |
| **Compliance** | `src/core/compliance/` | Compliance management |

---

## 7. Backend Services (4 modules)

| Module | Location | Purpose |
|--------|----------|---------|
| **API Server** | `server/src/server.ts`, `server/src/routes/` | RESTful API endpoints |
| **Database** | `server/database/`, `server/src/database/` | Database access and migrations |
| **Services** | `server/src/services/` | Business logic services |
| **Middleware** | `server/src/middleware/` | Request middleware (auth, validation) |

---

## 8. Shared & Common (3 modules)

| Module | Location | Purpose |
|--------|----------|---------|
| **Shared Types** | `src/shared/types/` | Shared TypeScript types |
| **Validation** | `src/core/validation/` | Data validation and sanitization |
| **Utilities** | `src/renderer/utils/`, `server/src/utils/` | Common utility functions |

---

## Module Statistics

- **Total Categories:** 8
- **Total Modules:** 40+
- **Frontend Modules:** 18+
- **Backend Modules:** 4
- **Core Logic Modules:** 21+ (including Infrastructure Architecture Planning)
- **Shared Modules:** 3

---

## Module Dependencies Summary

```
Platform & Infrastructure
    â†“
Editor & UI â† Shared & Common
    â†“
AI & Intelligence â† Shared & Common
    â†“
Project Management â† Collaboration & Organization
    â†“
Productivity & Workflow â† Project Management
    â†“
Backend Services â† Shared & Common
```

---

For detailed information about each module, see [module-breakdown.md](./module-breakdown.md).