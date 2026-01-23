# Knowledge Base Module

**Category:** Productivity & Workflow  
**Location:** `src/core/knowledge/`, `src/renderer/contexts/KnowledgeContext.tsx`  
**Last Updated:** 2025-01-27

---

## Overview

The Knowledge Base Module provides documentation management, automatic documentation extraction, and knowledge organization for the Coder IDE. It extracts knowledge from code, commits, PRs, and discussions.

## Purpose

- Knowledge base management
- Automatic documentation extraction
- Code-to-knowledge mapping
- Conversation-to-knowledge conversion
- Runbook management
- Onboarding path generation
- Calendar knowledge linking

---

## Key Components

### 1. Documentation Extractor (`DocumentationExtractor.ts`)

**Location:** `src/core/knowledge/DocumentationExtractor.ts`

**Purpose:** Extract documentation from various sources

**Sources:**
- Code files
- Git commits
- Pull requests
- Discussions/conversations

**Key Methods:**
```typescript
async extractFromCode(filePath: string, projectId: string): Promise<ExtractedDocumentation | null>
async extractFromCommit(commitId: string, projectId: string): Promise<ExtractedDocumentation | null>
async extractFromDiscussion(conversationId: string): Promise<ExtractedDocumentation | null>
async saveExtractedDocumentation(teamId: string, authorId: string, extracted: ExtractedDocumentation, projectId?: string): Promise<string>
```

### 2. Code-to-Knowledge Mapper (`CodeToKnowledgeMapper.ts`)

**Location:** `src/core/knowledge/CodeToKnowledgeMapper.ts`

**Purpose:** Map code files to knowledge entries

**Features:**
- Automatic extraction from code
- File watching
- Real-time updates
- Code documentation extraction

**Key Methods:**
```typescript
async startWatching(projectId: string, teamId: string): Promise<void>
async stopWatching(): Promise<void>
async extractFromFile(filePath: string, projectId: string, teamId: string): Promise<void>
```

### 3. Conversation-to-Knowledge Converter (`ConversationToKnowledgeConverter.ts`)

**Location:** `src/core/knowledge/ConversationToKnowledgeConverter.ts`

**Purpose:** Convert conversations to knowledge entries

**Features:**
- Automatic conversion
- Conversation analysis
- Knowledge extraction
- Entry creation/updates

**Key Methods:**
```typescript
async handleConversationUpdate(conversationId: string): Promise<void>
async convertConversation(conversationId: string): Promise<string | null>
```

### 4. Runbook Manager (`RunbookManager.ts`)

**Location:** `src/core/knowledge/RunbookManager.ts`

**Purpose:** Runbook management

**Runbook Types:**
- `incident_response` - Incident response procedures
- `deployment` - Deployment procedures
- `maintenance` - Maintenance procedures
- `troubleshooting` - Troubleshooting guides
- `onboarding` - Onboarding procedures

**Key Methods:**
```typescript
async createRunbook(runbook: Omit<Runbook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Runbook>
async getRunbook(runbookId: string): Promise<Runbook | null>
async executeRunbook(runbookId: string, context: any): Promise<RunbookExecutionResult>
```

### 5. Onboarding Path Generator (`OnboardingPathGenerator.ts`)

**Location:** `src/core/knowledge/OnboardingPathGenerator.ts`

**Purpose:** Generate onboarding paths

**Features:**
- Personalized onboarding
- Path generation
- Progress tracking
- Resource recommendations

### 6. Calendar Knowledge Linker (`CalendarKnowledgeLinker.ts`)

**Location:** `src/core/knowledge/CalendarKnowledgeLinker.ts`

**Purpose:** Link calendar events to knowledge

**Features:**
- Event-to-knowledge linking
- Knowledge recommendations
- Context enrichment

---

## Knowledge Entry Model

### Entry Structure

```typescript
interface KnowledgeEntry {
  id: string;
  teamId: string;
  projectId?: string;
  title: string;
  content: string;
  category: 'documentation' | 'best-practice' | 'note' | 'article' | 'faq' | 'troubleshooting';
  tags: string[];
  authorId: string;
  filePath?: string;
  metadata?: {
    source: 'code' | 'commit' | 'pr' | 'discussion';
    sourceId?: string;
    extractedAt?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Categories

- `documentation` - Code documentation
- `best-practice` - Best practices
- `note` - Notes
- `article` - Articles
- `faq` - Frequently asked questions
- `troubleshooting` - Troubleshooting guides

---

## Documentation Extraction

### From Code

```typescript
// Extract from code file
const extracted = await documentationExtractor.extractFromCode(
  'src/components/Button.tsx',
  projectId
);

// Extracted includes:
// - title: Extracted from file/function name
// - content: Documentation content
// - category: 'documentation'
// - source: 'code'
// - filePath: 'src/components/Button.tsx'
// - tags: Auto-generated tags
```

### From Commit

```typescript
// Extract from commit
const extracted = await documentationExtractor.extractFromCommit(
  commitId,
  projectId
);

// Extracted includes:
// - title: From commit message
// - content: Commit description
// - category: 'note' or 'best-practice'
// - source: 'commit'
// - sourceId: commitId
```

### From Discussion

```typescript
// Extract from conversation
const extracted = await documentationExtractor.extractFromDiscussion(
  conversationId
);

// Extracted includes:
// - title: Generated from conversation
// - content: Summarized discussion
// - category: Determined by content
// - source: 'discussion'
// - sourceId: conversationId
```

---

## Code-to-Knowledge Mapping

### Automatic Extraction

```typescript
// Start watching for code changes
await codeToKnowledgeMapper.startWatching(projectId, teamId);

// Automatically extracts documentation when:
// - File is created
// - File is modified
// - File matches patterns (README, docs/, etc.)
```

### File Patterns

**Extraction Patterns:**
- `README.md`, `README.txt`
- `docs/**/*.md`
- `*.md` files with documentation
- Code files with JSDoc comments

### Real-Time Updates

```typescript
// File watcher triggers extraction
codeToKnowledgeMapper.on('documentation-created', ({ filePath, knowledgeEntryId }) => {
  console.log(`Documentation created from ${filePath}`);
});

codeToKnowledgeMapper.on('documentation-updated', ({ filePath, knowledgeEntryId }) => {
  console.log(`Documentation updated from ${filePath}`);
});
```

---

## Conversation-to-Knowledge

### Automatic Conversion

```typescript
// Conversation updates trigger conversion
await converter.handleConversationUpdate(conversationId);

// Conversion happens when:
// - Conversation has sufficient content
// - Conversation contains knowledge
// - Conversation is marked for conversion
```

### Conversion Criteria

- Minimum conversation length
- Contains knowledge indicators
- Has decisions or recommendations
- Has actionable information

---

## Runbooks

### Runbook Structure

```typescript
interface Runbook {
  id: string;
  teamId: string;
  projectId?: string;
  title: string;
  description: string;
  type: RunbookType;
  steps: RunbookStep[];
  tags: string[];
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RunbookStep {
  order: number;
  title: string;
  description: string;
  action: string;
  expectedResult: string;
  rollback?: string;
}
```

### Runbook Execution

```typescript
// Execute runbook
const result = await runbookManager.executeRunbook(
  runbookId,
  {
    environment: 'production',
    context: {...},
  }
);

// Result includes:
// - success: boolean
// - stepsCompleted: number
// - errors: Error[]
// - logs: string[]
```

---

## Onboarding Paths

### Path Generation

```typescript
// Generate onboarding path
const path = await onboardingGenerator.generatePath({
  userId: 'user-123',
  teamId: 'team-456',
  role: 'developer',
  experience: 'intermediate',
});

// Path includes:
// - steps: OnboardingStep[]
// - resources: Resource[]
// - timeline: Timeline
// - milestones: Milestone[]
```

---

## Knowledge Search

### Search Features

- Full-text search
- Tag filtering
- Category filtering
- Project filtering
- Author filtering

### Search Implementation

```typescript
// Search knowledge base
const results = await knowledgeService.search({
  query: 'authentication',
  category: 'documentation',
  tags: ['security', 'auth'],
  projectId: projectId,
  limit: 20,
});
```

---

## Usage Examples

### Extract from Code

```typescript
// Extract documentation from code
const extracted = await documentationExtractor.extractFromCode(
  'src/auth/AuthService.ts',
  projectId
);

// Save to knowledge base
const entryId = await documentationExtractor.saveExtractedDocumentation(
  teamId,
  'system',
  extracted,
  projectId
);
```

### Create Runbook

```typescript
// Create deployment runbook
const runbook = await runbookManager.createRunbook({
  teamId: teamId,
  title: 'Production Deployment',
  description: 'Step-by-step production deployment',
  type: 'deployment',
  steps: [
    {
      order: 1,
      title: 'Pre-deployment checks',
      description: 'Run pre-deployment validation',
      action: 'npm run pre-deploy',
      expectedResult: 'All checks pass',
    },
    {
      order: 2,
      title: 'Deploy to staging',
      description: 'Deploy to staging environment',
      action: 'npm run deploy:staging',
      expectedResult: 'Staging deployment successful',
    },
    // ... more steps
  ],
  tags: ['deployment', 'production'],
  authorId: userId,
});
```

### Convert Conversation

```typescript
// Convert conversation to knowledge
const entryId = await converter.convertConversation(conversationId);

if (entryId) {
  console.log(`Knowledge entry created: ${entryId}`);
}
```

---

## Related Modules

- **Messaging Module** - Conversations converted to knowledge
- **Planning Module** - Plans linked to knowledge
- **Calendar Module** - Calendar events linked to knowledge

---

## Summary

The Knowledge Base Module provides comprehensive documentation and knowledge management for the Coder IDE. With automatic extraction from code, commits, and conversations, runbook management, and onboarding paths, it enables effective knowledge capture and sharing throughout the development workflow.
