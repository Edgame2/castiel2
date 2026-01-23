# Technical Debt Module

**Category:** Productivity & Workflow  
**Location:** `src/core/debt/`  
**Last Updated:** 2025-01-27

---

## Overview

The Technical Debt Module provides technical debt detection, scoring, prioritization, backlog management, budget management, and paydown planning for the Coder IDE.

## Purpose

- Technical debt detection
- Debt scoring (impact and effort)
- Debt prioritization
- Debt backlog
- Debt budget
- Debt paydown planning
- Debt trend analysis

---

## Key Components

### 1. Debt Detector (`DebtDetector.ts`)

**Location:** `src/core/debt/DebtDetector.ts`

**Purpose:** Detect technical debt patterns

**Debt Types:**
- `code_smell` - Code smells
- `architecture` - Architecture issues
- `dependency` - Dependency issues
- `test_coverage` - Test coverage gaps
- `documentation` - Documentation gaps

**Key Methods:**
```typescript
async detectDebt(projectId: string): Promise<TechnicalDebt[]>
```

### 2. Debt Scorer (`DebtScorer.ts`)

**Location:** `src/core/debt/DebtScorer.ts`

**Purpose:** Score technical debt

**Scoring:**
- Impact score (0-1)
- Effort score (0-1)
- Overall score (weighted: 60% impact, 40% effort)

**Key Methods:**
```typescript
async scoreDebt(debtId: string): Promise<DebtScore>
```

### 3. Debt Backlog Manager (`DebtBacklogManager.ts`)

**Location:** `src/core/debt/DebtBacklogManager.ts`

**Purpose:** Prioritized debt backlog

**Features:**
- Prioritization
- Status tracking
- Task conversion

**Key Methods:**
```typescript
async getPrioritizedBacklog(projectId: string, options?: BacklogOptions): Promise<DebtBacklogItem[]>
async convertDebtToTask(debtId: string, projectId: string): Promise<Task>
```

### 4. Debt Budget Manager (`DebtBudgetManager.ts`)

**Location:** `src/core/debt/DebtBudgetManager.ts`

**Purpose:** Debt budget management

**Features:**
- Budget allocation
- Budget tracking
- Budget limits

### 5. Debt Paydown Planner (`DebtPaydownPlanner.ts`)

**Location:** `src/core/debt/DebtPaydownPlanner.ts`

**Purpose:** Plan debt paydown

**Features:**
- Paydown planning
- Schedule generation
- Resource allocation

### 6. Debt Trend Analyzer (`DebtTrendAnalyzer.ts`)

**Location:** `src/core/debt/DebtTrendAnalyzer.ts`

**Purpose:** Analyze debt trends

**Features:**
- Trend tracking
- Snapshot creation
- Trend visualization

### 7. Debt Impact Analyzer (`DebtImpactAnalyzer.ts`)

**Location:** `src/core/debt/DebtImpactAnalyzer.ts`

**Purpose:** Analyze debt impact

**Features:**
- Impact assessment
- Risk analysis
- Cost estimation

### 8. Debt Acceptance Manager (`DebtAcceptanceManager.ts`)

**Location:** `src/core/debt/DebtAcceptanceManager.ts`

**Purpose:** Manage debt acceptance

**Features:**
- Acceptance workflow
- Approval tracking
- Acceptance documentation

### 9. Debt Review Manager (`DebtReviewManager.ts`)

**Location:** `src/core/debt/DebtReviewManager.ts`

**Purpose:** Debt review management

**Features:**
- Review scheduling
- Review tracking
- Review completion

---

## Technical Debt Model

### Debt Structure

```typescript
interface TechnicalDebt {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  debtType: 'code_smell' | 'architecture' | 'dependency' | 'test_coverage' | 'documentation';
  detectedAt: Date;
  impactScore: number; // 0-1
  effortScore: number; // 0-1
  overallScore: number; // 0-1
  status: 'identified' | 'accepted' | 'in_progress' | 'resolved';
  metadata?: Record<string, any>;
  items: DebtItem[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Debt Item

```typescript
interface DebtItem {
  id: string;
  filePath?: string;
  lineNumber?: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

---

## Debt Detection

### Auto-Detection

```typescript
// Detect debt
const debts = await debtDetector.detectDebt(projectId);

// Detects:
// - Code smells
// - Architecture issues
// - Dependency issues
// - Test coverage gaps
// - Documentation gaps
```

### Detection Types

**Code Smells:**
- Long methods
- Duplicate code
- Complex conditionals
- Magic numbers

**Architecture:**
- Tight coupling
- Circular dependencies
- Violations of principles

**Dependency:**
- Outdated dependencies
- Security vulnerabilities
- Compatibility issues

**Test Coverage:**
- Low coverage
- Missing tests
- Flaky tests

**Documentation:**
- Missing documentation
- Outdated documentation
- Incomplete documentation

---

## Debt Scoring

### Score Calculation

**Impact Score Factors:**
- User impact
- Performance impact
- Security impact
- Maintainability impact

**Effort Score Factors:**
- Complexity
- Time required
- Resource requirements
- Risk

**Overall Score:**
- Weighted: 60% impact, 40% effort
- Higher score = higher priority

### Scoring

```typescript
// Score debt
const score = await debtScorer.scoreDebt(debtId);

console.log(`Impact: ${score.impactScore}`);
console.log(`Effort: ${score.effortScore}`);
console.log(`Overall: ${score.overallScore}`);
```

---

## Debt Backlog

### Prioritized Backlog

```typescript
// Get prioritized backlog
const backlog = await backlogManager.getPrioritizedBacklog(projectId, {
  status: 'accepted',
  limit: 20,
});

// Backlog sorted by priority
// Priority = overall score adjusted by status
```

### Convert to Task

```typescript
// Convert debt to task
const task = await backlogManager.convertDebtToTask(
  debtId,
  projectId
);

// Task created with:
// - Title from debt
// - Description from debt
// - Priority from debt score
// - Type: 'refactor'
```

---

## Debt Budget

### Budget Management

```typescript
// Set debt budget
await budgetManager.setBudget(projectId, {
  allocation: 0.2, // 20% of time
  period: 'sprint',
  limit: 40, // hours
});

// Track budget usage
const usage = await budgetManager.getBudgetUsage(projectId);
```

---

## Debt Paydown Planning

### Paydown Plan

```typescript
// Create paydown plan
const plan = await paydownPlanner.createPlan(projectId, {
  targetDebtReduction: 0.3, // 30% reduction
  timeframe: 'quarter',
  resources: ['dev-1', 'dev-2'],
});

// Plan includes:
// - Debt items to address
// - Schedule
// - Resource allocation
// - Milestones
```

---

## Debt Trends

### Trend Analysis

```typescript
// Analyze trends
const trends = await trendAnalyzer.analyzeTrends(projectId, {
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-03-31'),
});

// Trends include:
// - Debt accumulation
// - Debt resolution
// - Net debt change
// - Velocity
```

---

## Usage Examples

### Detect and Score Debt

```typescript
// Detect debt
const debts = await debtDetector.detectDebt(projectId);

// Score each debt
for (const debt of debts) {
  const score = await debtScorer.scoreDebt(debt.id);
  console.log(`${debt.title}: ${score.overallScore}`);
}

// Get prioritized backlog
const backlog = await backlogManager.getPrioritizedBacklog(projectId);

// Convert high-priority debt to tasks
for (const item of backlog.slice(0, 5)) {
  await backlogManager.convertDebtToTask(item.debtId, projectId);
}
```

### Plan Debt Paydown

```typescript
// Create paydown plan
const plan = await paydownPlanner.createPlan(projectId, {
  targetDebtReduction: 0.25,
  timeframe: 'quarter',
});

// Execute plan
await paydownPlanner.executePlan(plan.id);
```

---

## Related Modules

- **Task Management Module** - Debt converted to tasks
- **Planning Module** - Debt paydown planning
- **Architecture Module** - Architecture debt

---

## Summary

The Technical Debt Module provides comprehensive technical debt management for the Coder IDE. With debt detection, scoring, prioritization, backlog management, budget tracking, and paydown planning, it enables effective technical debt management throughout the development workflow.
