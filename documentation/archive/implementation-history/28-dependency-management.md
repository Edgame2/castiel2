# Dependency Management Module

**Category:** Productivity & Workflow  
**Location:** `src/core/dependencies/`  
**Last Updated:** 2025-01-27

---

## Overview

The Dependency Management Module provides cross-team dependency tracking, dependency declaration, health scoring, SLA tracking, visualization, and task integration for the Coder IDE.

## Purpose

- Cross-team dependency tracking
- Dependency declaration
- Dependency health scoring
- SLA tracking
- Dependency visualization
- Task integration
- Blocking detection

---

## Key Components

### 1. Dependency Declaration Manager (`DependencyDeclarationManager.ts`)

**Location:** `src/core/dependencies/DependencyDeclarationManager.ts`

**Purpose:** Dependency declaration

**Features:**
- Declare team/service dependencies
- Dependency types
- Contract definition
- SLA definition

**Key Methods:**
```typescript
async declareDependency(dependency: Omit<TeamDependency, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamDependency>
async getDependency(dependencyId: string): Promise<TeamDependency | null>
async updateDependencyStatus(dependencyId: string, status: DependencyStatus): Promise<TeamDependency>
```

### 2. Dependency Health Scorer (`DependencyHealthScorer.ts`)

**Location:** `src/core/dependencies/DependencyHealthScorer.ts`

**Purpose:** Score dependency health

**Features:**
- Health score calculation
- Health factors
- Trend analysis
- Health recommendations

**Key Methods:**
```typescript
async scoreDependencyHealth(dependencyId: string): Promise<DependencyHealth>
```

### 3. SLA Tracker (`SLATracker.ts`)

**Location:** `src/core/dependencies/SLATracker.ts`

**Purpose:** Track SLA compliance

**Features:**
- SLA metric tracking
- Compliance calculation
- SLA status monitoring
- Breach detection

**Key Methods:**
```typescript
async trackSLA(dependencyId: string, metric: SLAMetric): Promise<void>
async getSLACompliance(dependencyId: string): Promise<number>
async checkSLABreaches(dependencyId: string): Promise<SLABreach[]>
```

### 4. Dependency Visualizer (`DependencyVisualizer.ts`)

**Location:** `src/core/dependencies/DependencyVisualizer.ts`

**Purpose:** Visualize dependencies

**Features:**
- Dependency graph generation
- Node visualization
- Edge visualization
- Blocking visualization

**Key Methods:**
```typescript
async buildDependencyGraph(projectId: string): Promise<DependencyGraph>
```

### 5. Cross-Team Task Dependency Tracker (`CrossTeamTaskDependencyTracker.ts`)

**Location:** `src/core/dependencies/CrossTeamTaskDependencyTracker.ts`

**Purpose:** Track cross-team task dependencies

**Features:**
- Link tasks to dependencies
- Task dependency tracking
- Status updates
- Auto-creation

**Key Methods:**
```typescript
async linkTaskToDependency(taskId: string, dependencyId: string): Promise<void>
async getCrossTeamTaskDependencies(dependencyId: string): Promise<TaskDependency[]>
```

---

## Dependency Model

### Team Dependency Structure

```typescript
interface TeamDependency {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  projectId?: string;
  dependencyType: 'api' | 'data' | 'service' | 'infrastructure';
  description?: string;
  contract?: Record<string, any>;
  status: 'active' | 'blocked' | 'resolved';
  blocking: boolean;
  sla?: Record<string, any>;
  slaStatus?: 'on_track' | 'at_risk' | 'breached';
  createdAt: Date;
  updatedAt: Date;
}
```

### Dependency Types

- `api` - API dependency
- `data` - Data dependency
- `service` - Service dependency
- `infrastructure` - Infrastructure dependency

---

## Dependency Operations

### Declare Dependency

```typescript
// Declare dependency
const dependency = await declarationManager.declareDependency({
  fromTeamId: 'team-frontend',
  toTeamId: 'team-api',
  projectId: projectId,
  dependencyType: 'api',
  description: 'Frontend depends on API for user data',
  contract: {
    endpoint: '/api/users',
    version: 'v1',
    responseFormat: 'json',
  },
  blocking: false,
  sla: {
    responseTime: '200ms',
    availability: '99.9%',
  },
});
```

### Update Status

```typescript
// Update dependency status
const updated = await declarationManager.updateDependencyStatus(
  dependencyId,
  'blocked'
);
```

---

## Health Scoring

### Health Score Calculation

**Health Factors:**
- Status (30%) - Active vs blocked
- Blocking (30%) - Is dependency blocking
- SLA Compliance (20%) - SLA compliance rate
- Contract (20%) - Contract completeness

**Health Score:**
- Weighted average of factors
- 0.0 - 1.0 scale
- Trend analysis

### Health Score

```typescript
interface DependencyHealth {
  dependencyId: string;
  healthScore: number; // 0.0 - 1.0
  factors: HealthFactor[];
  trend: 'improving' | 'stable' | 'degrading';
  lastChecked: Date;
}
```

---

## SLA Tracking

### SLA Metrics

```typescript
interface SLAMetric {
  dependencyId: string;
  metricName: string;
  value: number;
  target: number;
  unit: string;
  measuredAt: Date;
}
```

### SLA Compliance

```typescript
// Track SLA metric
await slaTracker.trackSLA(dependencyId, {
  metricName: 'response_time',
  value: 150, // ms
  target: 200, // ms
  unit: 'ms',
  measuredAt: new Date(),
});

// Get compliance
const compliance = await slaTracker.getSLACompliance(dependencyId);
// Returns: 0.0 - 1.0

// Check breaches
const breaches = await slaTracker.checkSLABreaches(dependencyId);
```

---

## Dependency Visualization

### Dependency Graph

```typescript
interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

interface DependencyNode {
  teamId: string;
  teamName: string;
  dependencies: string[]; // Team IDs this team depends on
  dependents: string[]; // Team IDs that depend on this team
  blockingCount: number;
  blockedCount: number;
}
```

### Build Graph

```typescript
// Build dependency graph
const graph = await visualizer.buildDependencyGraph(projectId);

// Visualize
// - Nodes represent teams
// - Edges represent dependencies
// - Colors indicate health/blocking status
```

---

## Task Integration

### Link Tasks to Dependencies

```typescript
// Link task to dependency
await taskTracker.linkTaskToDependency(
  taskId,
  dependencyId
);

// Get cross-team task dependencies
const taskDeps = await taskTracker.getCrossTeamTaskDependencies(
  dependencyId
);
```

---

## Usage Examples

### Declare and Track Dependency

```typescript
// Declare dependency
const dependency = await declarationManager.declareDependency({
  fromTeamId: 'team-frontend',
  toTeamId: 'team-api',
  dependencyType: 'api',
  contract: {
    endpoint: '/api/users',
    version: 'v1',
  },
  sla: {
    responseTime: '200ms',
    availability: '99.9%',
  },
});

// Score health
const health = await healthScorer.scoreDependencyHealth(dependency.id);
console.log(`Health Score: ${health.healthScore}`);

// Track SLA
await slaTracker.trackSLA(dependency.id, {
  metricName: 'response_time',
  value: 150,
  target: 200,
  unit: 'ms',
  measuredAt: new Date(),
});
```

### Visualize Dependencies

```typescript
// Build dependency graph
const graph = await visualizer.buildDependencyGraph(projectId);

// Find blocking dependencies
const blocking = graph.nodes.filter(node => node.blockingCount > 0);

// Find blocked teams
const blocked = graph.nodes.filter(node => node.blockedCount > 0);
```

---

## Related Modules

- **Task Management Module** - Task dependencies
- **Release Management Module** - Deployment dependencies
- **Messaging Module** - Dependency notifications

---

## Summary

The Dependency Management Module provides comprehensive cross-team dependency tracking for the Coder IDE. With dependency declaration, health scoring, SLA tracking, visualization, and task integration, it enables effective dependency management throughout the development workflow.
