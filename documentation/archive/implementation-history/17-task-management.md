# Task Management Module

**Category:** Project Management  
**Location:** `src/core/tasks/`  
**Last Updated:** 2025-01-27

---

## Overview

The Task Management Module provides a global task repository with task lifecycle management, assignments, dependencies, and autonomous task assignment capabilities for the Coder IDE.

## Purpose

- Global task repository
- Task CRUD operations
- Task assignments
- Task dependencies
- Task lifecycle management
- Autonomous task assignment
- Task readiness checking

---

## Key Components

### 1. Task Repository (`TaskRepository.ts`)

**Location:** `src/core/tasks/TaskRepository.ts`

**Purpose:** Task data persistence

**Key Methods:**
```typescript
async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>
async getById(taskId: string): Promise<Task | null>
async query(query: TaskQuery): Promise<{ tasks: Task[]; total: number }>
async update(taskId: string, updates: Partial<Task>): Promise<Task>
async delete(taskId: string): Promise<void>
async assignTask(taskId: string, userId: string, assignedBy?: string): Promise<TaskAssignment>
async unassignTask(taskId: string, userId: string): Promise<void>
async addDependency(fromTaskId: string, toTaskId: string, type: 'blocks' | 'related' | 'requires'): Promise<TaskDependency>
async removeDependency(fromTaskId: string, toTaskId: string): Promise<void>
```

### 2. Task Lifecycle Manager (`TaskLifecycleManager.ts`)

**Location:** `src/core/tasks/TaskLifecycleManager.ts`

**Purpose:** Manage task lifecycle

**Features:**
- Task readiness checking
- Auto-assignment
- Status transitions
- Dependency validation

**Key Methods:**
```typescript
async checkTaskReadiness(taskId: string): Promise<TaskReadinessCheck>
async autoAssignTask(taskId: string, userIds?: string[]): Promise<string | null>
```

### 3. IDE Task Assigner (`IDETaskAssigner.ts`)

**Location:** `src/core/tasks/IDETaskAssigner.ts`

**Purpose:** Assign tasks to IDE for autonomous execution

**Features:**
- Autonomous task detection
- IDE user assignment
- Task suitability checking

**Key Methods:**
```typescript
async assignAutonomousTasks(): Promise<string[]>
```

---

## Task Model

### Task Structure

```typescript
interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'refactor' | 'test' | 'documentation';
  status: 'to_do' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  createdBy: string;
  milestoneId?: string;
  epicId?: string;
  storyId?: string;
  environmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Task Status

- `to_do` - Not started
- `in_progress` - Currently being worked on
- `blocked` - Blocked by dependencies
- `review` - Under review
- `done` - Completed

### Task Types

- `feature` - New feature
- `bug` - Bug fix
- `refactor` - Code refactoring
- `test` - Test creation/update
- `documentation` - Documentation

---

## Task Operations

### Create Task

```typescript
const task = await taskRepository.create({
  projectId: 'project-123',
  title: 'Add user authentication',
  description: 'Implement OAuth 2.0 authentication',
  type: 'feature',
  status: 'to_do',
  priority: 'high',
  createdBy: 'user-456',
});
```

### Query Tasks

```typescript
// Query with filters
const result = await taskRepository.query({
  filter: {
    projectId: 'project-123',
    status: 'to_do',
    type: 'feature',
  },
  limit: 20,
  offset: 0,
  order: 'desc',
});

// Returns: { tasks: Task[], total: number }
```

### Update Task

```typescript
const updated = await taskRepository.update(taskId, {
  status: 'in_progress',
  assignedTo: 'user-789',
});
```

### Delete Task

```typescript
await taskRepository.delete(taskId);
```

---

## Task Assignments

### Assign Task

```typescript
// Assign task to user
const assignment = await taskRepository.assignTask(
  taskId,
  userId,
  assignedBy // Optional
);
```

### Unassign Task

```typescript
// Unassign task from user
await taskRepository.unassignTask(taskId, userId);
```

### Get User Tasks

```typescript
// Get tasks assigned to user
const tasks = await taskRepository.getTasksForUser(userId, 'to_do');
```

### Auto-Assignment

```typescript
// Auto-assign based on skills and capacity
const assignedUserId = await lifecycleManager.autoAssignTask(taskId);

// Or assign to IDE for autonomous execution
const ideAssigner = new IDETaskAssigner(...);
const assignedTaskIds = await ideAssigner.assignAutonomousTasks();
```

---

## Task Dependencies

### Dependency Types

- `blocks` - Task blocks another task
- `related` - Tasks are related
- `requires` - Task requires another task

### Add Dependency

```typescript
// Add dependency
await taskRepository.addDependency(
  fromTaskId, // Task that depends on
  toTaskId,   // Task that is depended on
  'blocks'    // Dependency type
);
```

### Remove Dependency

```typescript
// Remove dependency
await taskRepository.removeDependency(fromTaskId, toTaskId);
```

### Check Readiness

```typescript
// Check if task is ready to start
const readiness = await lifecycleManager.checkTaskReadiness(taskId);

// Readiness includes:
// - isReady: boolean
// - reasons: string[]
// - blockingTasks: string[]
// - missingHumanActions: string[]
// - environmentReady: boolean
```

---

## Task Lifecycle

### Status Transitions

**Valid Transitions:**
- `to_do` → `in_progress`
- `in_progress` → `review`
- `in_progress` → `blocked`
- `blocked` → `in_progress`
- `review` → `done`
- `review` → `in_progress` (if changes needed)

### Lifecycle Events

- Task created
- Task assigned
- Task started
- Task blocked
- Task unblocked
- Task completed

---

## Autonomous Task Assignment

### IDE User

The IDE has a special user account for autonomous task execution:

```typescript
const ideUserId = await ideUserProfile.ensureIDEUser();
```

### Suitable Tasks

Tasks suitable for autonomous execution:
- Clear requirements
- No human decisions needed
- Code generation tasks
- Well-defined scope

### Assignment Process

```typescript
// Assign autonomous tasks
const assignedTaskIds = await ideAssigner.assignAutonomousTasks();

// Process:
// 1. Find suitable tasks
// 2. Check readiness
// 3. Assign to IDE user
// 4. Return assigned task IDs
```

---

## Task Readiness

### Readiness Checks

**Dependencies:**
- All blocking tasks completed
- No blocking dependencies

**Human Actions:**
- No pending human actions
- All approvals received

**Environment:**
- Environment configured
- Environment ready

**Resources:**
- Required resources available
- Access permissions granted

---

## Integration Points

### Roadmap Integration

- Tasks linked to stories
- Stories linked to epics
- Epics linked to milestones
- Progress tracking

### Planning Integration

- Tasks created from plans
- Plan steps become tasks
- Task status updates plan

### Execution Integration

- Tasks executed by IDE
- Execution status updates task
- Task completion triggers next steps

---

## Usage Examples

### Create Task with Dependencies

```typescript
// Create tasks
const task1 = await taskRepository.create({
  projectId: 'project-123',
  title: 'Setup database',
  type: 'feature',
  status: 'to_do',
  createdBy: 'user-456',
});

const task2 = await taskRepository.create({
  projectId: 'project-123',
  title: 'Create API endpoints',
  type: 'feature',
  status: 'to_do',
  createdBy: 'user-456',
});

// Add dependency: task2 requires task1
await taskRepository.addDependency(task2.id, task1.id, 'requires');
```

### Check Task Readiness

```typescript
// Check if task is ready
const readiness = await lifecycleManager.checkTaskReadiness(taskId);

if (readiness.isReady) {
  // Start task
  await taskRepository.update(taskId, { status: 'in_progress' });
} else {
  // Show blocking reasons
  console.log('Task not ready:', readiness.reasons);
  console.log('Blocking tasks:', readiness.blockingTasks);
}
```

### Assign Autonomous Tasks

```typescript
// Assign tasks to IDE for autonomous execution
const ideAssigner = new IDETaskAssigner(
  taskRepository,
  lifecycleManager,
  ideUserProfile
);

const assignedTaskIds = await ideAssigner.assignAutonomousTasks();

// IDE will execute these tasks automatically
```

---

## Related Modules

- **Project Management Module** - Tasks linked to projects
- **Roadmap Management Module** - Tasks linked to roadmap items
- **Execution Module** - Executes tasks
- **Planning Module** - Creates tasks from plans

---

## Summary

The Task Management Module provides comprehensive task lifecycle management for the Coder IDE. With task CRUD operations, assignments, dependencies, readiness checking, and autonomous assignment, it enables efficient task tracking and execution throughout the development workflow.
