# Project Module Breakdown

**Last Updated:** 2025-01-27  
**Purpose:** Logical organization of the Coder IDE project into distinct, maintainable modules

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [Module Categories](#module-categories)
3. [Detailed Module Descriptions](#detailed-module-descriptions)
4. [Module Dependencies](#module-dependencies)
5. [Module Boundaries](#module-boundaries)

---

## Module Overview

The Coder IDE project is organized into **8 major module categories** containing **30+ logical modules**. Each module has clear responsibilities and well-defined interfaces.

### Module Categories

1. **Platform & Infrastructure** (4 modules)
2. **Editor & UI** (5 modules)
3. **AI & Intelligence** (6 modules)
4. **Project Management** (5 modules)
5. **Collaboration & Organization** (4 modules)
6. **Productivity & Workflow** (8 modules)
7. **Backend Services** (4 modules)
8. **Shared & Common** (3 modules)

---

## Module Categories

### 1. Platform & Infrastructure Modules

Core platform functionality that enables the Electron application to run.

#### 1.1 Electron Main Process Module
**Location:** `src/main/`  
**Purpose:** Electron main process entry point, window management, application lifecycle  
**Key Components:**
- `main.ts` - Application entry point
- `windowState.ts` - Window state management
- `menu.ts` - Application menu configuration
- `preload.ts` - IPC bridge setup

**Responsibilities:**
- Application initialization
- Window creation and management
- Menu bar configuration
- Preload script setup for secure IPC

#### 1.2 IPC Communication Module
**Location:** `src/main/ipc/`  
**Purpose:** Inter-process communication between main and renderer processes  
**Key Components:**
- IPC handler registration
- Context handlers
- Planning handlers
- Execution handlers
- Model handlers
- Validation handlers
- Service handlers

**Responsibilities:**
- Secure IPC channel setup
- Request/response handling
- Error propagation
- Type-safe IPC interfaces

#### 1.3 Build & Configuration Module
**Location:** Root config files  
**Purpose:** Build system, bundling, and configuration  
**Key Components:**
- `webpack.*.config.js` - Webpack configurations
- `forge.config.js` - Electron Forge configuration
- `tsconfig.*.json` - TypeScript configurations
- `package.json` - Dependencies and scripts

**Responsibilities:**
- Code bundling and optimization
- TypeScript compilation
- Electron packaging
- Development/production builds

#### 1.4 Platform Services Module
**Location:** `src/main/services/`  
**Purpose:** Platform-level services (file system, OS integration)  
**Key Components:**
- File system operations
- OS integration utilities
- System resource management

**Responsibilities:**
- Native OS integration
- File system access
- System resource management

---

### 2. Editor & UI Modules

User interface components and editor functionality.

#### 2.1 Monaco Editor Module
**Location:** `src/renderer/components/editor/`  
**Purpose:** Code editing functionality using Monaco Editor  
**Key Components:**
- Editor component wrapper
- Editor configuration
- Syntax highlighting
- Code completion
- Multi-cursor support

**Responsibilities:**
- Code editing
- Syntax highlighting
- IntelliSense integration
- Editor customization

#### 2.2 File Management Module
**Location:** `src/renderer/components/FileExplorer/`, `src/renderer/components/EditorTabs/`  
**Purpose:** File system navigation and file operations  
**Key Components:**
- File Explorer tree
- Editor tabs
- File operations (create, delete, rename)
- Quick file search

**Responsibilities:**
- File tree navigation
- Tab management
- File operations
- File search

#### 2.3 UI Components Module
**Location:** `src/renderer/components/ui/`  
**Purpose:** Reusable UI components (Shadcn-based)  
**Key Components:**
- Button, Input, Dialog, etc.
- Form components
- Layout components
- Navigation components

**Responsibilities:**
- Component library
- Design system implementation
- Accessibility support
- Theming support

#### 2.4 Activity Bar & Views Module
**Location:** `src/renderer/components/ActivityBar/`, `src/renderer/components/views/`  
**Purpose:** Sidebar navigation and view management  
**Key Components:**
- Activity Bar
- View containers
- Panel management
- View switching

**Responsibilities:**
- Navigation structure
- View lifecycle
- Panel management
- View state persistence

#### 2.5 Command & Palette Module
**Location:** `src/renderer/components/CommandPalette/`  
**Purpose:** Command execution and command palette  
**Key Components:**
- Command palette UI
- Command registry
- Keyboard shortcuts
- Command execution

**Responsibilities:**
- Command discovery
- Keyboard shortcut handling
- Command execution
- Command history

---

### 3. AI & Intelligence Modules

AI-powered features for planning, execution, and code intelligence.

#### 3.1 Planning Module
**Location:** `src/core/planning/`  
**Purpose:** AI-assisted plan generation and validation  
**Key Components:**
- Intent interpretation
- Plan generation
- Plan validation
- Plan execution coordination

**Responsibilities:**
- User intent analysis
- Plan creation
- Plan quality validation
- Plan optimization

#### 3.2 Execution Module
**Location:** `src/core/execution/`  
**Purpose:** Automated code generation and execution  
**Key Components:**
- Step execution engine
- Code generation
- Validation pipeline
- Rollback mechanism

**Responsibilities:**
- Plan step execution
- Code generation
- Execution validation
- Error recovery

#### 3.3 Context Aggregation Module
**Location:** `src/core/context/`  
**Purpose:** Codebase context collection and analysis  
**Key Components:**
- File indexing
- AST parsing
- Git integration
- Embedding generation
- Context aggregation

**Responsibilities:**
- Codebase indexing
- Context extraction
- Semantic analysis
- Context storage

#### 3.4 Model Integration Module
**Location:** `src/core/models/`  
**Purpose:** AI model provider integration (OpenAI, Ollama)  
**Key Components:**
- Model router
- OpenAI provider
- Ollama provider
- Model configuration
- Response handling

**Responsibilities:**
- Model abstraction
- Provider switching
- Request/response handling
- Error handling

#### 3.5 Agents Module
**Location:** `src/core/agents/`  
**Purpose:** Specialized AI agents for different tasks  
**Key Components:**
- Agent base classes
- Specialized agents (20+ agents)
- Agent orchestration
- Agent communication

**Responsibilities:**
- Agent lifecycle
- Task delegation
- Agent coordination
- Result aggregation

#### 3.6 Intent & Anticipation Module
**Location:** `src/core/intent/`, `src/core/anticipation/`  
**Purpose:** User intent understanding and proactive issue detection  
**Key Components:**
- Intent parsing
- Issue anticipation
- Proactive recommendations
- Pattern detection

**Responsibilities:**
- Intent recognition
- Issue prediction
- Proactive alerts
- Pattern analysis

---

### 4. Project Management Modules

Project, task, and roadmap management functionality.

#### 4.1 Project Management Module
**Location:** `src/core/` (project-related), `src/renderer/components/ProjectSelector/`  
**Purpose:** Project creation, management, and selection  
**Key Components:**
- Project CRUD operations
- Project selector UI
- Project context
- Application context editor

**Responsibilities:**
- Project lifecycle
- Project configuration
- Application context management
- Project switching

#### 4.2 Task Management Module
**Location:** `src/core/tasks/`  
**Purpose:** Global task repository and task lifecycle  
**Key Components:**
- Task CRUD operations
- Task assignments
- Task dependencies
- Task linking
- Task management UI

**Responsibilities:**
- Task creation and management
- Task assignment
- Dependency tracking
- Task status tracking

#### 4.3 Roadmap Management Module
**Location:** `src/core/roadmap/`  
**Purpose:** Multi-level roadmap hierarchy (Milestones → Epics → Stories)  
**Key Components:**
- Roadmap structure
- Milestone management
- Epic management
- Story management
- Roadmap UI

**Responsibilities:**
- Roadmap creation
- Hierarchy management
- Progress tracking
- Roadmap visualization

#### 4.4 Module Detection Module
**Location:** `src/core/` (module-related)  
**Purpose:** Automatic module detection and organization  
**Key Components:**
- Module detection algorithms
- Module organization
- Module metadata
- Module UI

**Responsibilities:**
- Codebase module detection
- Module organization
- Module metadata extraction
- Module visualization

#### 4.5 Environment Management Module
**Location:** `src/core/environments/`  
**Purpose:** Multi-environment configuration and validation  
**Key Components:**
- Environment definitions
- Environment validation
- Environment switching
- Environment UI

**Responsibilities:**
- Environment configuration
- Environment validation
- Environment management
- Environment deployment

---

### 5. Collaboration & Organization Modules

Team collaboration, user management, and access control.

#### 5.1 Authentication & Authorization Module
**Location:** `server/src/auth/`, `src/renderer/contexts/AuthContext.tsx`  
**Purpose:** User authentication and authorization  
**Key Components:**
- Google OAuth integration
- JWT token management
- Session management
- Login/logout flows

**Responsibilities:**
- User authentication
- Token management
- Session handling
- Security enforcement

#### 5.2 User & Team Management Module
**Location:** `src/core/users/`, `server/src/routes/users.ts`, `server/src/routes/teams.ts`  
**Purpose:** User profiles and team management  
**Key Components:**
- User CRUD operations
- Team CRUD operations
- User profiles
- Team hierarchy
- Competency tracking

**Responsibilities:**
- User management
- Team management
- Profile management
- Hierarchy management

#### 5.3 RBAC Module
**Location:** `server/src/middleware/rbac.ts`, `src/core/security/`  
**Purpose:** Role-based access control  
**Key Components:**
- Permission definitions
- Role management
- Permission checking
- Access control enforcement

**Responsibilities:**
- Permission management
- Role assignment
- Access control
- Security policies

#### 5.4 Organization Context Module
**Location:** `src/renderer/contexts/OrganizationContext.tsx`  
**Purpose:** Organization-wide context and settings  
**Key Components:**
- Organization settings
- Organization context
- Global configuration

**Responsibilities:**
- Organization management
- Global settings
- Organization context

---

### 6. Productivity & Workflow Modules

Specialized productivity features and workflows.

#### 6.1 Calendar & Planning Integration Module
**Location:** `src/core/calendar/`, `src/renderer/contexts/CalendarContext.tsx`  
**Purpose:** Calendar integration and planning  
**Key Components:**
- Calendar views
- Event management
- Planning integration
- Schedule management

**Responsibilities:**
- Calendar functionality
- Event scheduling
- Planning integration
- Time management

#### 6.2 Messaging Module
**Location:** `src/core/messaging/`, `src/renderer/contexts/MessagingContext.tsx`  
**Purpose:** Team messaging and communication  
**Key Components:**
- Message sending/receiving
- Channel management
- Notification system
- Message history

**Responsibilities:**
- Messaging functionality
- Channel management
- Notifications
- Communication

#### 6.3 Knowledge Base Module
**Location:** `src/core/knowledge/`, `src/renderer/contexts/KnowledgeContext.tsx`  
**Purpose:** Knowledge base and documentation management  
**Key Components:**
- Knowledge base CRUD
- Search functionality
- Documentation management
- Knowledge organization

**Responsibilities:**
- Knowledge storage
- Knowledge retrieval
- Documentation management
- Search functionality

#### 6.4 Code Review Module
**Location:** `src/core/reviews/`, `src/renderer/contexts/ReviewContext.tsx`  
**Purpose:** Code review workflow and management  
**Key Components:**
- Review creation
- Review comments
- Review approval
- Review history

**Responsibilities:**
- Review workflow
- Comment management
- Approval process
- Review tracking

#### 6.5 Incident Management Module
**Location:** `src/core/incidents/`, `src/renderer/contexts/IncidentContext.tsx`  
**Purpose:** Incident tracking and management  
**Key Components:**
- Incident creation
- Incident tracking
- Incident resolution
- Incident reporting

**Responsibilities:**
- Incident lifecycle
- Incident tracking
- Resolution management
- Reporting

#### 6.6 Learning & Development Module
**Location:** `src/core/learning/`, `src/renderer/contexts/LearningContext.tsx`  
**Purpose:** Learning resources and skill development  
**Key Components:**
- Learning resources
- Skill tracking
- Recommendations
- Progress tracking

**Responsibilities:**
- Learning management
- Skill development
- Recommendations
- Progress tracking

#### 6.7 Architecture & Design Module
**Location:** `src/core/architecture/`, `src/renderer/contexts/ArchitectureContext.tsx`  
**Purpose:** Architecture analysis and design  
**Key Components:**
- Architecture analysis
- Design patterns
- Code quality metrics
- Dependency analysis

**Responsibilities:**
- Architecture analysis
- Design pattern detection
- Quality metrics
- Dependency tracking

#### 6.8 Release Management Module
**Location:** `src/core/releases/`, `src/renderer/contexts/ReleaseContext.tsx`  
**Purpose:** Release planning and management  
**Key Components:**
- Release planning
- Release tracking
- Version management
- Deployment coordination

**Responsibilities:**
- Release lifecycle
- Version management
- Deployment tracking
- Release coordination

#### 6.9 Additional Productivity Modules
**Location:** `src/core/` (various)  
**Purpose:** Additional specialized productivity features  
**Key Modules:**
- **Dependency Management** (`src/core/dependencies/`)
- **Technical Debt** (`src/core/debt/`)
- **Experiments** (`src/core/experiments/`)
- **Innovation** (`src/core/innovation/`)
- **Pairing** (`src/core/pairing/`)
- **Capacity Planning** (`src/core/capacity/`)
- **Pattern Library** (`src/core/patterns/`)
- **Standards** (`src/core/standards/`)
- **Compliance** (`src/core/compliance/`)

---

### 7. Backend Services Modules

Server-side API and database functionality.

#### 7.1 API Server Module
**Location:** `server/src/server.ts`, `server/src/routes/`  
**Purpose:** RESTful API endpoints  
**Key Components:**
- Fastify server setup
- Route handlers (50+ routes)
- Request/response handling
- Middleware chain

**Responsibilities:**
- API endpoint definition
- Request handling
- Response formatting
- Error handling

#### 7.2 Database Module
**Location:** `server/database/`, `server/src/database/`  
**Purpose:** Database access and management  
**Key Components:**
- Prisma schema
- Database client
- Migrations
- Seed scripts
- Redis client

**Responsibilities:**
- Database access
- Schema management
- Migration handling
- Data seeding

#### 7.3 Services Module
**Location:** `server/src/services/`  
**Purpose:** Business logic services  
**Key Components:**
- Service layer (40+ services)
- Business logic
- Data transformation
- Service orchestration

**Responsibilities:**
- Business logic
- Data processing
- Service coordination
- Complex operations

#### 7.4 Middleware Module
**Location:** `server/src/middleware/`  
**Purpose:** Request middleware (auth, validation, etc.)  
**Key Components:**
- Authentication middleware
- RBAC middleware
- Validation middleware
- Error handling middleware
- Logging middleware

**Responsibilities:**
- Request preprocessing
- Authentication
- Authorization
- Validation
- Error handling

---

### 8. Shared & Common Modules

Shared utilities, types, and common functionality.

#### 8.1 Shared Types Module
**Location:** `src/shared/types/`  
**Purpose:** Shared TypeScript types and interfaces  
**Key Components:**
- Type definitions
- Interface definitions
- Type utilities
- Common types

**Responsibilities:**
- Type definitions
- Type safety
- Interface contracts
- Type utilities

#### 8.2 Validation Module
**Location:** `src/core/validation/`  
**Purpose:** Data validation and sanitization  
**Key Components:**
- Validation schemas (Zod)
- Validation utilities
- Sanitization functions
- Validation pipelines

**Responsibilities:**
- Input validation
- Data sanitization
- Schema validation
- Validation utilities

#### 8.3 Utilities Module
**Location:** `src/renderer/utils/`, `server/src/utils/`  
**Purpose:** Common utility functions  
**Key Components:**
- Helper functions
- Formatting utilities
- Date/time utilities
- String manipulation
- Array/object utilities

**Responsibilities:**
- Common utilities
- Helper functions
- Formatting
- Data manipulation

---

## Module Dependencies

### Dependency Graph Overview

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

### Key Dependencies

1. **All modules** depend on **Shared & Common** modules
2. **Editor & UI** depends on **Platform & Infrastructure**
3. **AI & Intelligence** is used by **Project Management** and **Productivity & Workflow**
4. **Project Management** depends on **Collaboration & Organization**
5. **Productivity & Workflow** depends on **Project Management**
6. **Backend Services** provides APIs for all frontend modules

---

## Module Boundaries

### Clear Separation Principles

1. **Frontend vs Backend**
   - Frontend: `src/renderer/`, `src/main/`
   - Backend: `server/src/`
   - Communication: IPC (frontend) and HTTP (backend)

2. **Core Logic vs UI**
   - Core: `src/core/`
   - UI: `src/renderer/components/`
   - Communication: Context providers and hooks

3. **Services vs Routes**
   - Services: Business logic
   - Routes: API endpoints
   - Services are called by routes

4. **Shared Types**
   - All modules can use shared types
   - No circular dependencies allowed

### Module Interface Guidelines

1. **Explicit Exports**: Each module should export clear public APIs
2. **Type Safety**: Use TypeScript interfaces for module boundaries
3. **Dependency Injection**: Use context providers for React components
4. **Service Layer**: Backend services abstract database access
5. **IPC Contracts**: Clear contracts for Electron IPC communication

---

## Module Organization Recommendations

### Current Structure
- ✅ Clear separation of concerns
- ✅ Logical grouping by functionality
- ✅ Shared types in dedicated location
- ✅ Context providers for React state

### Potential Improvements
1. **Module Index Files**: Create `index.ts` files for cleaner imports
2. **Module Documentation**: Add README.md to each major module
3. **Module Tests**: Organize tests by module structure
4. **Module Boundaries**: Enforce boundaries with linting rules
5. **Module Versioning**: Consider module versioning for large modules

---

## Summary

The Coder IDE project is organized into **8 major categories** with **30+ logical modules**:

- **Platform & Infrastructure** (4 modules) - Foundation
- **Editor & UI** (5 modules) - User interface
- **AI & Intelligence** (6 modules) - AI capabilities
- **Project Management** (5 modules) - Project organization
- **Collaboration & Organization** (4 modules) - Team features
- **Productivity & Workflow** (8+ modules) - Specialized features
- **Backend Services** (4 modules) - Server functionality
- **Shared & Common** (3 modules) - Common utilities

Each module has clear responsibilities, well-defined interfaces, and follows separation of concerns principles.
