# Context Aggregation Module
## Codebase Indexing and Semantic Analysis

---

## OVERVIEW

**Location:** `src/core/context/`  
**Purpose:** Collect, analyze, and rank codebase context for AI-powered features  
**Category:** AI & Intelligence

---

## CORE COMPONENTS (10)

### 1. Context Aggregator
**File:** `ContextAggregator.ts`

**Purpose:** Main orchestrator for context collection

**Key Methods:**
```typescript
async aggregate(options?: {
  projectId?: string;
  includeProjectData?: boolean;
}): Promise<ProjectContext>
async getRelevantFiles(query: string, limit?: number): Promise<FileInfo[]>
async getContextForFile(filePath: string): Promise<FileContext>
```

**Aggregates:**
- Files (FileIndexer)
- AST (ASTAnalyzer)
- Dependencies (DependencyGraph)
- Git (GitAnalyzer)
- Embeddings (VectorStore)
- Project data (ApplicationProfileManager)

---

### 2. File Indexer
**File:** `FileIndexer.ts`

**Purpose:** Index all project files

**Features:**
- File discovery
- Metadata extraction (path, size, type, language)
- Content indexing
- Incremental updates
- File type detection

**Indexed Info:**
```typescript
interface FileInfo {
  path: string;
  size: number;
  type: string;
  language?: string;
  content?: string;
  metadata?: Record<string, any>;
}
```

---

### 3. AST Analyzer
**File:** `ASTAnalyzer.ts`

**Purpose:** Analyze code structure via Abstract Syntax Trees

**Extracts:**
- Classes
- Functions
- Interfaces
- Types
- Symbols
- Relationships

**Technologies:** TypeScript Compiler API, Babel parser

---

### 4. Dependency Graph
**File:** `DependencyGraph.ts`

**Purpose:** Build project dependency relationships

**Features:**
- Import/export tracking
- Module dependencies
- Package dependencies
- Circular dependency detection

**Graph Structure:**
```typescript
interface DependencyInfo {
  from: string;
  to: string;
  type: 'import' | 'export' | 'dynamic';
}
```

---

### 5. Git Analyzer
**File:** `GitAnalyzer.ts`

**Purpose:** Analyze Git history and metadata

**Extracts:**
- Recent commits (configurable depth)
- Modified files
- Branch information
- Commit messages
- File change history

**Git Info:**
```typescript
interface GitInfo {
  recentCommits: Commit[];
  modifiedFiles: string[];
  currentBranch: string;
  branches: string[];
}
```

---

### 6. Context Ranker
**File:** `ContextRanker.ts`

**Purpose:** Rank files by relevance to query

**Ranking Algorithm:**
- **Semantic Similarity** (40%) - Embedding similarity
- **File Relationships** (30%) - Dependency connections
- **Usage Frequency** (20%) - How often accessed
- **Recency** (10%) - Recent modifications

**Output:**
```typescript
interface FileRelevanceScore {
  filePath: string;
  score: number;        // 0-1
  reasons: string[];
}
```

---

### 7. Vector Store
**File:** `embeddings/VectorStore.ts`

**Purpose:** Store and search code embeddings

**Features:**
- Embedding storage
- Similarity search (cosine similarity)
- Vector indexing
- Incremental updates

**Operations:**
```typescript
async store(id: string, embedding: number[]): Promise<void>
async search(query: number[], limit: number): Promise<SearchResult[]>
async update(id: string, embedding: number[]): Promise<void>
async delete(id: string): Promise<void>
```

---

### 8. Module Detector
**File:** `ModuleDetector.ts`

**Purpose:** Detect logical modules in codebase

**Detection Process:**
1. Analyze directory structure
2. Group related files (cohesion)
3. Map dependencies
4. Calculate confidence scores

**Module Model:**
```typescript
interface Module {
  id: string;
  name: string;
  path: string;
  files: string[];
  dependencies: string[];
  confidence: number;   // 0-1
}
```

---

### 9. Module Analyzer
**File:** `ModuleAnalyzer.ts`

**Purpose:** Analyze module quality

**Analyzes:**
- **Cohesion** - How related files are
- **Coupling** - Dependencies with other modules
- **Complexity** - Cyclomatic complexity
- **Duplication** - Code duplication

**Quality Metrics:**
```typescript
interface ModuleAnalysisResult {
  qualityScore: number;      // 0-100
  cohesion: CohesionScore;
  coupling: CouplingScore;
  complexity: ComplexityScore;
  duplication: DuplicationScore;
  issues: Issue[];
  recommendations: Recommendation[];
}
```

---

### 10. Context Cache
**File:** `ContextCache.ts`

**Purpose:** Cache aggregated context

**Features:**
- In-memory caching
- Cache invalidation on file changes
- Configurable TTL (default: 1 hour)
- Incremental updates

**Cache Strategy:**
- Key: `{projectId}:{contextType}`
- Invalidation: File changes, Git updates
- Storage: Memory (optionally persistent)

---

## CONTEXT SOURCES (5)

### 1. File System
**Information:**
- File paths, sizes, types
- File contents
- Metadata

### 2. AST Analysis
**Information:**
- Code structure
- Classes, functions, interfaces
- Type relationships
- Symbol definitions

### 3. Git History
**Information:**
- Recent commits
- Modified files
- Branch info
- Change history

### 4. Dependencies
**Information:**
- Package dependencies
- Module dependencies
- Import/export relationships

### 5. Embeddings
**Information:**
- Semantic vectors
- Code embeddings
- Similarity search

---

## AGGREGATION PROCESS

**6-Step Process:**

1. **File Indexing** - Index all files
2. **AST Analysis** - Parse code structure
3. **Dependency Building** - Build dependency graph
4. **Git Analysis** - Analyze Git history
5. **Embedding Generation** - Generate semantic embeddings
6. **Context Ranking** - Rank by relevance

**Output:** `ProjectContext` object with all aggregated data

---

## CONTEXT RANKING

### Algorithm

**Weighted Scoring:**
```typescript
score = (
  0.4 * semanticSimilarity +
  0.3 * relationshipScore +
  0.2 * frequencyScore +
  0.1 * recencyScore
)
```

**Configurable Weights:**
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

## ADDITIONAL COMPONENTS (3)

### 1. Domain Context Integrator
**File:** `DomainSpecificContextIntegrator.ts`

**Purpose:** Add domain-specific knowledge

**Features:**
- Domain knowledge base
- Business logic patterns
- Domain terminology
- Industry conventions

---

### 2. Context Limiter
**File:** `ContextLimiter.ts`

**Purpose:** Limit context size for AI models

**Features:**
- Token counting
- Smart truncation
- Priority-based selection
- Context summarization

**Strategies:**
- Token budget enforcement
- Prioritize relevant files
- Summarize less important context

---

### 3. Embedding Generator
**File:** `embeddings/EmbeddingGenerator.ts`

**Purpose:** Generate semantic embeddings

**Features:**
- Code embedding generation
- Document embedding
- Batch processing
- Model integration (OpenAI, local models)

---

## CONTEXT MODEL

```typescript
interface ProjectContext {
  projectId: string;
  
  // File system
  files: FileInfo[];
  
  // Code structure
  ast: ASTInfo;
  
  // Dependencies
  dependencies: DependencyInfo[];
  
  // Git
  git: GitInfo;
  
  // Embeddings
  embeddings: Map<string, number[]>;
  
  // Modules
  modules: Module[];
  
  // Project data
  projectData?: ProjectData;
  
  // Metadata
  timestamp: Date;
  cacheKey: string;
}
```

---

## PERFORMANCE OPTIMIZATIONS

### Incremental Updates
- Only re-index changed files
- Update AST incrementally
- Cache intermediate results

### Lazy Loading
- Load context on demand
- Stream large contexts
- Prioritize critical files

### Parallel Processing
- Index files in parallel
- Generate embeddings in batches
- Concurrent AST parsing

---

## USAGE EXAMPLES

### Aggregate Full Context
```typescript
const aggregator = new ContextAggregator(projectRoot, configManager);

const context = await aggregator.aggregate({
  projectId: 'project-123',
  includeProjectData: true,
});
```

### Get Relevant Files
```typescript
const relevantFiles = await aggregator.getRelevantFiles(
  'user authentication',
  10  // top 10 files
);
```

### Rank Files
```typescript
const ranker = new ContextRanker(aggregator, vectorStore, projectRoot);

const ranked = await ranker.rank('authentication', context);
// Returns: FileRelevanceScore[]
```

---

## INTEGRATION POINTS

### Used By:

1. **Planning Module**
   - Project context for plan generation
   - File relevance for planning

2. **Execution Module**
   - Code context for generation
   - File dependencies

3. **Model Integration**
   - Context for AI prompts
   - Semantic search

4. **Agents Module**
   - Agent context
   - Knowledge retrieval

### Uses:

1. **File Management (IPC)**
   - Read files
   - Watch files

2. **Git (IPC/Native)**
   - Git operations
   - History analysis

3. **Model Integration**
   - Embedding generation
   - AI analysis

---

## IPC CHANNELS

**Channels:**
- `context:aggregate` - Aggregate context
- `context:get-relevant-files` - Get relevant files
- `context:get-file-context` - Get single file context
- `context:invalidate-cache` - Invalidate cache

---

## NO API ENDPOINTS

The Context Aggregation module has **no HTTP API endpoints** - it operates locally via IPC.

---

## SUMMARY

### Core Components: 10
1. Context Aggregator (orchestrator)
2. File Indexer (file discovery)
3. AST Analyzer (code structure)
4. Dependency Graph (relationships)
5. Git Analyzer (history)
6. Context Ranker (relevance)
7. Vector Store (embeddings)
8. Module Detector (module detection)
9. Module Analyzer (quality)
10. Context Cache (caching)

### Additional: 3
- Domain Context Integrator
- Context Limiter
- Embedding Generator

### Context Sources: 5
- File System
- AST Analysis
- Git History
- Dependencies
- Embeddings

### Features:
- **Indexing:** Comprehensive file and code indexing
- **Analysis:** AST, dependencies, Git, modules
- **Ranking:** Multi-factor relevance scoring (semantic, relationships, frequency, recency)
- **Embeddings:** Semantic search with vector similarity
- **Modules:** Automatic module detection with quality analysis
- **Caching:** Smart caching with invalidation
- **Performance:** Incremental updates, lazy loading, parallel processing

### Ranking Algorithm: 4 factors
- Semantic similarity (40%)
- File relationships (30%)
- Usage frequency (20%)
- Recency (10%)

### IPC Channels: 4
(aggregate, get-relevant-files, get-file-context, invalidate-cache)

### No API Endpoints (local processing via IPC)
