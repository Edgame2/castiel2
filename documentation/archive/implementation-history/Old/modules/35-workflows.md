# Workflows Module

**Category:** Productivity & Workflow  
**Location:** `src/core/workflows/`  
**Last Updated:** 2025-01-27

---

## Overview

The Workflows Module provides workflow automation for the Coder IDE. It includes workflow definition, trigger management, workflow execution, step orchestration, and human gates.

## Purpose

- Workflow automation
- Event-based triggers
- Scheduled triggers
- Webhook triggers
- Step orchestration
- Human gates
- Workflow execution
- State management

---

## Key Components

### 1. Workflow Trigger Service (`WorkflowTriggerService.ts`)

**Location:** `src/core/workflows/WorkflowTriggerService.ts`

**Purpose:** Handle workflow triggers

**Trigger Types:**
- `manual` - Manual execution
- `event` - Event-based triggers
- `scheduled` - Scheduled triggers (cron)
- `webhook` - Webhook triggers

**Key Methods:**
```typescript
async initialize(): Promise<void>
async triggerWorkflow(workflowId: string, event?: TriggerEvent): Promise<void>
```

### 2. Workflow Execution Engine (`WorkflowExecutionEngine.ts`)

**Location:** `src/core/workflows/WorkflowExecutionEngine.ts`

**Purpose:** Execute workflows

**Features:**
- Step execution
- Dependency management
- State management
- Checkpoint creation
- Error handling
- Rollback support

**Key Methods:**
```typescript
async executeWorkflow(workflowId: string, definition: WorkflowDefinition, context: ExecutionContext): Promise<WorkflowExecutionResult>
```

---

## Workflow Definition

### Workflow Structure

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}
```

### Workflow Step

```typescript
interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'parallel' | 'human_gate';
  action?: string;
  agentId?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  conditions?: Condition[];
  dependencies?: string[]; // Step IDs
  retry?: RetryConfig;
  timeout?: number;
  humanGate?: WorkflowHumanGate;
}
```

### Workflow Trigger

```typescript
interface WorkflowTrigger {
  type: 'manual' | 'event' | 'scheduled' | 'webhook';
  condition?: string; // Expression for conditional triggers
  eventType?: string; // For event-based triggers
  schedule?: string; // Cron expression
  webhookUrl?: string;
  webhookSecret?: string;
}
```

---

## Trigger Types

### Event-Based Triggers

**Event Types:**
- `plan_validated` - Plan validated
- `code_committed` - Code committed
- `test_failed` - Test failed
- `deployment_started` - Deployment started
- `incident_declared` - Incident declared

**Example:**
```typescript
{
  type: 'event',
  eventType: 'plan_validated',
  condition: 'plan.confidence > 0.8',
}
```

### Scheduled Triggers

**Cron Expressions:**
```typescript
{
  type: 'scheduled',
  schedule: '0 0 * * *', // Daily at midnight
}
```

### Webhook Triggers

```typescript
{
  type: 'webhook',
  webhookUrl: 'https://example.com/webhook',
  webhookSecret: 'secret-key',
}
```

---

## Workflow Execution

### Execution State

```typescript
interface WorkflowExecutionState {
  workflowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStepId?: string;
  stepStatuses: Map<string, StepStatus>;
  variables: Record<string, any>;
  checkpoints: Checkpoint[];
  events: WorkflowEvent[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Execution Process

1. **Trigger** - Workflow triggered
2. **Initialization** - Initialize execution state
3. **Step Execution** - Execute steps in order
4. **Dependency Check** - Check step dependencies
5. **Condition Evaluation** - Evaluate step conditions
6. **Checkpoint Creation** - Create checkpoints
7. **Error Handling** - Handle errors
8. **Completion** - Complete workflow

---

## Human Gates

### Human Gate Model

```typescript
interface WorkflowHumanGate {
  message: string;
  requiredApprovers: string[];
  timeout?: number; // Minutes
  onTimeout: 'proceed' | 'cancel' | 'escalate';
}
```

### Human Gate Process

1. **Pause Execution** - Pause at human gate
2. **Request Approval** - Request approval from users
3. **Wait for Response** - Wait for approval/rejection
4. **Resume Execution** - Resume based on response
5. **Timeout Handling** - Handle timeout if no response

---

## Step Types

### Action Steps

- Execute actions
- Call agents
- Run scripts
- API calls

### Condition Steps

- Evaluate conditions
- Branch execution
- Conditional logic

### Parallel Steps

- Execute steps in parallel
- Wait for all to complete
- Aggregate results

### Human Gate Steps

- Pause for human input
- Request approval
- Wait for decision

---

## Usage Examples

### Define Workflow

```typescript
const workflow: WorkflowDefinition = {
  id: 'workflow-1',
  name: 'Deploy on Plan Completion',
  version: '1.0.0',
  trigger: {
    type: 'event',
    eventType: 'plan_completed',
  },
  steps: [
    {
      id: 'step-1',
      name: 'Validate Plan',
      type: 'condition',
      conditions: [
        { field: 'plan.confidence', operator: '>', value: 0.8 },
      ],
    },
    {
      id: 'step-2',
      name: 'Deploy to Staging',
      type: 'action',
      action: 'deploy',
      input: { environment: 'staging' },
      dependencies: ['step-1'],
    },
    {
      id: 'step-3',
      name: 'Request Approval',
      type: 'human_gate',
      humanGate: {
        message: 'Approve production deployment?',
        requiredApprovers: ['manager-1'],
        timeout: 60,
        onTimeout: 'cancel',
      },
      dependencies: ['step-2'],
    },
    {
      id: 'step-4',
      name: 'Deploy to Production',
      type: 'action',
      action: 'deploy',
      input: { environment: 'production' },
      dependencies: ['step-3'],
    },
  ],
};
```

### Execute Workflow

```typescript
// Trigger workflow
await triggerService.triggerWorkflow(workflowId, {
  type: 'plan_completed',
  payload: { planId: 'plan-123' },
  projectId: projectId,
});

// Workflow automatically executes:
// 1. Validates plan
// 2. Deploys to staging
// 3. Requests approval
// 4. Deploys to production (if approved)
```

---

## Related Modules

- **Planning Module** - Plan triggers
- **Execution Module** - Step execution
- **Calendar Module** - Scheduled triggers
- **Messaging Module** - Human gate notifications

---

## Summary

The Workflows Module provides comprehensive workflow automation for the Coder IDE. With event-based, scheduled, and webhook triggers, step orchestration, human gates, and state management, it enables powerful workflow automation throughout the development workflow.
