# Project Management Module

**Category:** Project Management  
**Location:** `src/core/` (project-related), `src/renderer/components/ProjectSelector/`  
**Last Updated:** 2025-01-27

---

## Overview

The Project Management Module provides project creation, management, selection, and application context management for the Coder IDE. It handles project lifecycle, configuration, and application profile management.

## Purpose

- Project CRUD operations
- Project selection and switching
- Application context management
- Application profile management
- Project configuration
- Project data context loading

---

## Key Components

### 1. Project Repository

**Location:** Backend API routes

**Purpose:** Project data persistence

**Operations:**
- Create project
- Get project
- Update project
- Delete project
- List projects

### 2. Application Profile Manager (`ApplicationProfileManager.ts`)

**Location:** `src/core/context/ApplicationProfileManager.ts`

**Purpose:** Manage application profiles

**Features:**
- Business context
- Technical context
- Scale context
- Regulatory context
- Team context
- Priority matrix

**Key Methods:**
```typescript
async saveProfile(projectId: string, profile: Partial<ApplicationProfile>): Promise<ApplicationProfile>
async getProfile(projectId: string): Promise<ApplicationProfile | null>
```

### 3. Project Data Context Loader (`ProjectDataContextLoader.ts`)

**Location:** `src/core/context/ProjectDataContextLoader.ts`

**Purpose:** Load project data for context

**Features:**
- Load tasks
- Load modules
- Load steps
- Load users
- Load tests
- Load architecture
- Load risk classifications

**Key Methods:**
```typescript
async loadProjectData(options: ProjectDataContextOptions): Promise<ProjectDataContext>
```

### 4. Project Selector Component

**Location:** `src/renderer/components/ProjectSelector.tsx`

**Purpose:** UI for project selection

**Features:**
- Project list
- Project search
- Project creation
- Project switching
- Project settings

---

## Application Profile

### Profile Structure

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

### Business Context

**Information:**
- Business goals
- User needs
- Market context
- Competitive landscape
- Success metrics

### Technical Context

**Information:**
- Technology stack
- Architecture patterns
- Performance requirements
- Security requirements
- Integration points

### Scale Context

**Information:**
- Current scale
- Expected growth
- Scalability requirements
- Resource constraints

### Regulatory Context

**Information:**
- Compliance requirements
- Data privacy
- Industry regulations
- Security standards

### Team Context

**Information:**
- Team size
- Team skills
- Team structure
- Collaboration patterns

### Priority Matrix

**Information:**
- Feature priorities
- Quality priorities
- Performance priorities
- Security priorities

---

## Project Operations

### Create Project

```typescript
// Create new project
const project = await createProject({
  name: 'My Project',
  description: 'Project description',
  organizationId: 'org-123',
  teamId: 'team-456',
});
```

### Get Project

```typescript
// Get project by ID
const project = await getProject(projectId);

// Project includes:
// - ID, name, description
// - Organization, team
// - Settings
// - Created/updated dates
```

### Update Project

```typescript
// Update project
const updated = await updateProject(projectId, {
  name: 'Updated Name',
  description: 'Updated description',
});
```

### Delete Project

```typescript
// Delete project
await deleteProject(projectId);
```

### List Projects

```typescript
// List user's projects
const projects = await listProjects({
  organizationId: 'org-123',
  teamId: 'team-456',
});
```

---

## Application Context

### Context Management

```typescript
// Save application profile
const profile = await applicationProfileManager.saveProfile(projectId, {
  businessContext: {
    goals: ['Increase user engagement'],
    userNeeds: ['Fast performance'],
  },
  technicalContext: {
    stack: ['React', 'TypeScript', 'Node.js'],
    patterns: ['REST API', 'Component-based'],
  },
});
```

### Context Loading

```typescript
// Load project data context
const context = await projectDataLoader.loadProjectData({
  projectId: 'project-123',
  includeTasks: true,
  includeModules: true,
  includeSteps: true,
  includeUsers: true,
  includeTests: true,
  includeArchitecture: true,
  limit: 100,
});
```

---

## Project Selection

### Select Project

```typescript
// Select project
await selectProject(projectId);

// This:
// - Loads project context
// - Updates application state
// - Refreshes UI
// - Loads project data
```

### Project Switching

```typescript
// Switch between projects
await switchProject(newProjectId);

// Handles:
// - Save current project state
// - Load new project
// - Update context
// - Refresh views
```

---

## Project Configuration

### Settings

**Project Settings:**
- Name, description
- Organization, team
- Access control
- Environment variables
- Build configuration

### Application Context Editor

**Component:** `ApplicationContextEditor.tsx`

**Features:**
- Edit business context
- Edit technical context
- Edit scale context
- Edit regulatory context
- Edit team context
- Edit priority matrix

---

## Integration Points

### Context Aggregation

- Project context used for AI planning
- Application profile guides code generation
- Project data enriches context

### Task Management

- Tasks linked to projects
- Project context for task assignment
- Project progress tracking

### Roadmap Management

- Roadmaps linked to projects
- Project goals inform roadmaps
- Roadmap progress tracked per project

---

## Usage Examples

### Create Project with Profile

```typescript
// Create project
const project = await createProject({
  name: 'E-commerce Platform',
  description: 'Online shopping platform',
  organizationId: 'org-123',
});

// Set application profile
await applicationProfileManager.saveProfile(project.id, {
  businessContext: {
    goals: ['Increase sales', 'Improve UX'],
    userNeeds: ['Fast checkout', 'Product search'],
  },
  technicalContext: {
    stack: ['Next.js', 'PostgreSQL', 'Redis'],
    patterns: ['Server-side rendering', 'API routes'],
  },
  scaleContext: {
    currentUsers: 10000,
    expectedGrowth: '10x in 6 months',
  },
});
```

### Load Project Context

```typescript
// Load full project context
const context = await projectDataLoader.loadProjectData({
  projectId: project.id,
  includeTasks: true,
  includeModules: true,
  includeArchitecture: true,
});

// Use context for AI planning
const plan = await planGenerator.generatePlan(intent, {
  projectContext: context,
});
```

---

## Related Modules

- **Task Management Module** - Tasks linked to projects
- **Roadmap Management Module** - Roadmaps linked to projects
- **Context Aggregation Module** - Uses project context
- **Collaboration & Organization Module** - Project access control

---

## Summary

The Project Management Module provides comprehensive project lifecycle management for the Coder IDE. With project CRUD operations, application profile management, and project data context loading, it enables organized, context-aware development workflows.
