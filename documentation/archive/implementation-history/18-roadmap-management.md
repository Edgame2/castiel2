# Roadmap Management Module

**Category:** Project Management  
**Location:** `src/core/roadmap/`  
**Last Updated:** 2025-01-27

---

## Overview

The Roadmap Management Module provides multi-level roadmap hierarchy management (Milestones → Epics → Stories) with task integration, progress tracking, and AI-powered task generation for the Coder IDE.

## Purpose

- Multi-level roadmap hierarchy
- Milestone, Epic, and Story management
- Roadmap progress tracking
- Task integration
- Dependency analysis
- AI-powered task generation

---

## Key Components

### 1. Roadmap Manager (`RoadmapManager.ts`)

**Location:** `src/core/roadmap/RoadmapManager.ts`

**Purpose:** Roadmap CRUD operations

**Key Methods:**
```typescript
async createRoadmap(projectId: string, name: string, description?: string): Promise<Roadmap>
async getRoadmap(roadmapId: string): Promise<Roadmap | null>
async listRoadmaps(projectId: string): Promise<Roadmap[]>
async updateRoadmap(roadmapId: string, updates: Partial<Roadmap>): Promise<Roadmap>
async deleteRoadmap(roadmapId: string): Promise<void>
async addMilestone(roadmapId: string, name: string, description?: string, targetDate?: Date): Promise<Milestone>
async addEpic(milestoneId: string, name: string, description?: string): Promise<Epic>
async addStory(epicId: string, name: string, description?: string): Promise<Story>
async trackProgress(roadmapId: string): Promise<number>
```

### 2. Roadmap Storage (`RoadmapStorage.ts`)

**Location:** `src/core/roadmap/RoadmapStorage.ts`

**Purpose:** Roadmap data persistence with versioning

**Features:**
- Roadmap versioning
- Hierarchy storage
- Progress tracking
- History management

### 3. Roadmap Task Integrator (`RoadmapTaskIntegrator.ts`)

**Location:** `src/core/roadmap/RoadmapTaskIntegrator.ts`

**Purpose:** Integrate roadmaps with tasks

**Features:**
- Link tasks to stories
- Progress calculation
- Tree structure generation
- Task aggregation

**Key Methods:**
```typescript
async getRoadmapTree(roadmapId: string): Promise<RoadmapTree>
async linkTaskToStory(taskId: string, storyId: string): Promise<void>
```

### 4. Task Generator (`TaskGenerator.ts`)

**Location:** `src/core/roadmap/TaskGenerator.ts`

**Purpose:** AI-powered task generation from roadmap items

**Features:**
- Generate stories from epics
- Generate tasks from stories
- Validation
- Human review requirement

**Key Methods:**
```typescript
async generateStoriesFromEpic(epicId: string, projectId: string): Promise<TaskGenerationResult>
async generateTasksFromStory(storyId: string, projectId: string): Promise<TaskGenerationResult>
```

### 5. Roadmap Dependency Analyzer (`RoadmapDependencyAnalyzer.ts`)

**Location:** `src/core/roadmap/RoadmapDependencyAnalyzer.ts`

**Purpose:** Analyze dependencies across roadmap levels

**Features:**
- Dependency graph building
- Circular dependency detection
- Critical path analysis
- Dependency visualization

---

## Roadmap Hierarchy

### Structure

```
Roadmap
  └── Milestone
      └── Epic
          └── Story
              └── Task
```

### Roadmap Model

```typescript
interface Roadmap {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Milestone Model

```typescript
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
```

### Epic Model

```typescript
interface Epic {
  id: string;
  milestoneId: string;
  name: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
```

### Story Model

```typescript
interface Story {
  id: string;
  epicId: string;
  name: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Roadmap Operations

### Create Roadmap

```typescript
const roadmap = await roadmapManager.createRoadmap(
  projectId,
  'Q1 2025 Roadmap',
  'First quarter roadmap'
);
```

### Add Milestone

```typescript
const milestone = await roadmapManager.addMilestone(
  roadmapId,
  'MVP Launch',
  'Minimum viable product launch',
  new Date('2025-03-31')
);
```

### Add Epic

```typescript
const epic = await roadmapManager.addEpic(
  milestoneId,
  'User Authentication',
  'Complete authentication system'
);
```

### Add Story

```typescript
const story = await roadmapManager.addStory(
  epicId,
  'OAuth Integration',
  'Integrate OAuth 2.0 providers'
);
```

### Load Hierarchy

```typescript
const hierarchy = await roadmapStorage.loadRoadmapHierarchy(roadmapId);

// Returns:
// - roadmap: Roadmap
// - milestones: Milestone[]
// - epics: Epic[]
// - stories: Story[]
```

---

## Progress Tracking

### Progress Calculation

```typescript
// Track roadmap progress
const progress = await roadmapManager.trackProgress(roadmapId);

// Progress is calculated based on:
// - Completed stories / total stories
// - Completed epics / total epics
// - Completed milestones / total milestones
```

### Progress Tree

```typescript
// Get roadmap tree with progress
const tree = await integrator.getRoadmapTree(roadmapId);

// Tree includes:
// - Roadmap progress
// - Milestone progress
// - Epic progress
// - Story progress
// - Task status
```

---

## Task Integration

### Link Task to Story

```typescript
// Link task to story
await integrator.linkTaskToStory(taskId, storyId);

// Task is now part of story
// Story progress updates based on task completion
```

### Task Generation

#### Generate Stories from Epic

```typescript
// Generate 3-7 stories from epic
const result = await taskGenerator.generateStoriesFromEpic(epicId, projectId);

// Result includes:
// - generated: Story[]
// - requiresReview: boolean (always true)
// - validationPassed: boolean
```

#### Generate Tasks from Story

```typescript
// Generate 5-10 tasks from story
const result = await taskGenerator.generateTasksFromStory(storyId, projectId);

// Result includes:
// - generated: Task[]
// - requiresReview: boolean (always true)
// - validationPassed: boolean
```

### Generation Process

1. **LLM Prompt** - Build prompt from epic/story
2. **Generation** - Generate items using AI
3. **Parsing** - Parse LLM response
4. **Validation** - Validate generated items
5. **Review** - Require human review

---

## Dependency Analysis

### Dependency Graph

```typescript
// Build dependency graph
const graph = await analyzer.buildDependencyGraph(roadmapId);

// Graph includes:
// - Nodes: Milestones, Epics, Stories
// - Edges: Dependencies
// - Types: Temporal, Hierarchical, Functional
```

### Dependency Types

- **Temporal** - Time-based (milestone order)
- **Hierarchical** - Parent-child (epic → story)
- **Functional** - Functional dependencies

### Critical Path

```typescript
// Find critical path
const criticalPath = await analyzer.findCriticalPath(roadmapId);

// Critical path shows:
// - Longest dependency chain
// - Bottlenecks
// - Risk areas
```

---

## Roadmap Versioning

### Version Management

Roadmaps support versioning:
- Save roadmap versions
- Track changes
- Rollback to previous versions
- Compare versions

### Version Storage

```typescript
// Save roadmap version
await roadmapStorage.saveRoadmap(roadmap);

// Automatically creates version
// Tracks changes
// Stores history
```

---

## Usage Examples

### Create Full Hierarchy

```typescript
// Create roadmap
const roadmap = await roadmapManager.createRoadmap(
  projectId,
  '2025 Roadmap'
);

// Add milestone
const milestone = await roadmapManager.addMilestone(
  roadmap.id,
  'Q1 Launch',
  new Date('2025-03-31')
);

// Add epic
const epic = await roadmapManager.addEpic(
  milestone.id,
  'Core Features'
);

// Add story
const story = await roadmapManager.addStory(
  epic.id,
  'User Registration'
);

// Generate tasks from story
const taskResult = await taskGenerator.generateTasksFromStory(
  story.id,
  projectId
);

// Review and create tasks
for (const task of taskResult.generated) {
  await taskRepository.create({
    projectId,
    storyId: story.id,
    title: task.name,
    description: task.description,
    type: 'feature',
    status: 'to_do',
    createdBy: userId,
  });
}
```

### Track Progress

```typescript
// Get roadmap tree with progress
const tree = await integrator.getRoadmapTree(roadmapId);

console.log(`Roadmap: ${tree.roadmap.progress}%`);
for (const milestone of tree.milestones) {
  console.log(`  Milestone ${milestone.name}: ${milestone.progress}%`);
  for (const epic of milestone.epics) {
    console.log(`    Epic ${epic.name}: ${epic.progress}%`);
    for (const story of epic.stories) {
      console.log(`      Story ${story.name}: ${story.progress}%`);
    }
  }
}
```

---

## Related Modules

- **Task Management Module** - Tasks linked to stories
- **Project Management Module** - Roadmaps linked to projects
- **Planning Module** - Roadmaps inform planning
- **Model Integration Module** - AI task generation

---

## Summary

The Roadmap Management Module provides comprehensive multi-level roadmap management for the Coder IDE. With Milestones → Epics → Stories hierarchy, progress tracking, task integration, and AI-powered task generation, it enables structured project planning and execution.
