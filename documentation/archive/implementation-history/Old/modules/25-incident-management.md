# Incident Management Module

**Category:** Productivity & Workflow  
**Location:** `src/core/incidents/`  
**Last Updated:** 2025-01-27

---

## Overview

The Incident Management Module provides incident declaration, tracking, root cause analysis, postmortem management, and action item tracking for the Coder IDE.

## Purpose

- Incident declaration
- Incident tracking
- Root cause analysis
- Postmortem management
- Action item tracking
- Timeline management
- Integration with messaging and calendar

---

## Key Components

### 1. Incident Manager (`IncidentManager.ts`)

**Location:** `src/core/incidents/IncidentManager.ts`

**Purpose:** Core incident management

**Features:**
- Quick incident creation
- Severity classification
- Status tracking
- Timeline management

**Key Methods:**
```typescript
async declareIncident(incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<Incident>
async getIncident(incidentId: string): Promise<Incident | null>
async updateStatus(incidentId: string, status: IncidentStatus): Promise<Incident>
async getIncidentsForProject(projectId: string, options?: IncidentQueryOptions): Promise<Incident[]>
```

### 2. Postmortem Manager (`PostmortemManager.ts`)

**Location:** `src/core/incidents/PostmortemManager.ts`

**Purpose:** Postmortem management

**Features:**
- Postmortem creation
- Timeline reconstruction
- Root cause analysis
- Lessons learned
- Action items

**Key Methods:**
```typescript
async createPostmortem(incidentId: string, postmortem: Omit<Postmortem, 'id' | 'incidentId' | 'createdAt' | 'updatedAt'>): Promise<Postmortem>
async getPostmortem(incidentId: string): Promise<Postmortem | null>
async addLessonLearned(postmortemId: string, lesson: LessonLearned): Promise<void>
```

### 3. Action Item Tracker (`ActionItemTracker.ts`)

**Location:** `src/core/incidents/ActionItemTracker.ts`

**Purpose:** Track action items from incidents

**Features:**
- Action item creation
- Assignment tracking
- Status tracking
- Due date management

**Key Methods:**
```typescript
async createActionItem(actionItem: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActionItem>
async getActionItemsForIncident(incidentId: string): Promise<ActionItem[]>
async updateActionItemStatus(actionItemId: string, status: ActionItemStatus): Promise<ActionItem>
```

### 4. Five Whys Facilitator (`FiveWhysFacilitator.ts`)

**Location:** `src/core/incidents/FiveWhysFacilitator.ts`

**Purpose:** Facilitate root cause analysis using Five Whys

**Features:**
- Five Whys analysis
- Root cause identification
- Question facilitation
- Analysis tracking

**Key Methods:**
```typescript
async conductFiveWhys(incidentId: string, facilitatorId: string): Promise<FiveWhysAnalysis>
async addWhy(analysisId: string, why: string, answeredBy: string): Promise<void>
async identifyRootCause(analysisId: string, rootCause: string): Promise<void>
```

---

## Incident Model

### Incident Structure

```typescript
interface Incident {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  declaredAt: Date;
  resolvedAt?: Date;
  timeline?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Incident Severity

- `critical` - Service down, data loss
- `high` - Major functionality impacted
- `medium` - Partial functionality impacted
- `low` - Minor impact

### Incident Status

- `open` - Incident declared
- `investigating` - Under investigation
- `resolved` - Incident resolved
- `closed` - Incident closed

---

## Incident Operations

### Declare Incident

```typescript
// Declare incident
const incident = await incidentManager.declareIncident({
  projectId: 'project-123',
  title: 'Database connection timeout',
  description: 'Users experiencing slow queries',
  severity: 'high',
  status: 'open',
  declaredAt: new Date(),
});

// Automatically:
// - Creates conversation
// - Creates calendar event
// - Notifies team
```

### Update Status

```typescript
// Update incident status
const updated = await incidentManager.updateStatus(
  incidentId,
  'investigating'
);

// When resolved
const resolved = await incidentManager.updateStatus(
  incidentId,
  'resolved'
);
```

### Get Incidents

```typescript
// Get incidents for project
const incidents = await incidentManager.getIncidentsForProject(
  projectId,
  {
    status: 'open',
    severity: 'high',
    limit: 20,
  }
);
```

---

## Postmortem Management

### Postmortem Structure

```typescript
interface Postmortem {
  id: string;
  incidentId: string;
  title: string;
  summary: string;
  timeline: TimelineEvent[];
  rootCauses: string[];
  impact: string;
  lessonsLearned: LessonLearned[];
  actionItems: string[]; // Action item IDs
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Create Postmortem

```typescript
// Create postmortem
const postmortem = await postmortemManager.createPostmortem(
  incidentId,
  {
    title: 'Postmortem: Database Connection Timeout',
    summary: 'Root cause analysis and lessons learned',
    timeline: [
      { time: '10:00', event: 'Incident declared' },
      { time: '10:15', event: 'Investigation started' },
      { time: '11:30', event: 'Root cause identified' },
      { time: '12:00', event: 'Incident resolved' },
    ],
    rootCauses: [
      'Connection pool exhausted',
      'Missing connection timeout configuration',
    ],
    impact: 'Users experienced 5-minute delays',
  }
);
```

### Lessons Learned

```typescript
// Add lesson learned
await postmortemManager.addLessonLearned(postmortemId, {
  lesson: 'Always configure connection pool limits',
  priority: 'high',
  category: 'infrastructure',
});
```

---

## Root Cause Analysis

### Five Whys Analysis

```typescript
// Conduct Five Whys
const analysis = await fiveWhysFacilitator.conductFiveWhys(
  incidentId,
  facilitatorId
);

// Add whys
await fiveWhysFacilitator.addWhy(analysis.id, 'Why did the connection pool exhaust?', userId);
await fiveWhysFacilitator.addWhy(analysis.id, 'Why were there too many connections?', userId);
// ... continue to root cause

// Identify root cause
await fiveWhysFacilitator.identifyRootCause(
  analysis.id,
  'Missing connection pool configuration'
);
```

---

## Action Items

### Action Item Structure

```typescript
interface ActionItem {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  assignedTo: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Create Action Item

```typescript
// Create action item
const actionItem = await actionItemTracker.createActionItem({
  incidentId: incidentId,
  title: 'Configure connection pool limits',
  description: 'Set max connections to 100',
  assignedTo: 'dev-123',
  status: 'open',
  priority: 'high',
  dueDate: new Date('2025-02-05'),
});
```

### Track Action Items

```typescript
// Get action items for incident
const actionItems = await actionItemTracker.getActionItemsForIncident(incidentId);

// Update status
await actionItemTracker.updateActionItemStatus(
  actionItemId,
  'completed'
);
```

---

## Integration Points

### Messaging Integration

- Incident conversations created automatically
- Team notifications
- Status updates
- Postmortem discussions

### Calendar Integration

- Incident declaration events
- Investigation time blocks
- Postmortem meetings
- Action item due dates

---

## Usage Examples

### Declare and Resolve Incident

```typescript
// Declare incident
const incident = await incidentManager.declareIncident({
  projectId: projectId,
  title: 'API rate limit exceeded',
  description: 'Users hitting rate limits',
  severity: 'high',
  status: 'open',
});

// Investigate
await incidentManager.updateStatus(incident.id, 'investigating');

// Resolve
await incidentManager.updateStatus(incident.id, 'resolved');

// Create postmortem
const postmortem = await postmortemManager.createPostmortem(incident.id, {
  title: 'Postmortem: API Rate Limit',
  summary: 'Root cause: Missing rate limit configuration',
  rootCauses: ['Missing rate limit configuration'],
  impact: 'Users unable to use API for 30 minutes',
});

// Create action items
await actionItemTracker.createActionItem({
  incidentId: incident.id,
  title: 'Configure rate limits',
  assignedTo: userId,
  priority: 'high',
});
```

---

## Related Modules

- **Messaging Module** - Incident conversations
- **Calendar Module** - Incident events
- **Task Management Module** - Action items as tasks

---

## Summary

The Incident Management Module provides comprehensive incident management for the Coder IDE. With incident declaration, tracking, root cause analysis, postmortems, and action items, it enables effective incident response and learning throughout the development workflow.
