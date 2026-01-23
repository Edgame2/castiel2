# Project Management Module
## Project Lifecycle and Application Context Management

---

## OVERVIEW

**Location:** `src/core/` (project-related), `src/renderer/components/ProjectSelector/`  
**Purpose:** Project creation, management, selection, and application context  
**Category:** Project Management

---

## CORE COMPONENTS (4)

### 1. Project Repository
**Location:** Backend API routes (`server/src/routes/projects.ts`)

**Purpose:** Project data persistence and CRUD operations

**Operations:**
```typescript
// CRUD
create(projectData: CreateProjectInput): Promise<Project>
getById(projectId: string): Promise<Project | null>
update(projectId: string, updates: UpdateProjectInput): Promise<Project>
delete(projectId: string): Promise<void>
list(filters?: ProjectFilters): Promise<Project[]>

// Queries
getByOrganization(organizationId: string): Promise<Project[]>
getByTeam(teamId: string): Promise<Project[]>
getByUser(userId: string): Promise<Project[]>
```

**Project Model:**
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  teamId?: string;
  settings?: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2. Application Profile Manager
**File:** `ApplicationProfileManager.ts`  
**Location:** `src/core/context/ApplicationProfileManager.ts`

**Purpose:** Manage rich application context profiles

**Profile Structure:**
```typescript
interface ApplicationProfile {
  businessContext: BusinessContext;
  technicalContext: TechnicalContext;
  scaleContext: ScaleContext;
  regulatoryContext: RegulatoryContext;
  teamContext: TeamContext;
  priorityMatrix: PriorityMatrix;
}
```

**Key Methods:**
```typescript
async saveProfile(projectId: string, profile: Partial<ApplicationProfile>): Promise<ApplicationProfile>
async getProfile(projectId: string): Promise<ApplicationProfile | null>
async updateProfile(projectId: string, updates: Partial<ApplicationProfile>): Promise<ApplicationProfile>
```

**Context Types:**

**Business Context:**
- Business goals
- User needs
- Market context
- Competitive landscape
- Success metrics
- Value proposition

**Technical Context:**
- Technology stack
- Architecture patterns
- Performance requirements
- Security requirements
- Integration points
- Technical constraints

**Scale Context:**
- Current scale (users, data, traffic)
- Expected growth trajectory
- Scalability requirements
- Resource constraints
- Capacity planning

**Regulatory Context:**
- Compliance requirements (GDPR, HIPAA, SOC2)
- Data privacy policies
- Industry regulations
- Security standards
- Audit requirements

**Team Context:**
- Team size and structure
- Team skills and expertise
- Collaboration patterns
- Communication preferences
- Development practices

**Priority Matrix:**
- Feature priorities
- Quality priorities
- Performance priorities
- Security priorities
- Time-to-market priorities

---

### 3. Project Data Context Loader
**File:** `ProjectDataContextLoader.ts`  
**Location:** `src/core/context/ProjectDataContextLoader.ts`

**Purpose:** Load comprehensive project data for AI context

**Key Methods:**
```typescript
async loadProjectData(options: ProjectDataContextOptions): Promise<ProjectDataContext>
```

**Load Options:**
```typescript
interface ProjectDataContextOptions {
  projectId: string;
  includeTasks?: boolean;
  includeModules?: boolean;
  includeSteps?: boolean;
  includeUsers?: boolean;
  includeTests?: boolean;
  includeArchitecture?: boolean;
  includeRiskClassifications?: boolean;
  limit?: number;
}
```

**Loaded Context:**
```typescript
interface ProjectDataContext {
  project: Project;
  applicationProfile?: ApplicationProfile;
  tasks?: Task[];
  modules?: Module[];
  steps?: PlanStep[];
  users?: User[];
  tests?: TestSuite[];
  architecture?: ArchitectureInfo;
  riskClassifications?: RiskClassification[];
}
```

**Usage:**
```typescript
const context = await projectDataLoader.loadProjectData({
  projectId: 'project-123',
  includeTasks: true,
  includeModules: true,
  includeArchitecture: true,
  limit: 100,
});

// Use in AI planning
const plan = await planGenerator.generatePlan(intent, {
  projectContext: context,
});
```

---

### 4. Project Selector Component
**File:** `ProjectSelector.tsx`  
**Location:** `src/renderer/components/ProjectSelector.tsx`

**Purpose:** UI for project selection and switching

**Features:**
- Project list display
- Project search/filter
- Project creation dialog
- Project switching
- Project settings access
- Recent projects

**UI Elements:**
- Dropdown selector
- Project cards
- Create project button
- Search input
- Settings button

---

## APPLICATION PROFILE MANAGEMENT

### Profile Contexts

#### 1. Business Context
```typescript
interface BusinessContext {
  goals: string[];              // ["Increase user engagement", "Reduce churn"]
  userNeeds: string[];          // ["Fast performance", "Mobile-friendly"]
  marketContext: string;        // "Competitive SaaS market"
  competitiveLandscape: string; // "3 major competitors"
  successMetrics: string[];     // ["DAU > 10k", "NPS > 50"]
  valueProposition: string;     // "Fastest deployment tool"
}
```

#### 2. Technical Context
```typescript
interface TechnicalContext {
  stack: string[];              // ["React", "Node.js", "PostgreSQL"]
  patterns: string[];           // ["REST API", "Microservices"]
  performanceReqs: string[];    // ["< 200ms response", "99.9% uptime"]
  securityReqs: string[];       // ["OAuth 2.0", "Encryption at rest"]
  integrations: string[];       // ["Stripe", "SendGrid", "AWS S3"]
  constraints: string[];        // ["Limited budget", "Small team"]
}
```

#### 3. Scale Context
```typescript
interface ScaleContext {
  currentUsers: number;         // 10000
  currentData: string;          // "500GB"
  currentTraffic: string;       // "1M requests/day"
  expectedGrowth: string;       // "10x in 6 months"
  scalabilityReqs: string[];    // ["Horizontal scaling", "Auto-scaling"]
  resourceConstraints: string[]; // ["Limited infrastructure budget"]
}
```

#### 4. Regulatory Context
```typescript
interface RegulatoryContext {
  compliance: string[];         // ["GDPR", "CCPA"]
  dataPrivacy: string[];        // ["User consent", "Data anonymization"]
  regulations: string[];        // ["PCI DSS", "HIPAA"]
  standards: string[];          // ["ISO 27001", "SOC 2"]
  auditReqs: string[];          // ["Quarterly audits", "Penetration testing"]
}
```

#### 5. Team Context
```typescript
interface TeamContext {
  size: number;                 // 5
  structure: string;            // "Cross-functional teams"
  skills: string[];             // ["React", "Node.js", "DevOps"]
  practices: string[];          // ["Agile", "TDD", "Code reviews"]
  collaboration: string[];      // ["Daily standups", "Pair programming"]
}
```

#### 6. Priority Matrix
```typescript
interface PriorityMatrix {
  features: Record<string, 'critical' | 'high' | 'medium' | 'low'>;
  quality: Record<string, 'critical' | 'high' | 'medium' | 'low'>;
  performance: Record<string, 'critical' | 'high' | 'medium' | 'low'>;
  security: Record<string, 'critical' | 'high' | 'medium' | 'low'>;
  timeToMarket: 'critical' | 'high' | 'medium' | 'low';
}
```

---

## PROJECT OPERATIONS

### Create Project
```typescript
const project = await createProject({
  name: 'E-commerce Platform',
  description: 'Online shopping platform',
  organizationId: 'org-123',
  teamId: 'team-456',
  settings: {
    visibility: 'team',
    enableCI: true,
  },
});
```

### Get Project
```typescript
const project = await getProject('project-123');

// Returns full project with settings
```

### Update Project
```typescript
const updated = await updateProject('project-123', {
  name: 'Updated Name',
  description: 'Updated description',
  settings: {
    visibility: 'organization',
  },
});
```

### Delete Project
```typescript
await deleteProject('project-123');

// Cascades to tasks, roadmaps, etc.
```

### List Projects
```typescript
// List by organization
const orgProjects = await listProjects({
  organizationId: 'org-123',
});

// List by team
const teamProjects = await listProjects({
  teamId: 'team-456',
});

// List user's projects
const myProjects = await listProjects({
  userId: 'user-789',
});
```

---

## PROJECT SELECTION

### Select Project
```typescript
// Select active project
await selectProject('project-123');

// This triggers:
// 1. Load project data
// 2. Load application profile
// 3. Update application state
// 4. Refresh UI
// 5. Load project context for AI
```

### Switch Project
```typescript
// Switch between projects
await switchProject('project-456');

// Handles:
// 1. Save current project state
// 2. Unload current context
// 3. Load new project
// 4. Update context
// 5. Refresh all views
```

---

## APPLICATION CONTEXT USAGE

### Context in AI Planning
```typescript
// Load full context
const context = await projectDataLoader.loadProjectData({
  projectId: 'project-123',
  includeTasks: true,
  includeModules: true,
  includeArchitecture: true,
});

// Use in plan generation
const plan = await planGenerator.generatePlan(
  'Add payment processing',
  {
    projectContext: context,
  }
);

// AI uses:
// - Business goals to align features
// - Technical stack to choose appropriate tech
// - Scale context to ensure scalability
// - Regulatory context to ensure compliance
```

### Context in Code Generation
```typescript
// Code generation uses profile
const code = await codeGenerator.generate(
  'Create user authentication',
  {
    technicalContext: profile.technicalContext,
    securityReqs: profile.technicalContext.securityReqs,
    compliance: profile.regulatoryContext.compliance,
  }
);

// Generated code follows:
// - Tech stack conventions
// - Security requirements
// - Compliance standards
```

---

## PROJECT CONFIGURATION

### Settings
```typescript
interface ProjectSettings {
  visibility: 'private' | 'team' | 'organization' | 'public';
  enableCI: boolean;
  enableCD: boolean;
  defaultBranch: string;
  requireReviews: boolean;
  minApprovals: number;
  autoMerge: boolean;
  notifications: NotificationSettings;
}
```

---

## UI COMPONENTS

### 1. Project Selector
- Dropdown with project list
- Search/filter projects
- Create new project button
- Recent projects section
- Project settings link

### 2. Application Context Editor
**Component:** `ApplicationContextEditor.tsx`

**Features:**
- Edit business context
- Edit technical context
- Edit scale context
- Edit regulatory context
- Edit team context
- Edit priority matrix
- Save/cancel actions
- Validation

---

## INTEGRATION POINTS

### Used By:

1. **Context Aggregation Module**
   - Uses project profile for context
   - Enriches codebase context

2. **Planning Module**
   - Uses profile for plan generation
   - Aligns plans with goals

3. **Execution Module**
   - Uses technical context for code gen
   - Ensures compliance

4. **Task Management**
   - Links tasks to projects
   - Project-scoped tasks

5. **Roadmap Management**
   - Links roadmaps to projects
   - Project goals inform roadmaps

### Uses:

1. **Organization Context** - Organization settings
2. **Team Management** - Team assignments
3. **RBAC** - Project access control

---

## API ENDPOINTS

**Base Path:** `/api/projects`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | `projects.read.all` | List projects |
| POST | `/` | Yes | `projects.create` | Create project |
| GET | `/:id` | Yes | `projects.read.all` | Get project |
| PUT | `/:id` | Yes | `projects.update.all` | Update project |
| DELETE | `/:id` | Yes | `projects.delete.all` | Delete project |
| GET | `/:id/profile` | Yes | `projects.read.all` | Get app profile |
| PUT | `/:id/profile` | Yes | `projects.update.all` | Update app profile |
| GET | `/:id/context` | Yes | `projects.read.all` | Get project context |

---

## IPC CHANNELS

**Channels:**
- `project:create` - Create project
- `project:get` - Get project
- `project:update` - Update project
- `project:delete` - Delete project
- `project:list` - List projects
- `project:select` - Select active project
- `project:get-profile` - Get app profile
- `project:save-profile` - Save app profile
- `project:load-context` - Load project context

---

## SUMMARY

### Core Components: 4
1. Project Repository (CRUD)
2. Application Profile Manager (rich context)
3. Project Data Context Loader (AI context)
4. Project Selector (UI)

### Application Profile: 6 Contexts
1. Business (goals, needs, metrics)
2. Technical (stack, patterns, requirements)
3. Scale (users, growth, capacity)
4. Regulatory (compliance, privacy, standards)
5. Team (size, skills, practices)
6. Priority Matrix (feature/quality/performance priorities)

### Features:
- **CRUD Operations:** Full project lifecycle management
- **Rich Context:** Comprehensive application profiles
- **AI Integration:** Context-aware planning and execution
- **Multi-tenant:** Organization and team scoping
- **Access Control:** RBAC integration
- **Selection/Switching:** Seamless project switching

### Context Usage:
- AI planning alignment with business goals
- Code generation following tech stack
- Compliance-aware code generation
- Scale-appropriate architecture

### API Endpoints: 8
### IPC Channels: 9

This module provides the foundation for organizing work into projects with rich contextual information that guides all AI-powered features!
