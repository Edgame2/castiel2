# Code Reviews Module

**Category:** Productivity & Workflow  
**Location:** `src/core/reviews/`  
**Last Updated:** 2025-01-27

---

## Overview

The Code Reviews Module provides comprehensive code review workflow management for the Coder IDE. It includes review assignments, inline comments, review threads, approval workflows, quality scoring, and integration with planning.

## Purpose

- Review assignment management
- Inline comment management
- Review thread management
- Approval workflow
- Review quality scoring
- Review time tracking
- Plan integration

---

## Key Components

### 1. Review Assignment Optimizer (`ReviewAssignmentOptimizer.ts`)

**Location:** `src/core/users/ReviewAssignmentOptimizer.ts`

**Purpose:** Optimize review assignments

**Features:**
- Expertise-based assignment
- Workload balancing
- Review assignment optimization

### 2. Inline Comment Manager (`InlineCommentManager.ts`)

**Location:** `src/core/reviews/InlineCommentManager.ts`

**Purpose:** Manage inline comments

**Comment Types:**
- `comment` - General comment
- `suggestion` - Code suggestion
- `question` - Question about code
- `approval` - Approval comment
- `request_changes` - Request changes

**Key Methods:**
```typescript
async createComment(comment: Omit<InlineComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<InlineComment>
async getCommentsForAssignment(assignmentId: string): Promise<InlineComment[]>
async resolveComment(commentId: string, resolvedBy: string): Promise<void>
```

### 3. Review Thread Manager (`ReviewThreadManager.ts`)

**Location:** `src/core/reviews/ReviewThreadManager.ts`

**Purpose:** Manage review threads

**Features:**
- Threaded discussions
- Thread resolution
- Issue tracking

**Key Methods:**
```typescript
async createThread(thread: Omit<ReviewThread, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReviewThread>
async getThreadsForAssignment(assignmentId: string): Promise<ReviewThread[]>
async resolveThread(threadId: string, resolvedBy: string): Promise<void>
```

### 4. Review Approval Workflow (`ReviewApprovalWorkflow.ts`)

**Location:** `src/core/reviews/ReviewApprovalWorkflow.ts`

**Purpose:** Manage approval workflow

**Approval Levels:**
- `peer` - Peer review
- `senior` - Senior review
- `architect` - Architecture review

**Approval Status:**
- `pending` - Pending approval
- `approved` - Approved
- `rejected` - Rejected
- `requested_changes` - Changes requested

**Key Methods:**
```typescript
async requestApproval(assignmentId: string, level: ApprovalLevel, reviewerId: string): Promise<ReviewApproval>
async submitApproval(approvalId: string, status: ApprovalStatus, comments?: string): Promise<ReviewApproval>
async getApprovalsForAssignment(assignmentId: string): Promise<ReviewApproval[]>
```

### 5. Review Quality Scorer (`ReviewQualityScorer.ts`)

**Location:** `src/core/reviews/ReviewQualityScorer.ts`

**Purpose:** Score review quality

**Quality Factors:**
- Comment count
- Thread count
- Resolved comments
- Average comment length
- Code coverage (percentage of changed lines with comments)
- Time spent
- Checklist items checked

**Key Methods:**
```typescript
async scoreReview(assignmentId: string, scoredBy?: string): Promise<ReviewQualityScore>
```

### 6. Review Time Tracker (`ReviewTimeTracker.ts`)

**Location:** `src/core/reviews/ReviewTimeTracker.ts`

**Purpose:** Track review time

**Features:**
- Time tracking
- Review duration
- Time analysis

### 7. Plan Review Trigger (`PlanReviewTrigger.ts`)

**Location:** `src/core/reviews/PlanReviewTrigger.ts`

**Purpose:** Automatically create reviews from plans

**Features:**
- Plan completion detection
- Automatic review assignment
- Calendar event creation
- Conversation creation

**Key Methods:**
```typescript
async handlePlanCompletion(plan: Plan, projectId: string, executionResult: ExecutionResult): Promise<void>
```

---

## Review Workflow

### Review Assignment

```typescript
// Create review assignment
const assignment = await reviewService.createAssignment({
  reviewableId: 'plan-123',
  reviewableType: 'plan',
  assignedTo: 'reviewer-456',
  priority: 'high',
  dueDate: new Date('2025-02-01'),
});
```

### Inline Comments

```typescript
// Create inline comment
const comment = await commentManager.createComment({
  assignmentId: assignment.id,
  filePath: 'src/components/Button.tsx',
  lineNumber: 42,
  content: 'Consider extracting this logic to a utility function',
  type: 'suggestion',
  authorId: reviewerId,
});
```

### Review Threads

```typescript
// Create review thread
const thread = await threadManager.createThread({
  assignmentId: assignment.id,
  issueId: 'issue-123',
  title: 'Performance concern',
  status: 'open',
});
```

### Approval Workflow

```typescript
// Request approval
const approval = await approvalWorkflow.requestApproval(
  assignmentId,
  'senior',
  'senior-reviewer-789'
);

// Submit approval
await approvalWorkflow.submitApproval(
  approval.id,
  'approved',
  'Looks good!'
);
```

---

## Review Quality Scoring

### Quality Score Calculation

**Thoroughness Score:**
- Comment coverage
- Thread coverage
- Checklist completion
- Time spent

**Value Score:**
- Comment quality
- Issue identification
- Suggestion value
- Resolution rate

**Overall Score:**
- Average of thoroughness and value scores

### Quality Score Factors

```typescript
interface QualityScoreFactors {
  commentCount: number;
  threadCount: number;
  resolvedComments: number;
  averageCommentLength: number;
  codeCoverage: number; // Percentage of changed lines with comments
  timeSpent: number; // Minutes
  checklistItemsChecked: number;
  totalChecklistItems: number;
}
```

---

## Plan Integration

### Automatic Review Creation

When a plan completes:

1. **Analyze Review Needs** - Determine what needs review
2. **Auto-Assign Reviewers** - Based on expertise
3. **Create Calendar Events** - Schedule review time blocks
4. **Create Conversations** - For review discussions

### Review Needs Analysis

```typescript
// Analyze plan steps for review needs
const reviewNeeds = analyzeReviewNeeds(planSteps);

// Review needs include:
// - Code changes
// - Architecture changes
// - Configuration changes
// - Documentation changes
```

---

## Review Checklist

### Checklist Integration

Review checklists are integrated:
- Checklist items
- Item checking
- Checklist completion
- Quality scoring

---

## Usage Examples

### Create Review from Plan

```typescript
// Plan completion triggers review
await planReviewTrigger.handlePlanCompletion(
  plan,
  projectId,
  {
    success: true,
    completedSteps: ['step-1', 'step-2'],
    failedSteps: [],
  }
);

// Automatically:
// - Creates review assignments
// - Assigns reviewers
// - Creates calendar events
// - Creates conversations
```

### Score Review Quality

```typescript
// Score review quality
const score = await qualityScorer.scoreReview(assignmentId);

console.log(`Thoroughness: ${score.thoroughnessScore}`);
console.log(`Value: ${score.valueScore}`);
console.log(`Overall: ${score.overallScore}`);
```

### Track Review Time

```typescript
// Start tracking
await timeTracker.startTracking(assignmentId, reviewerId);

// Stop tracking
await timeTracker.stopTracking(assignmentId, reviewerId);

// Get time spent
const timeSpent = await timeTracker.getTimeSpent(assignmentId);
```

---

## Related Modules

- **Planning Module** - Plans trigger reviews
- **Task Management Module** - Tasks linked to reviews
- **Messaging Module** - Review discussions
- **Calendar Module** - Review scheduling

---

## Summary

The Code Reviews Module provides comprehensive code review workflow management for the Coder IDE. With review assignments, inline comments, approval workflows, quality scoring, and plan integration, it enables effective code review processes throughout the development workflow.
