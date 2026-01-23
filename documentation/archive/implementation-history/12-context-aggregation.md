# Context Aggregation Module

**Category:** AI & Intelligence  
**Location:** `src/core/context/`  
**Last Updated:** 2025-01-27

---

## Overview

The Context Aggregation Module collects, analyzes, and ranks codebase context to provide comprehensive project understanding for AI-powered features. It aggregates information from files, AST, Git, dependencies, and embeddings.

## Purpose

- Codebase indexing and analysis
- Context extraction from multiple sources
- Semantic analysis and ranking
- Context storage and caching
- Module detection and analysis
- Domain-specific context integration

---

## Key Components

### 1. Context Aggregator (`ContextAggregator.ts`)

**Location:** `src/core/context/ContextAggregator.ts`

**Purpose:** Main context aggregation orchestrator

**Responsibilities:**
- Aggregate context from all sources
- Coordinate context collection
- Cache aggregated context
- Provide unified project context

**Key Methods:**
```typescript
async aggregate(options?: { projectId?: string; includeProjectData?: boolean }): Promise<ProjectContext>
async getRelevantFiles(query: string, limit?: number): Promise<FileInfo[]>
async getContextForFile(filePath: string): Promise<FileContext>
```

### 2. File Indexer (`FileIndexer.ts`)

**Location:** `src/core/context/FileIndexer.ts`

**Purpose:** Index project files

**Features:**
- File discovery
- File metadata extraction
- File content indexing
- Incremental updates

### 3. AST Analyzer (`ASTAnalyzer.ts`)

**Location:** `src/core/context/ASTAnalyzer.ts`

**Purpose:** Analyze code structure

**Features:**
- Parse source code
- Extract classes, functions, interfaces
- Build type relationships
- Track symbol definitions

### 4. Dependency Graph (`DependencyGraph.ts`)

**Location:** `src/core/context/DependencyGraph.ts`

**Purpose:** Build dependency relationships

**Features:**
- Import/export tracking
- Module dependencies
- Package dependencies
- Circular dependency detection

### 5. Git Analyzer (`GitAnalyzer.ts`)

**Location:** `src/core/context/GitAnalyzer.ts`

**Purpose:** Analyze Git history

**Features:**
- Recent commits
- Modified files
- Branch information
- Commit messages

### 6. Context Ranker (`ContextRanker.ts`)

**Location:** `src/core/context/ContextRanker.ts`

**Purpose:** Rank files by relevance

**Features:**
- Semantic similarity
- File relationships
- Usage frequency
- Recency weighting

**Ranking Factors:**
- Semantic similarity (embeddings)
- File relationships (dependencies)
- Usage frequency
- Recency (Git history)
- File type relevance

### 7. Vector Store (`embeddings/VectorStore.ts`)

**Location:** `src/core/context/embeddings/VectorStore.ts`

**Purpose:** Store and search embeddings

**Features:**
- Embedding storage
- Similarity search
- Vector indexing
- Embedding updates

### 8. Module Detector (`ModuleDetector.ts`)

**Location:** `src/core/context/ModuleDetector.ts`

**Purpose:** Detect project modules

**Features:**
- Module detection from structure
- Submodule detection
- Module dependency mapping
- Confidence scoring

### 9. Module Analyzer (`ModuleAnalyzer.ts`)

**Location:** `src/core/context/ModuleAnalyzer.ts`

**Purpose:** Analyze module quality

**Features:**
- Cohesion analysis
- Coupling analysis
- Complexity analysis
- Duplication detection
- Quality scoring

### 10. Context Cache (`ContextCache.ts`)

**Location:** `src/core/context/ContextCache.ts`

**Purpose:** Cache aggregated context

**Features:**
- Context caching
- Cache invalidation
- Cache expiration
- Incremental updates

---

## Context Sources

### File System

**Information Collected:**
- File paths
- File sizes
- File types
- File contents
- File metadata

### AST Analysis

**Information Collected:**
- Classes
- Functions
- Interfaces
- Types
- Relationships
- Symbols

### Git History

**Information Collected:**
- Recent commits
- Modified files
- Branch information
- Commit messages
- File change history

### Dependencies

**Information Collected:**
- Package dependencies
- Module dependencies
- Import/export relationships
- Dependency versions

### Embeddings

**Information Collected:**
- Semantic embeddings
- Code embeddings
- Document embeddings
- Similarity vectors

---

## Context Aggregation Process

### 1. File Indexing

```typescript
// Index all project files
const files = await fileIndexer.index();

// Files include:
// - Path
// - Size
// - Type
// - Content (optional)
// - Metadata
```

### 2. AST Analysis

```typescript
// Analyze code structure
const ast = await astAnalyzer.analyze();

// AST includes:
// - Classes
// - Functions
// - Interfaces
// - Types
// - Relationships
```

### 3. Dependency Building

```typescript
// Build dependency graph
const dependencies = await dependencyGraph.build();

// Dependencies include:
// - Import relationships
// - Module dependencies
// - Package dependencies
```

### 4. Git Analysis

```typescript
// Analyze Git history
const gitInfo = await gitAnalyzer.analyze(depth);

// Git info includes:
// - Recent commits
// - Modified files
// - Branch info
```

### 5. Embedding Generation

```typescript
// Generate embeddings
const embeddings = await generateEmbeddings(files);

// Embeddings enable:
// - Semantic search
// - Similarity matching
// - Context ranking
```

### 6. Context Ranking

```typescript
// Rank files by relevance
const rankedFiles = await contextRanker.rank(query, context);

// Ranking considers:
// - Semantic similarity
// - File relationships
// - Usage frequency
// - Recency
```

---

## Context Ranking

### Ranking Algorithm

**Factors:**
1. **Semantic Similarity** (40%) - Embedding similarity
2. **File Relationships** (30%) - Dependency relationships
3. **Usage Frequency** (20%) - How often file is used
4. **Recency** (10%) - Recent modifications

### Ranking Configuration

```typescript
interface RankingConfig {
  weights: {
    semantic: number;
    relationships: number;
    frequency: number;
    recency: number;
  };
  minScore: number;
  maxResults: number;
}
```

---

## Module Detection

### Detection Process

1. **Structure Analysis** - Detect modules from directory structure
2. **Cohesion Analysis** - Group related files
3. **Dependency Mapping** - Map inter-module dependencies
4. **Confidence Scoring** - Calculate detection confidence

### Module Structure

```typescript
interface Module {
  id: string;
  name: string;
  path: string;
  files: string[];
  dependencies: string[];
  confidence: number;
}
```

---

## Context Caching

### Cache Strategy

- **Cache Key:** Project ID + context type
- **Cache Duration:** Configurable (default: 1 hour)
- **Invalidation:** On file changes, Git updates
- **Storage:** Memory + optional persistent storage

### Cache Invalidation

```typescript
// Invalidate on file change
contextCache.invalidate('project-context-123');

// Invalidate on Git update
contextCache.invalidate('git-context-123');
```

---

## Domain-Specific Context

### Domain Context Integrator (`DomainSpecificContextIntegrator.ts`)

**Purpose:** Integrate domain-specific knowledge

**Features:**
- Domain knowledge base
- Domain-specific patterns
- Business logic context
- Domain terminology

---

## Context Limiting

### Context Limiter (`ContextLimiter.ts`)

**Purpose:** Limit context size for AI models

**Features:**
- Token counting
- Context truncation
- Priority-based selection
- Smart summarization

---

## Usage Examples

### Aggregate Context

```typescript
const aggregator = new ContextAggregator(projectRoot, configManager);

// Aggregate all context
const context = await aggregator.aggregate({
  projectId: 'project-123',
  includeProjectData: true,
});

// Context includes:
// - Files
// - AST
// - Dependencies
// - Git info
// - Embeddings
```

### Get Relevant Files

```typescript
// Get files relevant to query
const relevantFiles = await aggregator.getRelevantFiles(
  'user authentication',
  10 // top 10 files
);
```

### Rank Files

```typescript
const ranker = new ContextRanker(aggregator, vectorStore, projectRoot);

// Rank files by relevance
const ranked = await ranker.rank('authentication', context);

// Returns: FileRelevanceScore[]
```

---

## Performance Optimization

### Incremental Updates

- Only re-index changed files
- Update AST incrementally
- Cache intermediate results

### Lazy Loading

- Load context on demand
- Stream large contexts
- Prioritize critical files

---

## Related Modules

- **Planning Module** - Uses context for planning
- **Execution Module** - Uses context for code generation
- **Model Integration Module** - Uses context for AI prompts
- **Agents Module** - Uses context for agent operations

---

## Summary

The Context Aggregation Module is the foundation for AI-powered features in Coder IDE. It collects, analyzes, and ranks codebase context from multiple sources, providing comprehensive project understanding for planning, execution, and intelligent code generation.
