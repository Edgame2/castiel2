# Release Management Module

**Category:** Productivity & Workflow  
**Location:** `src/core/releases/`  
**Last Updated:** 2025-01-27

---

## Overview

The Release Management Module provides release planning, multi-service coordination, environment promotion, deployment pipelines, blue-green deployments, and release train scheduling for the Coder IDE.

## Purpose

- Release planning
- Multi-service coordination
- Environment promotion
- Deployment pipelines
- Blue-green deployments
- Release train scheduling
- Roadmap integration

---

## Key Components

### 1. Release Manager (`ReleaseManager.ts`)

**Location:** `src/core/releases/ReleaseManager.ts`

**Purpose:** Core release management

**Features:**
- Release creation
- Multi-service coordination
- Release status tracking
- Risk assessment

**Key Methods:**
```typescript
async createRelease(name: string, version: string, options?: ReleaseOptions): Promise<{ release: Release; conversationId: string }>
async getRelease(releaseId: string): Promise<Release | null>
async updateRelease(releaseId: string, updates: ReleaseUpdates): Promise<Release>
```

### 2. Environment Promotion Manager (`EnvironmentPromotionManager.ts`)

**Location:** `src/core/releases/EnvironmentPromotionManager.ts`

**Purpose:** Environment promotion

**Features:**
- Promote through environments
- Environment order validation
- Deployment tracking

**Key Methods:**
```typescript
async promoteToEnvironment(releaseId: string, targetEnvironment: string, pipelineId?: string): Promise<Deployment>
async getPromotionPath(releaseId: string): Promise<PromotionPath>
```

### 3. Deployment Pipeline Manager (`DeploymentPipelineManager.ts`)

**Location:** `src/core/releases/DeploymentPipelineManager.ts`

**Purpose:** Deployment pipeline management

**Features:**
- Pipeline definition
- Pipeline execution
- Step management

### 4. Dependency-Aware Deployment Manager (`DependencyAwareDeploymentManager.ts`)

**Location:** `src/core/releases/DependencyAwareDeploymentManager.ts`

**Purpose:** Dependency-aware deployment

**Features:**
- Deployment order calculation
- Dependency resolution
- Topological sorting

**Key Methods:**
```typescript
async calculateDeploymentOrder(releaseId: string): Promise<DeploymentOrder[]>
```

### 5. Blue-Green Deployment Manager (`BlueGreenDeploymentManager.ts`)

**Location:** `src/core/releases/BlueGreenDeploymentManager.ts`

**Purpose:** Blue-green deployment management

**Features:**
- Blue-green setup
- Traffic switching
- Rollback support

### 6. Release Train Scheduler (`ReleaseTrainScheduler.ts`)

**Location:** `src/core/releases/ReleaseTrainScheduler.ts`

**Purpose:** Release train scheduling

**Features:**
- Scheduled releases
- Release train management
- Train schedule

### 7. Release Roadmap Linker (`ReleaseRoadmapLinker.ts`)

**Location:** `src/core/releases/ReleaseRoadmapLinker.ts`

**Purpose:** Link releases to roadmaps

**Features:**
- Roadmap integration
- Milestone linking
- Progress tracking

---

## Release Model

### Release Structure

```typescript
interface Release {
  id: string;
  projectId?: string;
  name: string;
  version: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'deployed' | 'cancelled';
  services?: string[]; // Multi-service coordination
  plannedStart?: Date;
  plannedEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  riskScore?: number; // 0-1
  riskFactors?: Record<string, any>;
  releaseNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Deployment Model

```typescript
interface Deployment {
  id: string;
  releaseId?: string;
  projectId?: string;
  environment: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  pipelineId?: string;
  startedAt?: Date;
  completedAt?: Date;
  rolledBackAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Release Operations

### Create Release

```typescript
// Create release
const { release, conversationId } = await releaseManager.createRelease(
  'Q1 Release',
  '1.2.0',
  {
    projectId: projectId,
    description: 'Major feature release',
    services: ['api', 'frontend', 'worker'],
    plannedStart: new Date('2025-02-01'),
    plannedEnd: new Date('2025-02-01'),
  }
);

// Automatically:
// - Creates conversation
// - Creates calendar event
```

### Environment Promotion

```typescript
// Promote through environments
const devDeployment = await promotionManager.promoteToEnvironment(
  releaseId,
  'dev'
);

const testDeployment = await promotionManager.promoteToEnvironment(
  releaseId,
  'test'
);

const stagingDeployment = await promotionManager.promoteToEnvironment(
  releaseId,
  'staging'
);

const prodDeployment = await promotionManager.promoteToEnvironment(
  releaseId,
  'production'
);
```

---

## Deployment Order

### Dependency-Aware Deployment

```typescript
// Calculate deployment order
const order = await deploymentManager.calculateDeploymentOrder(releaseId);

// Order includes:
// - service: string
// - order: number
// - dependencies: string[]
// - ready: boolean

// Deploy in order
for (const item of order) {
  if (item.ready) {
    await deployService(item.service, releaseId);
  }
}
```

---

## Blue-Green Deployment

### Blue-Green Setup

```typescript
// Setup blue-green deployment
const status = await blueGreenManager.setup(
  releaseId,
  environment: 'production'
);

// Switch traffic
await blueGreenManager.switchTraffic(releaseId, 'green');

// Rollback if needed
await blueGreenManager.rollback(releaseId);
```

---

## Release Train

### Release Train Scheduling

```typescript
// Create release train schedule
const schedule = await trainScheduler.createSchedule({
  name: 'Monthly Release Train',
  frequency: 'monthly',
  startDate: new Date('2025-02-01'),
  enabled: true,
});

// Release train automatically creates releases
```

---

## Roadmap Integration

### Link to Roadmap

```typescript
// Link release to roadmap
await roadmapLinker.linkRelease(
  releaseId,
  roadmapId,
  milestoneId
);

// Track progress
const progress = await roadmapLinker.trackProgress(roadmapId);
```

---

## Usage Examples

### Multi-Service Release

```typescript
// Create multi-service release
const release = await releaseManager.createRelease(
  'API v2 Release',
  '2.0.0',
  {
    services: ['api-v2', 'frontend', 'worker'],
    plannedStart: new Date('2025-02-15'),
  }
);

// Calculate deployment order
const order = await deploymentManager.calculateDeploymentOrder(release.id);

// Deploy services in order
for (const item of order) {
  await deployService(item.service, release.id);
}
```

### Environment Promotion Flow

```typescript
// Promote through environments
const environments = ['dev', 'test', 'staging', 'production'];

for (const env of environments) {
  const deployment = await promotionManager.promoteToEnvironment(
    releaseId,
    env
  );
  
  // Wait for deployment to complete
  await waitForDeployment(deployment.id);
  
  // Run tests
  const testsPassed = await runTests(env);
  if (!testsPassed) {
    throw new Error(`Tests failed in ${env}`);
  }
}
```

---

## Related Modules

- **Roadmap Management Module** - Release linking
- **Environment Management Module** - Environment configuration
- **Calendar Module** - Deployment scheduling
- **Messaging Module** - Release notifications

---

## Summary

The Release Management Module provides comprehensive release planning and deployment management for the Coder IDE. With multi-service coordination, environment promotion, dependency-aware deployment, and release train scheduling, it enables efficient release management throughout the development workflow.
