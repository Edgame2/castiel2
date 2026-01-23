# Calendar & Planning Module

**Category:** Productivity & Workflow  
**Location:** `src/core/calendar/`, `src/renderer/contexts/CalendarContext.tsx`  
**Last Updated:** 2025-01-27

---

## Overview

The Calendar & Planning Module provides calendar integration and planning coordination for the Coder IDE. It manages calendar events derived from plans, agents, and human actions, with automatic event creation and conflict detection.

## Purpose

- Calendar event management
- Plan-bound scheduling
- Agent execution scheduling
- Human action coordination
- Conflict detection
- Environment time rules
- Timeline prediction

---

## Key Components

### 1. Calendar Event Manager (`CalendarEventManager.ts`)

**Location:** `src/core/calendar/CalendarEventManager.ts`

**Purpose:** Core calendar event management

**Key Methods:**
```typescript
async createEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent>
async getEvent(eventId: string): Promise<CalendarEvent | null>
async listEvents(query: EventQuery): Promise<CalendarEvent[]>
async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent>
async deleteEvent(eventId: string): Promise<void>
```

### 2. Plan-Bound Scheduler (`PlanBoundScheduler.ts`)

**Location:** `src/core/calendar/PlanBoundScheduler.ts`

**Purpose:** Automatic event creation from plan steps

**Features:**
- Plan step → Calendar event
- Start constraints
- Deadlines
- Blocking dependencies
- Time windows per environment

**Key Methods:**
```typescript
async createEventsFromPlanStep(planStep: PlanStep, projectId: string, constraints?: PlanStepSchedulingConstraints): Promise<CalendarEvent[]>
```

### 3. Agent Scheduler (`AgentScheduler.ts`)

**Location:** `src/core/calendar/AgentScheduler.ts`

**Purpose:** Schedule agent execution windows

**Features:**
- Agent execution scheduling
- Optimal window finding
- Resource contention optimization
- Cost window optimization

**Key Methods:**
```typescript
async scheduleAgentExecution(agentId: string, agentDefinition: AgentDefinition, projectId: string, preferences?: AgentExecutionPreferences): Promise<AgentSchedulingResult>
```

### 4. Conflict Detector (`ConflictDetector.ts`)

**Location:** `src/core/calendar/ConflictDetector.ts`

**Purpose:** Detect scheduling conflicts

**Features:**
- Time conflict detection
- Resource conflict detection
- Dependency conflict detection
- Conflict resolution suggestions

### 5. Environment Time Rules (`EnvironmentTimeRules.ts`)

**Location:** `src/core/calendar/EnvironmentTimeRules.ts`

**Purpose:** Environment-specific time rules

**Features:**
- Allowed hours per environment
- Time window validation
- Environment-specific scheduling

### 6. Timeline Predictor (`TimelinePredictor.ts`)

**Location:** `src/core/calendar/TimelinePredictor.ts`

**Purpose:** Predict execution timelines

**Features:**
- Timeline estimation
- Dependency analysis
- Resource availability
- Risk assessment

---

## Calendar Events

### Event Types

- `human_action` - Human-required actions
- `agent_execution` - Agent execution windows
- `deployment` - Deployment events
- `review` - Code review events
- `meeting` - Meeting events
- `approval` - Approval events
- `decision` - Decision events

### Event Model

```typescript
interface CalendarEvent {
  id: string;
  projectId: string;
  userId?: string;
  agentId?: string;
  environmentId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  planId?: string;
  planStepId?: string;
  eventType: CalendarEventType;
  environmentName?: string;
  timeRules?: EnvironmentTimeRule;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Plan-Bound Scheduling

### Automatic Event Creation

Calendar events are automatically created from plan steps:

```typescript
// Plan step with constraints
const step: PlanStep = {
  id: 'step-1',
  title: 'Implement authentication',
  estimatedTime: 8, // hours
  dependencies: ['step-0'],
};

// Create events from plan step
const events = await planBoundScheduler.createEventsFromPlanStep(
  step,
  projectId,
  {
    startConstraints: {
      earliestStart: new Date('2025-01-28'),
      mustStartAfter: ['step-0'],
    },
    deadlines: {
      softDeadline: new Date('2025-02-05'),
      hardDeadline: new Date('2025-02-10'),
    },
    timeWindows: {
      dev: { allowedHours: ['09:00-17:00'] },
      prod: { allowedHours: ['02:00-04:00'] }, // Maintenance window
    },
  }
);
```

### Scheduling Constraints

**Start Constraints:**
- `earliestStart` - Earliest allowed start time
- `mustStartAfter` - Must start after step IDs

**Deadlines:**
- `hardDeadline` - Hard deadline
- `softDeadline` - Soft deadline

**Time Windows:**
- Environment-specific allowed hours
- Maintenance windows
- Business hours

---

## Agent Scheduling

### Agent Execution Windows

```typescript
// Schedule agent execution
const result = await agentScheduler.scheduleAgentExecution(
  agentId,
  agentDefinition,
  projectId,
  {
    resourceConstraints: {
      maxConcurrent: 3,
      preferredTime: 'off-hours',
    },
    costOptimization: true,
  }
);

// Result includes:
// - event: CalendarEvent
// - conflicts: number
// - optimized: boolean
// - reasoning: string
```

### Optimization Factors

- **Parallelism** - Maximize parallel execution
- **Resource Contention** - Minimize resource conflicts
- **Cost Windows** - Schedule during cost-effective times
- **Dependencies** - Respect step dependencies

---

## Human Action Coordination

### Human Action Events

Human-required actions automatically create calendar events:

```typescript
// Human action creates calendar event
const humanAction = {
  id: 'action-1',
  taskId: 'task-123',
  title: 'Approve deployment',
  timing: 'before_start',
  assignedTo: 'user-456',
};

// Calendar event created automatically
const event = await calendarManager.createEvent({
  projectId,
  title: humanAction.title,
  eventType: 'human_action',
  userId: humanAction.assignedTo,
  startTime: calculatedStartTime,
  endTime: calculatedEndTime,
  metadata: {
    humanActionId: humanAction.id,
    taskId: humanAction.taskId,
  },
});
```

---

## Conflict Detection

### Conflict Types

- **Time Conflicts** - Overlapping events
- **Resource Conflicts** - Same resource used
- **Dependency Conflicts** - Circular dependencies
- **Environment Conflicts** - Environment unavailable

### Conflict Detection

```typescript
// Detect conflicts
const conflicts = await conflictDetector.detectConflicts(event);

// Conflicts include:
// - type: ConflictType
// - severity: 'low' | 'medium' | 'high'
// - conflictingEvent: CalendarEvent
// - resolution: ConflictResolution
```

---

## Environment Time Rules

### Time Rule Definition

```typescript
interface EnvironmentTimeRule {
  environment: 'dev' | 'test' | 'staging' | 'production';
  allowedHours: string[]; // e.g., ['09:00-17:00', '20:00-22:00']
  blockedDays?: string[]; // e.g., ['saturday', 'sunday']
  timezone: string;
}
```

### Time Rule Validation

```typescript
// Validate time against rules
const validation = await environmentTimeRules.validate(
  event.startTime,
  'production',
  timeRules
);

if (!validation.isValid) {
  // Adjust time to valid window
  const adjustedTime = validation.suggestedTime;
}
```

---

## Timeline Prediction

### Timeline Estimation

```typescript
// Predict timeline
const timeline = await timelinePredictor.predict({
  planSteps: steps,
  dependencies: dependencies,
  resourceAvailability: availability,
  riskFactors: risks,
});

// Timeline includes:
// - estimatedStart: Date
// - estimatedEnd: Date
// - confidence: number
// - riskLevel: 'low' | 'medium' | 'high'
// - criticalPath: Step[]
```

---

## Usage Examples

### Create Event from Plan Step

```typescript
const events = await planBoundScheduler.createEventsFromPlanStep(
  planStep,
  projectId,
  {
    startConstraints: {
      mustStartAfter: ['step-0'],
    },
    deadlines: {
      softDeadline: new Date('2025-02-05'),
    },
    timeWindows: {
      dev: { allowedHours: ['09:00-17:00'] },
    },
    estimatedDuration: 8,
  }
);
```

### Schedule Agent Execution

```typescript
const result = await agentScheduler.scheduleAgentExecution(
  'agent-123',
  agentDefinition,
  projectId,
  {
    resourceConstraints: {
      maxConcurrent: 2,
    },
    costOptimization: true,
  }
);

console.log(`Scheduled: ${result.event.title}`);
console.log(`Conflicts: ${result.conflicts}`);
console.log(`Optimized: ${result.optimized}`);
```

### Detect Conflicts

```typescript
const conflicts = await conflictDetector.detectConflicts(event);

if (conflicts.length > 0) {
  console.warn('Conflicts detected:');
  for (const conflict of conflicts) {
    console.warn(`  ${conflict.type}: ${conflict.severity}`);
    console.warn(`  Resolution: ${conflict.resolution.suggestion}`);
  }
}
```

---

## Related Modules

- **Planning Module** - Provides plans for scheduling
- **Execution Module** - Uses scheduled events
- **Task Management Module** - Tasks linked to events
- **Agent Module** - Agent execution scheduling

---

## Summary

The Calendar & Planning Module provides comprehensive calendar integration and planning coordination for the Coder IDE. With automatic event creation from plans, agent scheduling, conflict detection, and environment time rules, it enables efficient scheduling and coordination of development activities.
