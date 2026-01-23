# Capacity Planning Module

**Category:** Productivity & Workflow  
**Location:** `src/core/capacity/`  
**Last Updated:** 2025-01-27

---

## Overview

The Capacity Planning Module provides resource capacity planning and allocation for the Coder IDE. It includes capacity tracking, forecasting, task allocation, overallocation detection, and roadmap integration.

## Purpose

- Capacity tracking
- Capacity forecasting
- Resource allocation
- Overallocation detection
- Skill-based allocation
- Load balancing
- Roadmap integration

---

## Key Components

### 1. Capacity Tracker (`CapacityTracker.ts`)

**Location:** `src/core/capacity/CapacityTracker.ts`

**Purpose:** Track team capacity

**Features:**
- Track hours available
- Track allocated hours
- Track utilized hours
- Calculate utilization rate

**Key Methods:**
```typescript
async getCapacityForUser(userId: string, weekStart: Date): Promise<CapacitySummary>
async getCapacityForTeam(teamId: string, weekStart: Date): Promise<TeamCapacitySummary>
```

### 2. Capacity Forecaster (`CapacityForecaster.ts`)

**Location:** `src/core/capacity/CapacityForecaster.ts`

**Purpose:** Forecast capacity

**Features:**
- Forecast 1-3 months out
- PTO integration
- Allocation projection
- Capacity trends

**Key Methods:**
```typescript
async forecastCapacity(userId: string, months?: number): Promise<CapacityForecast[]>
```

### 3. Task Capacity Allocator (`TaskCapacityAllocator.ts`)

**Location:** `src/core/capacity/TaskCapacityAllocator.ts`

**Purpose:** Allocate tasks based on capacity

**Features:**
- Auto-allocation
- Capacity checking
- Skill-based allocation
- Allocation suggestions

**Key Methods:**
```typescript
async handleTaskCreated(taskId: string, projectId?: string, estimatedEffort?: number, assignedUserId?: string, teamId?: string): Promise<void>
```

### 4. Overallocation Detector (`OverallocationDetector.ts`)

**Location:** `src/core/capacity/OverallocationDetector.ts`

**Purpose:** Detect overallocation

**Features:**
- Overallocation detection
- Alert generation
- Allocation analysis

**Key Methods:**
```typescript
async detectOverallocation(userId: string, weekStart: Date): Promise<OverallocationAlert | null>
```

### 5. Skill-Based Allocator (`SkillBasedAllocator.ts`)

**Location:** `src/core/capacity/SkillBasedAllocator.ts`

**Purpose:** Skill-based resource allocation

**Features:**
- Skill matching
- Best fit allocation
- Skill gap analysis

### 6. Load Balancer (`LoadBalancer.ts`)

**Location:** `src/core/capacity/LoadBalancer.ts`

**Purpose:** Balance workload

**Features:**
- Workload distribution
- Fair allocation
- Load balancing

### 7. Roadmap Capacity Integrator (`RoadmapCapacityIntegrator.ts`)

**Location:** `src/core/capacity/RoadmapCapacityIntegrator.ts`

**Purpose:** Integrate capacity with roadmaps

**Features:**
- Capacity-aware roadmaps
- Timeline adjustment
- Resource planning

---

## Capacity Tracking

### Capacity Summary

```typescript
interface CapacitySummary {
  userId: string;
  totalCapacity: number; // Hours per week
  allocatedHours: number;
  utilizedHours: number;
  availableHours: number;
  utilizationRate: number; // 0-1
}
```

### Capacity Calculation

```typescript
// Get capacity for user
const capacity = await capacityTracker.getCapacityForUser(
  userId,
  weekStart
);

// Capacity includes:
// - Total capacity (from profile)
// - Allocated hours (from allocations)
// - Utilized hours (from calendar events)
// - Available hours (total - allocated)
// - Utilization rate (utilized / total)
```

---

## Capacity Forecasting

### Forecast Model

```typescript
interface CapacityForecast {
  weekStart: Date;
  weekEnd: Date;
  totalCapacity: number;
  allocatedHours: number;
  ptoHours: number;
  availableHours: number;
  utilizationRate: number;
}
```

### Forecasting

```typescript
// Forecast capacity
const forecasts = await forecaster.forecastCapacity(
  userId,
  3 // 3 months
);

// Forecasts include:
// - Weekly capacity projections
// - PTO adjustments
// - Allocation projections
// - Utilization trends
```

---

## Task Allocation

### Automatic Allocation

```typescript
// Task creation triggers allocation
await allocator.handleTaskCreated(
  taskId,
  projectId,
  8, // estimated hours
  assignedUserId,
  teamId
);

// Automatically:
// - Checks capacity
// - Creates allocation
// - Suggests best fit if no assignment
```

### Allocation Model

```typescript
interface ResourceAllocation {
  id: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  allocatedHours: number;
  startDate: Date;
  endDate: Date;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  utilization: number; // 0-1
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Overallocation Detection

### Overallocation Alert

```typescript
interface OverallocationAlert {
  userId: string;
  userName?: string;
  weekStart: Date;
  totalCapacity: number;
  allocatedHours: number;
  overallocation: number;
  overallocationRate: number;
  allocations: AllocationInfo[];
}
```

### Detection

```typescript
// Detect overallocation
const alert = await detector.detectOverallocation(
  userId,
  weekStart
);

if (alert) {
  console.warn(`User ${alert.userName} is overallocated by ${alert.overallocation} hours`);
}
```

---

## Skill-Based Allocation

### Skill Matching

```typescript
// Suggest allocation based on skills
const suggestions = await skillAllocator.suggestAllocation(
  taskId,
  teamId,
  requiredSkills: ['typescript', 'react']
);

// Suggestions include:
// - Best fit users
// - Skill match scores
// - Capacity availability
```

---

## Roadmap Integration

### Capacity-Aware Roadmaps

```typescript
// Integrate capacity with roadmap
await integrator.integrateCapacity(
  roadmapId,
  {
    adjustTimelines: true,
    checkCapacity: true,
  }
);

// Automatically:
// - Checks capacity for milestones
// - Adjusts timelines if needed
// - Allocates resources
```

---

## Usage Examples

### Track Capacity

```typescript
// Get capacity for user
const capacity = await capacityTracker.getCapacityForUser(
  userId,
  weekStart
);

console.log(`Total: ${capacity.totalCapacity} hours`);
console.log(`Allocated: ${capacity.allocatedHours} hours`);
console.log(`Available: ${capacity.availableHours} hours`);
console.log(`Utilization: ${(capacity.utilizationRate * 100).toFixed(1)}%`);
```

### Forecast Capacity

```typescript
// Forecast 3 months
const forecasts = await forecaster.forecastCapacity(userId, 3);

for (const forecast of forecasts) {
  console.log(`Week ${forecast.weekStart.toDateString()}: ${forecast.availableHours} hours available`);
}
```

### Detect Overallocation

```typescript
// Check for overallocation
const alert = await detector.detectOverallocation(userId, weekStart);

if (alert) {
  // Send notification
  await notifyUser(userId, {
    type: 'overallocation',
    message: `You are overallocated by ${alert.overallocation} hours this week`,
  });
}
```

---

## Related Modules

- **Task Management Module** - Task allocation
- **Roadmap Management Module** - Roadmap integration
- **Calendar Module** - PTO/vacation integration

---

## Summary

The Capacity Planning Module provides comprehensive resource capacity planning for the Coder IDE. With capacity tracking, forecasting, task allocation, overallocation detection, and roadmap integration, it enables effective resource planning throughout the development workflow.
