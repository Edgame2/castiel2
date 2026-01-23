# Learning Resources Module

**Category:** Productivity & Workflow  
**Location:** `src/core/learning/`  
**Last Updated:** 2025-01-27

---

## Overview

The Learning Resources Module provides continuous learning and skill development for the Coder IDE. It includes learning path generation, external resource curation, progress tracking, micro-learning, and learning quarantine.

## Purpose

- Learning path generation
- External resource curation
- Progress tracking
- Micro-learning moments
- Skill gap analysis
- Learning quarantine
- Best practice learning

---

## Key Components

### 1. Learning Path Generator (`LearningPathGenerator.ts`)

**Location:** `src/core/learning/LearningPathGenerator.ts`

**Purpose:** Generate personalized learning roadmaps

**Features:**
- Personalized paths
- Skill-based paths
- Prerequisite handling
- Progress tracking

**Key Methods:**
```typescript
async generatePath(options: LearningPathOptions): Promise<LearningPath>
```

### 2. External Resource Curator (`ExternalResourceCurator.ts`)

**Location:** `src/core/learning/ExternalResourceCurator.ts`

**Purpose:** Curate external learning resources

**Resource Types:**
- `course` - Online courses
- `article` - Articles
- `video` - Videos
- `tutorial` - Tutorials
- `documentation` - Documentation

**Key Methods:**
```typescript
async curateResource(teamId: string, curatedBy: string, url: string, title: string, options?: ResourceOptions): Promise<ExternalResource>
```

### 3. Progress Tracker (`ProgressTracker.ts`)

**Location:** `src/core/learning/ProgressTracker.ts`

**Purpose:** Track learning progress

**Features:**
- Progress recording
- Visual skill development
- Time tracking
- Completion tracking

**Key Methods:**
```typescript
async recordProgress(learningPathId: string, userId: string, stepId?: string, competencyName?: string, progressValue?: number, timeSpent?: number): Promise<void>
async getProgressSummary(userId: string, startDate?: Date, endDate?: Date): Promise<LearningProgressSummary>
```

### 4. Micro-Learning Manager (`MicroLearningManager.ts`)

**Location:** `src/core/learning/MicroLearningManager.ts`

**Purpose:** Manage micro-learning moments

**Features:**
- Short learning moments
- Context-aware learning
- Just-in-time learning

### 5. Skill Gap Analyzer (`SkillGapAnalyzer.ts`)

**Location:** `src/core/learning/SkillGapAnalyzer.ts`

**Purpose:** Analyze skill gaps

**Features:**
- Gap identification
- Skill assessment
- Recommendation generation

### 6. Learning Quarantine (`LearningQuarantine.ts`)

**Location:** `src/core/learning/LearningQuarantine.ts`

**Purpose:** Quarantine new learning before applying

**Features:**
- Candidate learning storage
- Shadow mode testing
- Promotion validation
- Version tracking
- Reversibility

---

## Learning Paths

### Path Structure

```typescript
interface LearningPath {
  id: string;
  userId: string;
  teamId?: string;
  title: string;
  description?: string;
  steps: LearningPathStep[];
  skillsCovered: string[];
  estimatedDuration?: number; // Minutes
  status: 'draft' | 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}
```

### Path Steps

```typescript
interface LearningPathStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  stepType: 'reading' | 'exercise' | 'challenge' | 'kata' | 'project' | 'video' | 'course';
  resourceUrl?: string;
  resourceType?: 'internal' | 'external';
  content?: string; // For micro-learning
  skillsCovered: string[];
  prerequisites: string[];
  estimatedDuration?: number; // Minutes
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
  timeSpent?: number; // Minutes
}
```

---

## External Resources

### Resource Model

```typescript
interface ExternalResource {
  id: string;
  teamId?: string;
  title: string;
  description?: string;
  url: string;
  resourceType: 'course' | 'article' | 'video' | 'tutorial' | 'documentation';
  provider?: string;
  curatedBy: string;
  qualityScore?: number; // 0-1
  relevanceTags: string[];
  skillsCovered: string[];
  viewCount: number;
  helpfulCount: number;
  estimatedDuration?: number; // Minutes
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Progress Tracking

### Progress Summary

```typescript
interface LearningProgressSummary {
  userId: string;
  totalPaths: number;
  completedPaths: number;
  inProgressPaths: number;
  totalSteps: number;
  completedSteps: number;
  skillsImproved: string[];
  timeSpent: number; // Minutes
  period: {
    start: Date;
    end: Date;
  };
}
```

---

## Learning Quarantine

### Quarantine Process

1. **Candidate Storage** - New learning stored as candidate
2. **Shadow Mode** - Tested but not used for decisions
3. **Validation** - Requires N successful confirmations
4. **Promotion** - Explicit promotion to active learning
5. **Versioning** - Track learning version
6. **Reversibility** - Can unlearn/rollback
7. **Audit Trail** - Full audit trail

### Learning Types

- `pattern` - Code patterns, bug patterns
- `strategy` - Planning strategies, execution strategies
- `model-performance` - Model selection, prompt optimization
- `validation` - Validation rules, thresholds
- `other` - Other learning types

---

## Usage Examples

### Generate Learning Path

```typescript
// Generate personalized learning path
const path = await pathGenerator.generatePath({
  userId: userId,
  teamId: teamId,
  role: 'developer',
  experience: 'intermediate',
  skills: ['javascript', 'react'],
  targetSkills: ['typescript', 'node.js'],
});

// Path includes:
// - Steps with prerequisites
// - Resources (internal/external)
// - Estimated duration
// - Skills covered
```

### Curate Resource

```typescript
// Curate external resource
const resource = await curator.curateResource(
  teamId,
  userId,
  'https://example.com/course',
  'Advanced TypeScript',
  {
    resourceType: 'course',
    skillsCovered: ['typescript', 'advanced'],
    estimatedDuration: 480, // 8 hours
  }
);
```

### Track Progress

```typescript
// Record progress
await progressTracker.recordProgress(
  pathId,
  userId,
  stepId,
  'typescript',
  0.5, // 50% complete
  60 // 60 minutes spent
);

// Get progress summary
const summary = await progressTracker.getProgressSummary(
  userId,
  startDate,
  endDate
);
```

---

## Related Modules

- **Knowledge Base Module** - Learning resources
- **Calendar Module** - Learning schedule
- **Task Management Module** - Learning tasks

---

## Summary

The Learning Resources Module provides comprehensive continuous learning and skill development for the Coder IDE. With learning paths, external resource curation, progress tracking, micro-learning, and learning quarantine, it enables effective skill development throughout the development workflow.
