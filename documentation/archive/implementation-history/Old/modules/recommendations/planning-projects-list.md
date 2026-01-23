# Planning & Project Management Modules
## UI Pages, Components, and API Endpoints

---

## PLANNING MODULE

### UI Pages/Views

**Location:** `src/renderer/components/`

1. **PlansPanel** - Main plans view in activity bar
2. **PlanGenerator** - Plan generation interface
3. **PlanValidator** - Plan validation view
4. **PlanExecutor** - Plan execution interface
5. **PlanHistory** - Historical plans view
6. **PlanDetails** - Detailed plan view with steps

### UI Components

**Planning-Specific Components:**

1. **PlanCard** - Display plan summary
2. **PlanStepItem** - Individual plan step display
3. **PlanStatusBadge** - Plan status indicator
4. **PlanProgressBar** - Plan execution progress
5. **PlanValidationResults** - Validation feedback display
6. **PlanStepDependencyGraph** - Visual dependency graph
7. **PlanConfidenceIndicator** - Confidence score display
8. **PlanRefinementInput** - Plan refinement interface
9. **IntentInput** - User intent input field
10. **PlanStrategySelector** - Planning strategy selection

**Shared UI Components Used:**
- Button
- Input
- Textarea
- Card
- Badge
- Progress
- Dialog
- Tabs
- Accordion
- Tooltip
- Alert

### API Endpoints

**Base Path:** `/api/plans`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/plans` | Generate new plan from intent |
| GET | `/api/plans` | List all plans |
| GET | `/api/plans/:id` | Get plan by ID |
| PUT | `/api/plans/:id` | Update plan |
| DELETE | `/api/plans/:id` | Delete plan |
| POST | `/api/plans/:id/refine` | Refine existing plan |
| POST | `/api/plans/:id/validate` | Validate plan |
| POST | `/api/plans/:id/execute` | Execute plan |
| PUT | `/api/plans/:id/pause` | Pause plan execution |
| PUT | `/api/plans/:id/resume` | Resume plan execution |
| PUT | `/api/plans/:id/cancel` | Cancel plan execution |
| GET | `/api/plans/:id/status` | Get execution status |
| GET | `/api/plans/:id/steps` | Get plan steps |
| PUT | `/api/plans/:id/steps/:stepId` | Update plan step |

### Plan Data Types

```typescript
interface Plan {
  id: string;
  title: string;
  description: string;
  intent: string;
  steps: PlanStep[];
  status: 'draft' | 'validated' | 'ready' | 'executing' | 'completed' | 'failed' | 'cancelled';
  confidence: number;
  estimatedTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PlanStep {
  id: string;
  title: string;
  description: string;
  type: 'file_create' | 'file_edit' | 'file_delete' | 'command' | 'validation';
  dependencies: string[];
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  order: number;
}
```

---

## PROJECT MANAGEMENT MODULE

### UI Pages/Views

**Location:** `src/renderer/components/`

1. **ProjectSelector** - Project selection dropdown
2. **ProjectManagementPanel** - Main project management view
3. **ProjectDetails** - Project details view
4. **ProjectSettings** - Project configuration
5. **ApplicationContextEditor** - Application profile editor
6. **ProjectList** - List all projects
7. **ProjectCreationWizard** - New project wizard

### UI Components

**Project-Specific Components:**

1. **ProjectCard** - Project summary card
2. **ProjectStatusBadge** - Project status indicator
3. **ProjectSelector** - Dropdown project selector
4. **ProjectContextPanel** - Application context display
5. **BusinessContextEditor** - Business context fields
6. **TechnicalContextEditor** - Technical stack editor
7. **ScaleContextEditor** - Scale/growth editor
8. **RegulatoryContextEditor** - Regulatory requirements
9. **TeamContextEditor** - Team structure editor
10. **PriorityMatrixEditor** - Priority matrix configuration

**Shared UI Components Used:**
- Button
- Input
- Textarea
- Select
- Card
- Dialog
- Form
- FormField
- Tabs
- Badge
- Separator

### API Endpoints

**Base Path:** `/api/projects`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project by ID |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/tasks` | Get project tasks |
| GET | `/api/projects/:id/modules` | Get project modules |
| GET | `/api/projects/:id/profile` | Get application profile |
| PUT | `/api/projects/:id/profile` | Update application profile |
| GET | `/api/projects/:id/context` | Get full project context |
| POST | `/api/projects/:id/switch` | Switch to project |

### Project Data Types

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  teamId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApplicationProfile {
  projectId: string;
  businessContext?: {
    goals: string[];
    userNeeds: string[];
    businessRules: string[];
  };
  technicalContext?: {
    stack: string[];
    patterns: string[];
    constraints: string[];
  };
  scaleContext?: {
    currentUsers: number;
    expectedGrowth: string;
    performanceTargets: string[];
  };
  regulatoryContext?: {
    requirements: string[];
    complianceStandards: string[];
  };
  teamContext?: {
    size: number;
    roles: string[];
    expertise: string[];
  };
  priorityMatrix?: {
    high: string[];
    medium: string[];
    low: string[];
  };
}
```

---

## TASK MANAGEMENT MODULE

### UI Pages/Views

**Location:** `src/renderer/components/`

1. **TaskManagementView** - Main task management interface
2. **TaskBoard** - Kanban-style task board
3. **TaskList** - List view of tasks
4. **TaskDetails** - Detailed task view
5. **TaskCreationDialog** - New task creation
6. **TaskAssignmentPanel** - Task assignment interface
7. **TaskDependencyGraph** - Task dependency visualization

### UI Components

**Task-Specific Components:**

1. **TaskCard** - Task summary card
2. **TaskItem** - Task list item
3. **TaskStatusBadge** - Task status indicator
4. **TaskPriorityBadge** - Priority indicator
5. **TaskTypeBadge** - Task type indicator
6. **TaskAssigneeAvatar** - Assignee display
7. **TaskDependencyList** - Dependencies display
8. **SubtaskList** - Subtasks display
9. **TaskProgressBar** - Task progress
10. **TaskTimeEstimate** - Time estimate display
11. **TaskLinkedItems** - Linked roadmap items

**Shared UI Components Used:**
- Button
- Input
- Textarea
- Select
- Card
- Badge
- Avatar
- Dialog
- Form
- Tabs
- Progress
- Checkbox

### API Endpoints

**Base Path:** `/api/tasks`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create new task |
| GET | `/api/tasks/:id` | Get task by ID |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PUT | `/api/tasks/:id/status` | Update task status |
| PUT | `/api/tasks/:id/assign` | Assign task to user |
| POST | `/api/tasks/:id/subtasks` | Create subtask |
| GET | `/api/tasks/:id/subtasks` | List subtasks |
| POST | `/api/tasks/:id/dependencies` | Add dependency |
| DELETE | `/api/tasks/:id/dependencies/:depId` | Remove dependency |
| POST | `/api/tasks/:id/link` | Link to roadmap item |
| GET | `/api/tasks/:id/history` | Get task history |
| POST | `/api/tasks/:id/comments` | Add comment |
| GET | `/api/tasks/:id/comments` | List comments |

### Task Data Types

```typescript
interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  type: 'feature' | 'bug' | 'refactor' | 'documentation' | 'test';
  status: 'to_do' | 'in_progress' | 'in_review' | 'blocked' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  createdBy: string;
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: Date;
  milestoneId?: string;
  epicId?: string;
  storyId?: string;
  parentTaskId?: string;
  dependencies: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## ROADMAP MANAGEMENT MODULE

### UI Pages/Views

**Location:** `src/renderer/components/`

1. **RoadmapView** - Main roadmap visualization
2. **RoadmapHierarchy** - Hierarchical roadmap view
3. **RoadmapTimeline** - Timeline visualization
4. **MilestoneDetails** - Milestone details view
5. **EpicDetails** - Epic details view
6. **StoryDetails** - Story details view
7. **RoadmapProgress** - Progress tracking view
8. **RoadmapDependencies** - Dependency graph view

### UI Components

**Roadmap-Specific Components:**

1. **RoadmapCard** - Roadmap summary card
2. **MilestoneCard** - Milestone card
3. **EpicCard** - Epic card
4. **StoryCard** - Story card
5. **RoadmapTree** - Tree visualization
6. **RoadmapTimeline** - Timeline component
7. **MilestoneProgressBar** - Milestone progress
8. **EpicProgressBar** - Epic progress
9. **StoryProgressBar** - Story progress
10. **RoadmapStatusBadge** - Status indicators
11. **DependencyGraph** - Visual dependency graph
12. **CriticalPath** - Critical path display
13. **RoadmapVersionSelector** - Version selection

**Shared UI Components Used:**
- Button
- Input
- Textarea
- Card
- Badge
- Progress
- Dialog
- Tabs
- Accordion
- Separator
- Calendar

### API Endpoints

**Base Path:** `/api/roadmaps`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roadmaps` | List all roadmaps |
| POST | `/api/roadmaps` | Create new roadmap |
| GET | `/api/roadmaps/:id` | Get roadmap by ID |
| PUT | `/api/roadmaps/:id` | Update roadmap |
| DELETE | `/api/roadmaps/:id` | Delete roadmap |
| GET | `/api/roadmaps/:id/hierarchy` | Get full hierarchy |
| GET | `/api/roadmaps/:id/progress` | Get progress tracking |
| GET | `/api/roadmaps/:id/tree` | Get roadmap tree with tasks |
| POST | `/api/roadmaps/:id/milestones` | Create milestone |
| GET | `/api/roadmaps/milestones/:id` | Get milestone |
| PUT | `/api/roadmaps/milestones/:id` | Update milestone |
| DELETE | `/api/roadmaps/milestones/:id` | Delete milestone |
| POST | `/api/roadmaps/milestones/:id/epics` | Create epic |
| GET | `/api/roadmaps/epics/:id` | Get epic |
| PUT | `/api/roadmaps/epics/:id` | Update epic |
| DELETE | `/api/roadmaps/epics/:id` | Delete epic |
| POST | `/api/roadmaps/epics/:id/stories/generate` | AI-generate stories from epic |
| POST | `/api/roadmaps/epics/:id/stories` | Create story |
| GET | `/api/roadmaps/stories/:id` | Get story |
| PUT | `/api/roadmaps/stories/:id` | Update story |
| DELETE | `/api/roadmaps/stories/:id` | Delete story |
| POST | `/api/roadmaps/stories/:id/tasks/generate` | AI-generate tasks from story |
| GET | `/api/roadmaps/:id/dependencies` | Get dependency graph |
| GET | `/api/roadmaps/:id/critical-path` | Get critical path |

### Roadmap Data Types

```typescript
interface Roadmap {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Milestone {
  id: string;
  roadmapId: string;
  name: string;
  description?: string;
  targetDate?: Date;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

interface Epic {
  id: string;
  milestoneId: string;
  name: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

interface Story {
  id: string;
  epicId: string;
  name: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

interface RoadmapTree {
  roadmap: Roadmap & { progress: number };
  milestones: (Milestone & {
    progress: number;
    epics: (Epic & {
      progress: number;
      stories: (Story & {
        progress: number;
        tasks: Task[];
      })[];
    })[];
  })[];
}
```

---

## MODULE DETECTION MODULE

### UI Pages/Views

**Location:** `src/renderer/components/`

1. **ModuleExplorer** - Module detection and browsing
2. **ModuleDetails** - Module details view
3. **ModuleGraph** - Module dependency visualization
4. **ModuleDetectionResults** - Detection results display

### UI Components

**Module-Specific Components:**

1. **ModuleCard** - Module summary card
2. **ModuleTree** - Hierarchical module tree
3. **ModuleConfidenceBadge** - Confidence indicator
4. **SubmoduleList** - Submodules display
5. **ModuleDependencyGraph** - Dependency visualization

**Shared UI Components Used:**
- Button
- Card
- Badge
- Progress
- Accordion
- Separator

### API Endpoints

**Base Path:** `/api/modules`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/modules` | List all modules |
| POST | `/api/modules/detect` | Detect modules in project |
| GET | `/api/modules/:id` | Get module by ID |
| PUT | `/api/modules/:id` | Update module |
| DELETE | `/api/modules/:id` | Delete module |
| POST | `/api/modules/:id/submodules` | Create submodule |
| GET | `/api/modules/:id/submodules` | List submodules |
| PUT | `/api/modules/submodules/:id` | Update submodule |
| DELETE | `/api/modules/submodules/:id` | Delete submodule |

### Module Data Types

```typescript
interface Module {
  id: string;
  name: string;
  path: string;
  files: string[];
  dependencies: string[];
  confidence: number;
  projectId: string;
}

interface Submodule {
  id: string;
  moduleId: string;
  name: string;
  path: string;
  files: string[];
  dependencies: string[];
}
```

---

## ENVIRONMENT MANAGEMENT MODULE

### UI Pages/Views

**Location:** `src/renderer/components/`

1. **EnvironmentManager** - Environment management interface
2. **EnvironmentDetails** - Environment configuration view
3. **EnvironmentSelector** - Environment selection dropdown
4. **EnvironmentComparison** - Compare environments

### UI Components

**Environment-Specific Components:**

1. **EnvironmentCard** - Environment summary card
2. **EnvironmentBadge** - Environment type badge
3. **EnvironmentConfigEditor** - Configuration editor
4. **EnvironmentVariables** - Environment variables editor
5. **FeatureFlagsEditor** - Feature flags configuration

**Shared UI Components Used:**
- Button
- Input
- Select
- Card
- Badge
- Dialog
- Form
- Tabs

### API Endpoints

**Base Path:** `/api/environments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/environments` | List all environments |
| POST | `/api/environments` | Create new environment |
| GET | `/api/environments/:id` | Get environment by ID |
| PUT | `/api/environments/:id` | Update environment |
| DELETE | `/api/environments/:id` | Delete environment |
| POST | `/api/environments/:id/sync` | Sync environment config |
| GET | `/api/environments/:id/variables` | Get environment variables |
| PUT | `/api/environments/:id/variables` | Update environment variables |

### Environment Data Types

```typescript
interface Environment {
  id: string;
  projectId: string;
  name: 'dev' | 'test' | 'staging' | 'production';
  config?: {
    databaseUrl?: string;
    apiUrl?: string;
    services?: Record<string, any>;
    envVars?: Record<string, string>;
    featureFlags?: Record<string, boolean>;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

---

## SUMMARY

### Total Counts by Module

**Planning Module:**
- UI Pages: 6
- UI Components: 20+ (10 specific + shared)
- API Endpoints: 14

**Project Management Module:**
- UI Pages: 7
- UI Components: 22+ (10 specific + shared)
- API Endpoints: 11

**Task Management Module:**
- UI Pages: 7
- UI Components: 23+ (11 specific + shared)
- API Endpoints: 15

**Roadmap Management Module:**
- UI Pages: 8
- UI Components: 24+ (13 specific + shared)
- API Endpoints: 24

**Module Detection Module:**
- UI Pages: 4
- UI Components: 11+ (5 specific + shared)
- API Endpoints: 9

**Environment Management Module:**
- UI Pages: 4
- UI Components: 13+ (5 specific + shared)
- API Endpoints: 8

### Grand Totals

- **Total UI Pages:** 36
- **Total UI Components:** 113+ (54 specific + 59+ shared)
- **Total API Endpoints:** 81
