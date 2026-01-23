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

## 3. AI & Intelligence (6 modules)

| Module | Location | Purpose |
|--------|----------|---------|
| **Planning** | `src/core/planning/` | AI-assisted plan generation |
| **Execution** | `src/core/execution/` | Automated code generation and execution |
| **Context Aggregation** | `src/core/context/` | Codebase context collection |
| **Model Integration** | `src/core/models/` | AI model provider integration |
| **Agents** | `src/core/agents/` | Specialized AI agents |
| **Intent & Anticipation** | `src/core/intent/`, `anticipation/` | Intent understanding and issue detection |

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
| **Architecture & Design** | `src/core/architecture/`, `src/renderer/contexts/ArchitectureContext.tsx` | Architecture analysis |
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
- **Total Modules:** 39+
- **Frontend Modules:** 18+
- **Backend Modules:** 4
- **Core Logic Modules:** 20+
- **Shared Modules:** 3

---

## Module Dependencies Summary

```
Platform & Infrastructure
    ↓
Editor & UI ← Shared & Common
    ↓
AI & Intelligence ← Shared & Common
    ↓
Project Management ← Collaboration & Organization
    ↓
Productivity & Workflow ← Project Management
    ↓
Backend Services ← Shared & Common
```

---

For detailed information about each module, see [module-breakdown.md](./module-breakdown.md).
