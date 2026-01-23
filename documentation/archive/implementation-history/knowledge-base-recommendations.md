# Knowledge Base Module - Recommendations & Enhancements

**Version:** 1.0  
**Last Updated:** 2026-01-20  
**Status:** Proposed Enhancements  
**Related:** [knowledge-base-spec-v2-part1.md](./knowledge-base-spec-v2-part1.md)

---

## Executive Summary

This document outlines recommended enhancements and additions to the Knowledge Base module specification. These recommendations address:
- Missing specification elements (Part 2)
- AI/ML capabilities enhancement
- Integration with other modules
- Performance and scalability
- Security and access control
- User experience improvements

---

## Table of Contents

1. [Critical Missing Pieces](#1-critical-missing-pieces)
2. [Semantic Search & Vector Embeddings](#2-semantic-search--vector-embeddings)
3. [Knowledge Graph Layer](#3-knowledge-graph-layer)
4. [AI Agent Integration](#4-ai-agent-integration)
5. [Knowledge Extraction Workflows](#5-knowledge-extraction-workflows)
6. [Planning Module Integration](#6-planning-module-integration)
7. [Code-to-Documentation Sync](#7-code-to-documentation-sync)
8. [UI/UX Enhancements](#8-uiux-enhancements)
9. [Security & Access Control](#9-security--access-control)
10. [Performance Optimizations](#10-performance-optimizations)
11. [Analytics & Insights](#11-analytics--insights)
12. [Smart Template System](#12-smart-template-system)
13. [Priority Matrix](#13-priority-matrix)

---

## 1. Critical Missing Pieces

### 1.1 Part 2 Specification Required

The current specification (Part 1) references Part 2 which should cover:
- Collaboration Features (real-time editing, comments, sharing)
- Integration with Planning Module (templates, references, workflows)
- Complete Database Schema (all tables, indexes, relationships)
- API Endpoints (REST APIs for all operations)
- UI Components (complete component specifications)

**Recommendation:** Prioritize creating Part 2 to complete the specification before implementation.

### 1.2 Missing Core Features

| Feature | Current Status | Recommendation |
|---------|---------------|----------------|
| Real-time collaboration | Referenced but not specified | Full CRDT-based specification needed |
| Version history | Basic mention | Detailed versioning model required |
| Export/Import | Not specified | Multiple format support (MD, PDF, HTML) |
| Search architecture | Basic text search implied | Semantic search with embeddings |
| Offline support | Mentioned as goal | Detailed offline-first architecture |

---

## 2. Semantic Search & Vector Embeddings

### 2.1 Overview

The current search model relies on text-based queries. For true AI-powered discovery, semantic search with vector embeddings is essential.

### 2.2 Configuration Model

```typescript
/**
 * Configuration for semantic search capabilities
 * Enables meaning-based search beyond keyword matching
 */
interface SemanticSearchConfig {
  // Embedding model selection
  embeddingModel: 'openai-ada-002' | 'openai-3-small' | 'openai-3-large' | 
                  'local-e5' | 'local-bge' | 'cohere-embed';
  
  // Vector storage backend
  vectorStore: 'pgvector' | 'pinecone' | 'milvus' | 'qdrant' | 'weaviate';
  
  // Chunking configuration
  chunkSize: number;           // Token size for embedding chunks (default: 512)
  overlapSize: number;         // Overlap between chunks (default: 50)
  chunkingStrategy: 'fixed' | 'semantic' | 'paragraph' | 'block';
  
  // Search configuration
  hybridSearch: boolean;       // Combine semantic + keyword search
  hybridWeight: number;        // Weight for semantic vs keyword (0-1)
  maxResults: number;          // Maximum results to return
  minSimilarity: number;       // Minimum similarity threshold (0-1)
  
  // Reranking
  useReranker: boolean;
  rerankerModel?: 'cohere-rerank' | 'local-cross-encoder';
}

/**
 * Page embedding storage for vector search
 */
interface PageEmbedding {
  id: string;
  pageId: string;
  blockId?: string;            // Block-level granularity for precise results
  chunkIndex: number;          // Position within page
  
  // Embedding data
  embedding: number[];         // Vector embedding (dimension varies by model)
  embeddingModel: string;      // Model used to generate embedding
  
  // Source content
  text: string;                // Original text that was embedded
  textHash: string;            // Hash for change detection
  
  // Metadata for filtering
  metadata: {
    spaceId: string;
    categoryIds: string[];
    tags: string[];
    contentType: 'text' | 'code' | 'table' | 'heading';
    language?: string;         // For code blocks
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search query with semantic capabilities
 */
interface SemanticSearchQuery {
  query: string;
  
  // Search mode
  mode: 'semantic' | 'keyword' | 'hybrid';
  
  // Filters
  filters?: {
    spaceIds?: string[];
    categoryIds?: string[];
    tags?: string[];
    createdBy?: string[];
    dateRange?: { start: Date; end: Date };
    contentTypes?: string[];
  };
  
  // Options
  options?: {
    maxResults?: number;
    minSimilarity?: number;
    includeBlocks?: boolean;   // Return block-level results
    highlightMatches?: boolean;
    groupByPage?: boolean;
  };
}

/**
 * Search result with relevance scoring
 */
interface SemanticSearchResult {
  pageId: string;
  blockId?: string;
  
  // Relevance
  score: number;               // Combined relevance score (0-1)
  semanticScore: number;       // Semantic similarity score
  keywordScore?: number;       // Keyword match score (if hybrid)
  
  // Content
  title: string;
  snippet: string;             // Relevant text excerpt
  highlightedSnippet?: string; // With match highlighting
  
  // Context
  breadcrumb: string[];        // Path to page
  matchedBlocks?: Array<{
    blockId: string;
    blockType: string;
    text: string;
    score: number;
  }>;
  
  // Metadata
  metadata: {
    space: string;
    categories: string[];
    tags: string[];
    lastUpdated: Date;
    author: string;
  };
}
```

### 2.3 Embedding Pipeline

```typescript
/**
 * Pipeline for generating and maintaining embeddings
 */
interface EmbeddingPipeline {
  // Generate embeddings for new/updated content
  generateEmbeddings(pageId: string): Promise<PageEmbedding[]>;
  
  // Batch processing for initial indexing
  batchGenerateEmbeddings(pageIds: string[], options?: {
    batchSize: number;
    concurrency: number;
    onProgress?: (progress: number) => void;
  }): Promise<void>;
  
  // Incremental updates
  updateEmbeddings(pageId: string, changedBlockIds: string[]): Promise<void>;
  
  // Delete embeddings when content is removed
  deleteEmbeddings(pageId: string, blockIds?: string[]): Promise<void>;
  
  // Reindex with new model or configuration
  reindexAll(config: SemanticSearchConfig): Promise<void>;
  
  // Health and statistics
  getIndexStats(): Promise<{
    totalPages: number;
    totalChunks: number;
    indexSize: number;
    lastUpdated: Date;
    coverage: number;  // Percentage of pages indexed
  }>;
}
```

### 2.4 Benefits

- **Natural Language Queries**: Users can ask questions in natural language
- **Conceptual Matching**: Find related content even without exact keywords
- **Cross-Language Search**: Find code documentation regardless of terminology
- **AI Q&A Foundation**: Enables RAG-based question answering

---

## 3. Knowledge Graph Layer

### 3.1 Overview

Add a graph layer to capture relationships between knowledge entities, enabling powerful discovery and navigation.

### 3.2 Data Model

```typescript
/**
 * Node in the knowledge graph
 */
interface KnowledgeNode {
  id: string;
  workspaceId: string;
  
  // Node identity
  type: KnowledgeNodeType;
  label: string;
  description?: string;
  
  // Source reference
  sourceType: 'page' | 'block' | 'code' | 'external';
  sourceId?: string;           // pageId, blockId, or code symbol
  
  // Properties
  properties: Record<string, any>;
  
  // AI-generated
  isAIGenerated: boolean;
  confidence?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

type KnowledgeNodeType = 
  | 'page'           // Knowledge base page
  | 'concept'        // Abstract concept (e.g., "authentication")
  | 'entity'         // Named entity (e.g., "UserService")
  | 'code_symbol'    // Code element (class, function, etc.)
  | 'person'         // Team member
  | 'project'        // Project reference
  | 'decision'       // Architecture/design decision
  | 'requirement'    // Business requirement
  | 'api'            // API endpoint
  | 'term'           // Glossary term
  | 'tag';           // Tag node

/**
 * Edge connecting two nodes in the knowledge graph
 */
interface KnowledgeEdge {
  id: string;
  workspaceId: string;
  
  // Connection
  sourceNodeId: string;
  targetNodeId: string;
  
  // Relationship type
  relationship: KnowledgeRelationship;
  
  // Properties
  properties?: Record<string, any>;
  weight?: number;             // Relationship strength (0-1)
  
  // Confidence
  confidence: number;          // 0-100, for AI-generated edges
  isManual: boolean;           // User-created vs AI-inferred
  
  // Bidirectional
  isBidirectional: boolean;
  reverseRelationship?: KnowledgeRelationship;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

type KnowledgeRelationship =
  // Content relationships
  | 'references'       // Page A references Page B
  | 'explains'         // Page A explains concept B
  | 'extends'          // Page A extends/builds on Page B
  | 'contradicts'      // Page A contradicts Page B
  | 'supersedes'       // Page A supersedes (replaces) Page B
  | 'related_to'       // General relation
  
  // Code relationships
  | 'documents'        // Page documents code symbol
  | 'implements'       // Code implements design in page
  | 'depends_on'       // Code/concept depends on another
  | 'used_by'          // Inverse of depends_on
  
  // People relationships
  | 'authored_by'      // Page authored by person
  | 'owned_by'         // Page owned/maintained by person
  | 'reviewed_by'      // Page reviewed by person
  | 'expert_in'        // Person is expert in concept
  
  // Hierarchy relationships
  | 'parent_of'        // Hierarchical parent
  | 'child_of'         // Hierarchical child
  | 'part_of'          // Component relationship
  | 'contains'         // Inverse of part_of
  
  // Temporal relationships
  | 'precedes'         // Temporal ordering
  | 'follows'          // Inverse of precedes
  | 'version_of';      // Version relationship

/**
 * Graph query interface
 */
interface KnowledgeGraphQuery {
  // Find related nodes
  findRelated(nodeId: string, options?: {
    relationshipTypes?: KnowledgeRelationship[];
    maxDepth?: number;
    maxResults?: number;
    minConfidence?: number;
  }): Promise<KnowledgeNode[]>;
  
  // Find paths between nodes
  findPaths(sourceId: string, targetId: string, options?: {
    maxDepth?: number;
    relationshipTypes?: KnowledgeRelationship[];
  }): Promise<KnowledgePath[]>;
  
  // Get subgraph
  getSubgraph(centerNodeId: string, depth: number): Promise<{
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
  }>;
  
  // Query by pattern
  queryPattern(pattern: GraphPattern): Promise<QueryResult[]>;
  
  // Find clusters
  findClusters(options?: {
    algorithm: 'louvain' | 'label_propagation';
    minClusterSize?: number;
  }): Promise<NodeCluster[]>;
}

interface KnowledgePath {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  totalWeight: number;
}

interface NodeCluster {
  id: string;
  name: string;              // AI-generated cluster name
  nodes: KnowledgeNode[];
  centralNode: KnowledgeNode;
  coherenceScore: number;
}
```

### 3.3 Graph Visualization

```typescript
/**
 * Configuration for graph visualization
 */
interface GraphVisualizationConfig {
  // Layout
  layout: 'force' | 'hierarchical' | 'radial' | 'dagre';
  
  // Node styling
  nodeStyles: Record<KnowledgeNodeType, {
    color: string;
    icon: string;
    size: 'small' | 'medium' | 'large';
  }>;
  
  // Edge styling
  edgeStyles: Record<KnowledgeRelationship, {
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
    width: number;
  }>;
  
  // Interaction
  allowPan: boolean;
  allowZoom: boolean;
  clickBehavior: 'select' | 'navigate' | 'expand';
  
  // Filtering
  showNodeTypes: KnowledgeNodeType[];
  showRelationships: KnowledgeRelationship[];
  minConfidence: number;
}
```

### 3.4 Use Cases

| Use Case | Query Example |
|----------|--------------|
| Impact analysis | "What docs are affected if AuthService changes?" |
| Knowledge discovery | "Show me everything related to payment processing" |
| Expert finding | "Who knows about database migrations?" |
| Gap detection | "What concepts have no documentation?" |
| Contradiction detection | "Are there conflicting docs about rate limiting?" |

---

## 4. AI Agent Integration

### 4.1 Knowledge Base Agent

Create a dedicated agent for knowledge base operations, integrating with the existing Agents Module.

```typescript
/**
 * Specialized agent for Knowledge Base operations
 * Integrates with AgentOrchestrator in src/core/agents/
 */
interface KnowledgeBaseAgent extends IAgent {
  id: 'knowledge-base-agent';
  name: 'Knowledge Base Agent';
  description: 'AI agent for knowledge extraction, organization, and discovery';
  
  // ========== CONTENT EXTRACTION ==========
  
  /**
   * Extract knowledge from code files
   * Creates draft pages with documentation
   */
  extractFromCode(params: {
    filePaths: string[];
    extractionLevel: 'overview' | 'detailed' | 'comprehensive';
    targetSpace: string;
    includeExamples: boolean;
  }): Promise<KnowledgeSuggestion[]>;
  
  /**
   * Extract knowledge from AI conversation
   * Identifies decisions, learnings, and action items
   */
  extractFromConversation(params: {
    conversationId: string;
    extractTypes: ('decisions' | 'learnings' | 'todos' | 'qa')[];
    targetSpace: string;
  }): Promise<KnowledgeSuggestion[]>;
  
  /**
   * Extract knowledge from git commits
   * Documents changes and reasons
   */
  extractFromCommit(params: {
    commitHash: string;
    repository: string;
    includeCodeChanges: boolean;
  }): Promise<KnowledgeSuggestion[]>;
  
  /**
   * Extract knowledge from meeting transcripts
   */
  extractFromMeeting(params: {
    transcript: string;
    meetingType: 'standup' | 'retro' | 'planning' | 'review' | 'general';
    participants: string[];
  }): Promise<KnowledgeSuggestion[]>;
  
  // ========== GAP DETECTION ==========
  
  /**
   * Detect undocumented areas of the codebase
   */
  detectDocumentationGaps(params: {
    projectId: string;
    analysisDepth: 'surface' | 'deep';
  }): Promise<KnowledgeGap[]>;
  
  /**
   * Find outdated or stale documentation
   */
  detectStaleContent(params: {
    spaceId?: string;
    thresholdDays: number;
    checkCodeChanges: boolean;
  }): Promise<StalenessReport>;
  
  /**
   * Find contradictions between documents
   */
  findContradictions(params: {
    pageIds?: string[];
    scope: 'page' | 'space' | 'workspace';
  }): Promise<Contradiction[]>;
  
  // ========== CONTENT IMPROVEMENT ==========
  
  /**
   * Suggest improvements for a page
   */
  suggestImprovements(params: {
    pageId: string;
    focusAreas: ('clarity' | 'completeness' | 'structure' | 'examples')[];
  }): Promise<ContentSuggestion[]>;
  
  /**
   * Auto-generate missing sections
   */
  generateMissingSections(params: {
    pageId: string;
    sectionTypes: ('overview' | 'examples' | 'faq' | 'troubleshooting')[];
  }): Promise<GeneratedSection[]>;
  
  /**
   * Improve writing quality
   */
  improveWriting(params: {
    pageId: string;
    blockIds?: string[];
    style: 'professional' | 'casual' | 'technical';
  }): Promise<WritingImprovement[]>;
  
  // ========== Q&A AND DISCOVERY ==========
  
  /**
   * Answer questions using knowledge base
   * RAG-based question answering
   */
  answerQuestion(params: {
    question: string;
    context?: {
      currentFile?: string;
      currentProject?: string;
      conversationHistory?: string[];
    };
    options?: {
      maxSources: number;
      includeCodeExamples: boolean;
      citeSources: boolean;
    };
  }): Promise<KBAnswer>;
  
  /**
   * Find related content for current context
   */
  findRelatedContent(params: {
    context: {
      code?: string;
      file?: string;
      selection?: string;
    };
    maxResults: number;
  }): Promise<RelatedContent[]>;
  
  // ========== ORGANIZATION ==========
  
  /**
   * Suggest organization improvements
   */
  suggestReorganization(params: {
    spaceId: string;
    analysisType: 'structure' | 'categories' | 'tags' | 'all';
  }): Promise<ReorganizationSuggestion[]>;
  
  /**
   * Auto-tag pages based on content
   */
  autoTag(params: {
    pageIds: string[];
    createNewTags: boolean;
    confidence: number;
  }): Promise<TagSuggestion[]>;
  
  /**
   * Suggest page links
   */
  suggestLinks(params: {
    pageId: string;
    maxSuggestions: number;
  }): Promise<LinkSuggestion[]>;
}

// ========== SUPPORTING TYPES ==========

interface KnowledgeSuggestion {
  id: string;
  type: 'new_page' | 'page_update' | 'new_section';
  
  // Content
  title: string;
  content: Block[];
  summary: string;
  
  // Organization
  suggestedSpace: string;
  suggestedCategory?: string;
  suggestedTags: string[];
  
  // Source
  source: {
    type: 'code' | 'conversation' | 'commit' | 'meeting';
    reference: string;
    excerpt?: string;
  };
  
  // Confidence
  confidence: number;
  reasoning: string;
  
  // Actions
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
}

interface KnowledgeGap {
  id: string;
  type: 'undocumented_module' | 'undocumented_api' | 'missing_guide' | 
        'incomplete_page' | 'missing_examples';
  
  // What's missing
  description: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  
  // Where it should be
  suggestedLocation: {
    spaceId: string;
    categoryId?: string;
    parentPageId?: string;
  };
  
  // Related code/content
  relatedCode?: {
    files: string[];
    symbols: string[];
  };
  relatedPages?: string[];
  
  // AI suggestion
  suggestedOutline?: string[];
  estimatedEffort: 'small' | 'medium' | 'large';
}

interface StalenessReport {
  analyzedPages: number;
  stalePages: Array<{
    pageId: string;
    title: string;
    lastUpdated: Date;
    staleDays: number;
    reason: 'age' | 'code_changed' | 'links_broken' | 'referenced_content_changed';
    relatedChanges?: Array<{
      type: 'code' | 'page';
      reference: string;
      changeDate: Date;
    }>;
    suggestedAction: 'review' | 'update' | 'archive' | 'delete';
  }>;
  healthScore: number;  // 0-100
}

interface Contradiction {
  id: string;
  type: 'factual' | 'procedural' | 'outdated' | 'conflicting_guidance';
  
  // The contradicting content
  pageA: {
    pageId: string;
    blockId?: string;
    excerpt: string;
  };
  pageB: {
    pageId: string;
    blockId?: string;
    excerpt: string;
  };
  
  // Analysis
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  // Resolution
  suggestedResolution?: string;
  correctPage?: 'pageA' | 'pageB' | 'neither' | 'unknown';
}

interface KBAnswer {
  answer: string;
  confidence: number;
  
  // Sources
  sources: Array<{
    pageId: string;
    title: string;
    excerpt: string;
    relevance: number;
  }>;
  
  // Follow-up
  suggestedFollowUps: string[];
  relatedTopics: string[];
  
  // If answer couldn't be found
  notFound?: {
    reason: 'no_relevant_docs' | 'insufficient_info' | 'contradictory_sources';
    suggestedAction: string;
  };
}
```

### 4.2 Agent Registration

```typescript
// Register with AgentRegistry
const knowledgeBaseAgent = new KnowledgeBaseAgentImpl(config);
agentRegistry.register(knowledgeBaseAgent);

// Use via AgentOrchestrator
const result = await orchestrator.execute({
  agentId: 'knowledge-base-agent',
  task: {
    type: 'extract-from-code',
    params: {
      filePaths: ['src/auth/AuthService.ts'],
      extractionLevel: 'detailed',
      targetSpace: 'technical-docs',
      includeExamples: true
    }
  },
  context: executionContext
});
```

---

## 5. Knowledge Extraction Workflows

### 5.1 Automated Extraction Triggers

```typescript
/**
 * Configuration for automatic knowledge extraction
 */
interface ExtractionWorkflowConfig {
  workspaceId: string;
  
  workflows: ExtractionWorkflow[];
  
  // Global settings
  globalSettings: {
    requireApproval: boolean;      // Require user approval for auto-created pages
    defaultConfidenceThreshold: number;
    notifyOnExtraction: boolean;
  };
}

interface ExtractionWorkflow {
  id: string;
  name: string;
  enabled: boolean;
  
  // Trigger
  trigger: ExtractionTrigger;
  
  // What to extract
  extraction: {
    types: ('decisions' | 'learnings' | 'procedures' | 'qa' | 'summaries')[];
    minConfidence: number;
  };
  
  // Where to store
  output: {
    spaceId: string;
    categoryId?: string;
    templateId?: string;
    tagsWith: string[];
  };
  
  // Processing
  processing: {
    autoApprove: boolean;
    autoPublish: boolean;
    notifyOwner: boolean;
    assignReviewer?: string;
  };
}

type ExtractionTrigger =
  | { type: 'code_review_completed'; settings: { minChanges: number } }
  | { type: 'sprint_retro_completed'; settings: { meetingType: string } }
  | { type: 'incident_resolved'; settings: { minSeverity: string } }
  | { type: 'release_completed'; settings: { releaseTypes: string[] } }
  | { type: 'architecture_decision'; settings: { requiresApproval: boolean } }
  | { type: 'pair_session_ended'; settings: { minDuration: number } }
  | { type: 'conversation_ended'; settings: { minMessages: number } }
  | { type: 'scheduled'; settings: { cron: string } };
```

### 5.2 Predefined Workflows

| Workflow | Trigger | Output |
|----------|---------|--------|
| **Code Review Learning** | Code review completed | Best practices, common issues |
| **Sprint Retrospective** | Retro meeting ended | Lessons learned, action items |
| **Incident Runbook** | Incident resolved | Troubleshooting guide, prevention steps |
| **Release Notes** | Release completed | What's new, migration guides |
| **Architecture Decision Record** | ADR approved | Design decisions, rationale |
| **Pair Programming Tips** | Pair session ended | Discovered patterns, shortcuts |
| **AI Conversation Summary** | Long conversation ended | Key decisions, code explanations |

---

## 6. Planning Module Integration

### 6.1 Bidirectional Linking

```typescript
/**
 * Deep integration between Knowledge Base and Planning Module
 */
interface PlanKnowledgeIntegration {
  // Link configuration
  links: PlanKnowledgeLink[];
  
  // Sync settings
  syncSettings: {
    autoCreateDocs: boolean;         // Auto-create docs when plan is approved
    autoLinkRelated: boolean;        // Auto-link related KB pages to plans
    syncStatusChanges: boolean;      // Update KB when plan status changes
    extractOnComplete: boolean;      // Extract learnings when plan completes
  };
}

interface PlanKnowledgeLink {
  id: string;
  
  // References
  planId: string;
  planType: 'milestone' | 'epic' | 'story' | 'task';
  pageId: string;
  
  // Link type
  linkType: PlanDocLinkType;
  
  // Sync configuration
  syncConfig: {
    autoSync: boolean;               // Auto-update when plan changes
    syncDirection: 'plan_to_kb' | 'kb_to_plan' | 'bidirectional';
    syncFields: string[];            // Which fields to sync
  };
  
  // Extraction configuration (for completed plans)
  extractionConfig?: {
    extractOnComplete: boolean;
    extractDecisions: boolean;
    extractLessonsLearned: boolean;
    extractMetrics: boolean;
    targetSpace: string;
  };
  
  // Metadata
  createdAt: Date;
  createdBy: string;
}

type PlanDocLinkType =
  | 'design_spec'           // Design specification for the plan
  | 'technical_spec'        // Technical specification
  | 'requirements'          // Requirements document
  | 'architecture'          // Architecture documentation
  | 'api_design'            // API design document
  | 'research'              // Research/investigation results
  | 'decision_record'       // Related decisions
  | 'meeting_notes'         // Planning meeting notes
  | 'retrospective'         // Retro from completed plan
  | 'lessons_learned';      // Lessons learned document

/**
 * Auto-generation from plans
 */
interface PlanToKBGenerator {
  // Generate documentation structure from plan
  generateDocStructure(planId: string, options: {
    includeSubPlans: boolean;
    templateId?: string;
    targetSpace: string;
  }): Promise<GeneratedDocStructure>;
  
  // Generate specific document types
  generateDesignSpec(planId: string): Promise<Page>;
  generateTechnicalSpec(planId: string): Promise<Page>;
  generateAPIDesign(planId: string): Promise<Page>;
  
  // Post-completion extraction
  generateRetrospective(planId: string): Promise<Page>;
  generateLessonsLearned(planId: string): Promise<Page>;
}

interface GeneratedDocStructure {
  rootPage: Page;
  childPages: Page[];
  links: PlanKnowledgeLink[];
  suggestedContent: Map<string, string>;  // pageId -> AI-suggested content
}
```

### 6.2 Planning Templates with KB Integration

```typescript
/**
 * Plan template with built-in KB page generation
 */
interface PlanTemplateWithKB {
  planTemplate: PlanTemplate;
  
  // KB pages to create with plan
  kbPages: Array<{
    templateId: string;           // KB page template
    linkType: PlanDocLinkType;
    autoCreate: boolean;
    prefillFromPlan: string[];    // Plan fields to prefill
  }>;
  
  // Auto-linking rules
  autoLinkRules: Array<{
    kbQuery: string;              // Search query to find related pages
    linkType: PlanDocLinkType;
    minRelevance: number;
  }>;
}
```

---

## 7. Code-to-Documentation Sync

### 7.1 Configuration

```typescript
/**
 * Synchronization between code and documentation
 */
interface CodeDocSyncConfig {
  workspaceId: string;
  
  // Change tracking
  tracking: {
    enabled: boolean;
    trackFiles: string[];          // Glob patterns
    ignoreFiles: string[];         // Exclusion patterns
    stalenessThreshold: 'immediate' | '24h' | '3d' | '1w';
  };
  
  // Auto-generation
  autoGenerate: {
    enabled: boolean;
    types: CodeDocType[];
    targetSpace: string;
    templateId?: string;
    requireApproval: boolean;
  };
  
  // Comment extraction
  commentSync: {
    enabled: boolean;
    extractTodos: boolean;
    extractNotes: boolean;
    extractKBLinks: boolean;
    tagPatterns: TagPattern[];
  };
  
  // Notifications
  notifications: {
    onStale: boolean;
    onCodeChange: boolean;
    notifyOwner: boolean;
    notifyTeam: boolean;
  };
}

type CodeDocType = 
  | 'module'        // Module/package documentation
  | 'class'         // Class documentation
  | 'function'      // Function/method documentation
  | 'api'           // API endpoint documentation
  | 'type'          // Type/interface documentation
  | 'config';       // Configuration documentation

interface TagPattern {
  pattern: RegExp;              // e.g., /@kb-link\s+(\S+)/
  action: 'link' | 'extract' | 'todo';
  targetProperty?: string;
}

/**
 * Code change tracking for staleness detection
 */
interface CodeChangeTracker {
  // Track code changes
  trackChange(change: CodeChange): Promise<void>;
  
  // Check if docs are stale
  checkStaleness(pageId: string): Promise<StalenessCheck>;
  
  // Get all stale docs for project
  getStaleDocsForProject(projectId: string): Promise<StalenessCheck[]>;
  
  // Link code to documentation
  linkCodeToDoc(codeRef: CodeReference, pageId: string): Promise<void>;
  
  // Get documentation for code
  getDocsForCode(codeRef: CodeReference): Promise<Page[]>;
}

interface CodeChange {
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted' | 'renamed';
  changedSymbols: string[];       // Functions, classes, etc.
  commitHash?: string;
  timestamp: Date;
}

interface StalenessCheck {
  pageId: string;
  isStale: boolean;
  staleSince?: Date;
  reason?: string;
  relatedChanges: CodeChange[];
  suggestedAction: 'review' | 'update' | 'regenerate' | 'archive';
}

interface CodeReference {
  filePath: string;
  symbolName?: string;
  lineStart?: number;
  lineEnd?: number;
  symbolType?: 'class' | 'function' | 'variable' | 'type' | 'module';
}
```

### 7.2 Inline Documentation Links

```typescript
/**
 * Support for linking KB pages from code comments
 */

// Example usage in code:
// @kb-link authentication-flow
// @kb-doc Implements the OAuth 2.0 flow as described in authentication-flow

interface InlineKBLink {
  type: 'link' | 'doc' | 'todo' | 'decision';
  pageSlug?: string;
  pageId?: string;
  text?: string;
  
  // Location in code
  location: {
    filePath: string;
    line: number;
    column: number;
  };
}

/**
 * Extract KB links from code comments
 */
interface InlineLinkExtractor {
  // Extract all KB links from file
  extractLinks(filePath: string): Promise<InlineKBLink[]>;
  
  // Extract all KB links from project
  extractAllLinks(projectPath: string): Promise<InlineKBLink[]>;
  
  // Validate links (check if pages exist)
  validateLinks(links: InlineKBLink[]): Promise<LinkValidation[]>;
  
  // Generate missing pages from @kb-doc comments
  generateMissingPages(links: InlineKBLink[]): Promise<Page[]>;
}
```

---

## 8. UI/UX Enhancements

### 8.1 Quick Capture Widget

```typescript
/**
 * Floating widget for quick knowledge capture from anywhere in IDE
 */
interface QuickCaptureConfig {
  // Activation
  hotkey: string;                  // Default: Cmd+Shift+K
  showInStatusBar: boolean;
  showFloatingButton: boolean;
  
  // Defaults
  defaultSpace: string;
  defaultCategory?: string;
  
  // Templates
  templates: QuickCaptureTemplate[];
  
  // Context capture
  autoCapture: {
    currentFile: boolean;
    selectedText: boolean;
    currentProject: boolean;
    recentConversation: boolean;
  };
  
  // Behavior
  afterCapture: 'close' | 'stay_open' | 'open_page';
  showPreview: boolean;
}

interface QuickCaptureTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  
  // Template content
  blocks: BlockTemplate[];
  
  // Organization
  targetSpace?: string;
  targetCategory?: string;
  defaultTags: string[];
  
  // Shortcuts
  hotkey?: string;
}

interface BlockTemplate {
  type: BlockType;
  placeholder?: string;
  defaultContent?: string;
  
  // AI prefill
  aiPrefill?: {
    enabled: boolean;
    prompt: string;
    contextSources: ('selection' | 'file' | 'project' | 'conversation')[];
  };
}

/**
 * Quick capture UI state
 */
interface QuickCaptureState {
  isOpen: boolean;
  selectedTemplate?: string;
  
  // Captured content
  title: string;
  content: Block[];
  tags: string[];
  space: string;
  category?: string;
  
  // Context
  capturedContext: {
    file?: string;
    selection?: string;
    project?: string;
    conversationExcerpt?: string;
  };
  
  // AI suggestions
  suggestedTitle?: string;
  suggestedTags?: string[];
  suggestedCategory?: string;
}
```

### 8.2 Knowledge Sidebar Panel

```typescript
/**
 * Activity Bar view for contextual knowledge
 */
interface KnowledgeSidebarConfig {
  // Panel sections
  sections: KnowledgeSidebarSection[];
  
  // Default state
  defaultExpandedSections: string[];
  
  // Refresh settings
  autoRefresh: boolean;
  refreshInterval: number;         // seconds
}

type KnowledgeSidebarSection =
  | {
      type: 'related_docs';
      title: string;
      maxItems: number;
      contextSource: 'current_file' | 'current_project' | 'selection';
    }
  | {
      type: 'recent_changes';
      title: string;
      maxItems: number;
      scope: 'team' | 'project' | 'space';
    }
  | {
      type: 'suggestions';
      title: string;
      maxItems: number;
      suggestionTypes: ('create' | 'update' | 'review')[];
    }
  | {
      type: 'favorites';
      title: string;
      showRecentlyViewed: boolean;
    }
  | {
      type: 'search';
      title: string;
      defaultScope: 'all' | 'space' | 'project';
    }
  | {
      type: 'quick_capture';
      title: string;
      templates: string[];        // Template IDs
    };

/**
 * Related docs component
 */
interface RelatedDocsPanel {
  // Current context
  context: {
    currentFile?: string;
    currentSymbol?: string;
    selection?: string;
  };
  
  // Related pages
  relatedPages: Array<{
    pageId: string;
    title: string;
    relevanceScore: number;
    relevanceReason: string;
    lastUpdated: Date;
    isStale: boolean;
  }>;
  
  // Actions
  onPageClick(pageId: string): void;
  onCreateDoc(): void;
  onRefresh(): void;
}
```

### 8.3 Editor Integration

```typescript
/**
 * Monaco editor integration for knowledge base
 */
interface EditorKBIntegration {
  // Hover information
  hoverProvider: {
    enabled: boolean;
    showKBLinks: boolean;          // Show KB page links on hover
    showInlinePreview: boolean;    // Show page preview on hover
  };
  
  // Code lens
  codeLens: {
    enabled: boolean;
    showDocStatus: boolean;        // "Documented" / "No docs"
    showStaleWarning: boolean;     // Warning if docs are stale
    showLinkCount: boolean;        // Number of KB links
  };
  
  // Inline completions
  completions: {
    enabled: boolean;
    triggerCharacters: string[];   // e.g., '@kb-'
    suggestPages: boolean;
    suggestTemplates: boolean;
  };
  
  // Diagnostics
  diagnostics: {
    enabled: boolean;
    warnOnMissingDocs: boolean;
    warnOnStaleDocs: boolean;
    errorOnBrokenLinks: boolean;
  };
}
```

---

## 9. Security & Access Control

### 9.1 Granular Permissions Model

```typescript
/**
 * Extended permission model for knowledge base
 * Integrates with RBAC system in server/src/middleware/rbac.ts
 */
interface KBPermissions {
  // Page-level permissions
  page: {
    canView: boolean;
    canEdit: boolean;
    canComment: boolean;
    canShare: boolean;
    canDelete: boolean;
    canArchive: boolean;
    canRestore: boolean;
    canViewHistory: boolean;
    canExport: boolean;
  };
  
  // Block-level permissions (for sensitive sections)
  blocks?: Record<string, BlockPermissions>;
  
  // Property-level permissions (for database views)
  properties?: Record<string, PropertyPermissions>;
  
  // Export restrictions
  export: {
    canExport: boolean;
    allowedFormats: ('md' | 'pdf' | 'html' | 'docx')[];
    watermarkOnExport: boolean;
    includeComments: boolean;
    includeHistory: boolean;
  };
  
  // Sharing restrictions
  sharing: {
    canShareInternally: boolean;
    canShareExternally: boolean;
    canCreatePublicLink: boolean;
    maxShareDuration?: number;     // days
    requirePassword: boolean;
  };
}

interface BlockPermissions {
  canView: boolean;
  canEdit: boolean;
  requiresApproval: boolean;
  approvers?: string[];            // User IDs
  viewRestriction?: 'all' | 'team' | 'specific';
  allowedViewers?: string[];
}

interface PropertyPermissions {
  canView: boolean;
  canEdit: boolean;
  isEncrypted: boolean;            // For sensitive data
}

/**
 * Content classification for security
 */
interface ContentClassification {
  pageId: string;
  
  // Classification level
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  
  // Auto-classification
  isAutoClassified: boolean;
  classificationReason?: string;
  
  // Sensitive content detection
  sensitiveContent?: {
    detected: boolean;
    types: ('pii' | 'credentials' | 'financial' | 'legal')[];
    locations: Array<{
      blockId: string;
      type: string;
      confidence: number;
    }>;
  };
  
  // Compliance
  compliance?: {
    gdpr: boolean;
    hipaa: boolean;
    sox: boolean;
  };
  
  // Retention
  retentionPolicy?: {
    deleteAfter?: Date;
    archiveAfter?: Date;
    reviewRequired: boolean;
  };
}

/**
 * Audit logging for knowledge base
 */
interface KBAuditLog {
  id: string;
  timestamp: Date;
  
  // Actor
  userId: string;
  userEmail: string;
  ipAddress?: string;
  
  // Action
  action: KBAuditAction;
  resourceType: 'page' | 'block' | 'space' | 'database';
  resourceId: string;
  
  // Details
  details: Record<string, any>;
  
  // Before/After for changes
  before?: any;
  after?: any;
}

type KBAuditAction =
  | 'view' | 'create' | 'update' | 'delete'
  | 'share' | 'unshare' | 'export' | 'import'
  | 'archive' | 'restore'
  | 'permission_change' | 'classification_change';
```

### 9.2 Access Control Integration

```typescript
/**
 * Integration with existing RBAC system
 */
interface KBRBACIntegration {
  // Permission checks
  checkPageAccess(userId: string, pageId: string, action: string): Promise<boolean>;
  checkSpaceAccess(userId: string, spaceId: string, action: string): Promise<boolean>;
  checkBlockAccess(userId: string, blockId: string, action: string): Promise<boolean>;
  
  // Get effective permissions
  getEffectivePermissions(userId: string, pageId: string): Promise<KBPermissions>;
  
  // Permission inheritance
  inheritanceChain(pageId: string): Promise<PermissionChain>;
}

interface PermissionChain {
  page: { id: string; permissions: KBPermissions };
  parent?: PermissionChain;
  space: { id: string; permissions: Partial<KBPermissions> };
  workspace: { id: string; permissions: Partial<KBPermissions> };
  
  // Effective (computed)
  effective: KBPermissions;
}
```

---

## 10. Performance Optimizations

### 10.1 Incremental Loading

```typescript
/**
 * Configuration for page loading optimization
 */
interface PageLoadConfig {
  // Block loading
  blocks: {
    initialBlockCount: number;     // Default: 20
    loadMoreThreshold: number;     // Load more when N blocks from bottom
    loadBatchSize: number;         // How many to load at once
    preloadAhead: number;          // Preload N blocks ahead
  };
  
  // Database virtualization
  database: {
    virtualizeThreshold: number;   // Virtualize tables > N rows
    rowHeight: number;             // For virtualization calculations
    overscan: number;              // Extra rows to render
  };
  
  // Media loading
  media: {
    lazyLoadImages: boolean;
    lazyLoadEmbeds: boolean;
    imageLoadThreshold: number;    // px from viewport
    placeholderType: 'skeleton' | 'blur' | 'icon' | 'none';
    maxConcurrentLoads: number;
  };
  
  // Code blocks
  code: {
    syntaxHighlightDelay: number;  // ms delay for syntax highlighting
    maxHighlightLines: number;     // Don't highlight blocks > N lines
    lazyHighlight: boolean;        // Only highlight visible blocks
  };
}

/**
 * Real-time collaboration optimization
 */
interface CollaborationOptimization {
  // CRDT configuration
  crdt: {
    mergeInterval: number;         // ms between merge operations
    batchOperations: boolean;
    maxBatchSize: number;
  };
  
  // Presence
  presence: {
    updateInterval: number;        // ms between presence updates
    cursorSmoothness: number;      // Cursor animation smoothness
    maxVisibleCursors: number;
  };
  
  // Sync
  sync: {
    debounceDelay: number;         // ms before syncing changes
    maxPendingChanges: number;
    compressionEnabled: boolean;
  };
}
```

### 10.2 Caching Strategy

```typescript
/**
 * Multi-layer caching for knowledge base
 */
interface KBCacheConfig {
  // Memory cache (in-process)
  memory: {
    enabled: boolean;
    maxSize: number;               // MB
    ttl: number;                   // seconds
    cacheBlocks: boolean;
    cacheSearchResults: boolean;
  };
  
  // Local storage cache (browser)
  localStorage: {
    enabled: boolean;
    maxSize: number;               // MB
    syncInterval: number;          // seconds
    cachePages: boolean;
    cacheEmbeddings: boolean;
  };
  
  // IndexedDB cache (for offline)
  indexedDB: {
    enabled: boolean;
    maxSize: number;               // MB
    cacheFullPages: boolean;
    cacheAttachments: boolean;
  };
  
  // Redis cache (server-side)
  redis: {
    enabled: boolean;
    ttl: number;                   // seconds
    cacheSearchResults: boolean;
    cacheEmbeddings: boolean;
    cacheGraphQueries: boolean;
  };
  
  // Invalidation
  invalidation: {
    strategy: 'immediate' | 'lazy' | 'ttl';
    propagateToClients: boolean;
  };
}
```

### 10.3 Offline-First Architecture

```typescript
/**
 * Offline support configuration
 */
interface OfflineConfig {
  // What to sync offline
  sync: {
    strategy: 'all' | 'favorites' | 'recent' | 'explicit' | 'smart';
    smartSyncRules?: Array<{
      condition: 'frequently_accessed' | 'recently_edited' | 'assigned_to_me';
      maxItems: number;
    }>;
    maxOfflineStorage: number;     // MB
    syncAttachments: boolean;
    attachmentMaxSize: number;     // MB per attachment
  };
  
  // Conflict resolution
  conflicts: {
    resolution: 'server_wins' | 'client_wins' | 'manual' | 'auto_merge';
    autoMergeStrategy?: 'last_write' | 'crdt' | 'three_way';
    notifyOnConflict: boolean;
    keepConflictHistory: boolean;
  };
  
  // Background sync
  backgroundSync: {
    enabled: boolean;
    syncInterval: number;          // seconds
    syncOnReconnect: boolean;
    syncOnForeground: boolean;
    retryAttempts: number;
    retryDelay: number;            // seconds
  };
  
  // Offline indicators
  ui: {
    showOfflineIndicator: boolean;
    showSyncStatus: boolean;
    showPendingChanges: boolean;
    warnOnOfflineEdit: boolean;
  };
}

/**
 * Offline operation queue
 */
interface OfflineOperationQueue {
  // Queue operations when offline
  enqueue(operation: KBOperation): Promise<void>;
  
  // Process queue when online
  processQueue(): Promise<QueueProcessResult>;
  
  // Get pending operations
  getPendingOperations(): Promise<KBOperation[]>;
  
  // Clear queue (with optional sync)
  clearQueue(sync: boolean): Promise<void>;
}

interface KBOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resourceType: 'page' | 'block' | 'comment';
  resourceId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

interface QueueProcessResult {
  processed: number;
  failed: number;
  conflicts: Array<{
    operation: KBOperation;
    serverVersion: any;
    resolution?: 'applied' | 'rejected' | 'merged' | 'pending';
  }>;
}
```

---

## 11. Analytics & Insights

### 11.1 Knowledge Health Dashboard

```typescript
/**
 * Comprehensive knowledge base health metrics
 */
interface KnowledgeHealthMetrics {
  // Timestamp
  calculatedAt: Date;
  period: 'day' | 'week' | 'month' | 'quarter';
  
  // Coverage metrics
  coverage: {
    totalModules: number;
    documentedModules: number;
    undocumentedModules: string[];
    documentationCompleteness: number;  // percentage
    apiDocCoverage: number;             // percentage of APIs documented
    codeCommentCoverage: number;        // percentage
  };
  
  // Freshness metrics
  freshness: {
    averagePageAge: number;             // days
    medianPageAge: number;
    stalePages: Array<{
      pageId: string;
      title: string;
      lastUpdated: Date;
      staleDays: number;
      owner?: string;
    }>;
    stalePagesCount: number;
    recentlyUpdatedCount: number;       // Last 7 days
    lastGlobalUpdate: Date;
  };
  
  // Quality metrics
  quality: {
    averagePageLength: number;          // words
    averageReadabilityScore: number;    // Flesch-Kincaid or similar
    pagesWithImages: number;
    pagesWithCodeExamples: number;
    pagesWithBrokenLinks: number;
    pagesWithoutOwner: number;
    orphanedPages: number;              // No inbound links
    duplicateContentCount: number;
  };
  
  // Usage metrics
  usage: {
    totalViews: number;
    uniqueViewers: number;
    mostViewedPages: Array<{
      pageId: string;
      title: string;
      views: number;
      uniqueViewers: number;
    }>;
    leastViewedPages: Array<{
      pageId: string;
      title: string;
      views: number;
      daysSinceLastView: number;
    }>;
    searchMetrics: {
      totalSearches: number;
      uniqueSearchers: number;
      topSearchTerms: Array<{ term: string; count: number }>;
      searchMissRate: number;           // Searches with no results
      averageResultsClicked: number;
    };
  };
  
  // Contribution metrics
  contributions: {
    activeContributors: number;
    topContributors: Array<{
      userId: string;
      name: string;
      pagesCreated: number;
      edits: number;
    }>;
    averageEditsPerPage: number;
    newPagesThisPeriod: number;
    editedPagesThisPeriod: number;
  };
  
  // AI metrics
  ai: {
    aiGeneratedPages: number;
    aiAssistedEdits: number;
    suggestionAcceptanceRate: number;
    gapsSuggested: number;
    gapsAddressed: number;
  };
  
  // Overall health score
  healthScore: number;                  // 0-100
  healthTrend: 'improving' | 'stable' | 'declining';
  recommendations: HealthRecommendation[];
}

interface HealthRecommendation {
  id: string;
  type: 'coverage' | 'freshness' | 'quality' | 'usage' | 'organization';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  suggestedAction: string;
  affectedItems?: string[];
}
```

### 11.2 Usage Analytics

```typescript
/**
 * Detailed usage tracking
 */
interface KBUsageAnalytics {
  // Page analytics
  getPageAnalytics(pageId: string, period: DateRange): Promise<PageAnalytics>;
  
  // Space analytics
  getSpaceAnalytics(spaceId: string, period: DateRange): Promise<SpaceAnalytics>;
  
  // Search analytics
  getSearchAnalytics(period: DateRange): Promise<SearchAnalytics>;
  
  // User analytics
  getUserAnalytics(userId: string, period: DateRange): Promise<UserKBAnalytics>;
  
  // Trend analysis
  getTrends(metric: string, period: DateRange): Promise<TrendData>;
}

interface PageAnalytics {
  pageId: string;
  period: DateRange;
  
  views: {
    total: number;
    unique: number;
    byDay: Array<{ date: Date; views: number }>;
    byHour: Array<{ hour: number; views: number }>;
  };
  
  engagement: {
    averageTimeOnPage: number;          // seconds
    scrollDepth: number;                // percentage
    bounceRate: number;
    exitRate: number;
  };
  
  interactions: {
    edits: number;
    comments: number;
    shares: number;
    exports: number;
    searches: number;                   // Times found in search
    searchClicks: number;               // Times clicked from search
  };
  
  referrers: Array<{
    source: 'search' | 'link' | 'sidebar' | 'external' | 'direct';
    count: number;
  }>;
}

interface SearchAnalytics {
  period: DateRange;
  
  overview: {
    totalSearches: number;
    uniqueSearchers: number;
    averageResultsPerSearch: number;
    averageTimeToClick: number;         // seconds
  };
  
  topTerms: Array<{
    term: string;
    count: number;
    clickThroughRate: number;
    averagePosition: number;            // Average position of clicked result
  }>;
  
  failedSearches: Array<{
    term: string;
    count: number;
    suggestedContent?: string;
  }>;
  
  searchPaths: Array<{
    query: string;
    refinements: string[];
    resultClicked?: string;
    successful: boolean;
  }>;
}
```

---

## 12. Smart Template System

### 12.1 Enhanced Templates

```typescript
/**
 * Smart templates with AI prefill and automation
 */
interface SmartTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  
  // Category
  category: 'documentation' | 'meeting' | 'project' | 'technical' | 'custom';
  
  // Standard template content
  content: {
    title: TemplateTitle;
    blocks: TemplateBlock[];
    defaultProperties?: Record<string, any>;
    defaultTags?: string[];
  };
  
  // AI prefill configuration
  aiPrefill?: {
    enabled: boolean;
    contextSources: AIContextSource[];
    
    // Per-block prefill rules
    blockRules: Array<{
      blockId: string;
      prompt: string;
      contextRequired: AIContextSource[];
      fallbackContent?: string;
    }>;
    
    // Title generation
    titleGeneration?: {
      enabled: boolean;
      prompt: string;
    };
    
    // Tag suggestions
    tagSuggestions?: {
      enabled: boolean;
      maxTags: number;
    };
  };
  
  // Auto-create triggers
  triggers?: TemplateTrigger[];
  
  // Variables
  variables?: TemplateVariable[];
  
  // Permissions
  permissions: {
    canUse: string[];              // Role IDs
    canEdit: string[];
    isPublic: boolean;
  };
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

interface TemplateTitle {
  format: string;                 // e.g., "{{date}} - {{project}} Meeting Notes"
  variables: string[];
  aiGenerate?: boolean;
}

interface TemplateBlock {
  id: string;
  type: BlockType;
  
  // Static content
  content?: string;
  placeholder?: string;
  
  // Dynamic content
  variable?: string;
  aiPrefill?: boolean;
  
  // Validation
  required?: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

type AIContextSource =
  | 'current_file'
  | 'current_project'
  | 'selection'
  | 'conversation'
  | 'recent_commits'
  | 'related_pages'
  | 'user_profile'
  | 'calendar_event';

interface TemplateTrigger {
  id: string;
  event: TemplateEvent;
  
  // Conditions
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'matches';
    value: any;
  }>;
  
  // Actions
  autoCreate: boolean;
  targetSpace: string;
  assignTo?: string;
  notifyUsers?: string[];
}

type TemplateEvent =
  | 'new_module_detected'
  | 'new_api_endpoint'
  | 'incident_created'
  | 'incident_resolved'
  | 'release_planned'
  | 'release_completed'
  | 'sprint_started'
  | 'sprint_completed'
  | 'meeting_scheduled'
  | 'pr_merged'
  | 'manual';

interface TemplateVariable {
  name: string;
  type: 'text' | 'select' | 'date' | 'user' | 'project' | 'computed';
  
  // For select type
  options?: string[];
  
  // For computed type
  computation?: {
    source: AIContextSource;
    extraction: string;           // AI prompt for extraction
  };
  
  // Default value
  default?: any;
  required?: boolean;
}
```

### 12.2 Template Library

```typescript
/**
 * Predefined template library
 */
const PREDEFINED_TEMPLATES: SmartTemplate[] = [
  // Technical Documentation
  {
    id: 'module-documentation',
    name: 'Module Documentation',
    category: 'documentation',
    aiPrefill: {
      enabled: true,
      contextSources: ['current_file', 'current_project'],
      blockRules: [
        { blockId: 'overview', prompt: 'Generate overview based on module code' },
        { blockId: 'api', prompt: 'Document public API from code' },
        { blockId: 'examples', prompt: 'Generate usage examples' }
      ]
    },
    triggers: [
      { event: 'new_module_detected', autoCreate: true }
    ]
  },
  
  // API Documentation
  {
    id: 'api-endpoint',
    name: 'API Endpoint Documentation',
    category: 'technical',
    aiPrefill: {
      enabled: true,
      contextSources: ['current_file', 'selection'],
      blockRules: [
        { blockId: 'endpoint', prompt: 'Extract endpoint details' },
        { blockId: 'params', prompt: 'Document parameters' },
        { blockId: 'examples', prompt: 'Generate request/response examples' }
      ]
    }
  },
  
  // Meeting Notes
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    category: 'meeting',
    aiPrefill: {
      enabled: true,
      contextSources: ['calendar_event', 'conversation']
    },
    triggers: [
      { event: 'meeting_scheduled', autoCreate: true }
    ]
  },
  
  // Architecture Decision Record
  {
    id: 'adr',
    name: 'Architecture Decision Record',
    category: 'technical',
    content: {
      blocks: [
        { type: 'heading_1', content: 'ADR-{{number}}: {{title}}' },
        { type: 'heading_2', content: 'Status' },
        { type: 'paragraph', placeholder: 'Proposed | Accepted | Deprecated | Superseded' },
        { type: 'heading_2', content: 'Context' },
        { type: 'paragraph', aiPrefill: true },
        { type: 'heading_2', content: 'Decision' },
        { type: 'paragraph', required: true },
        { type: 'heading_2', content: 'Consequences' },
        { type: 'paragraph', aiPrefill: true }
      ]
    }
  },
  
  // Incident Report
  {
    id: 'incident-report',
    name: 'Incident Report',
    category: 'technical',
    aiPrefill: {
      enabled: true,
      contextSources: ['conversation', 'recent_commits']
    },
    triggers: [
      { event: 'incident_resolved', autoCreate: true }
    ]
  },
  
  // Release Notes
  {
    id: 'release-notes',
    name: 'Release Notes',
    category: 'project',
    aiPrefill: {
      enabled: true,
      contextSources: ['recent_commits', 'related_pages']
    },
    triggers: [
      { event: 'release_completed', autoCreate: true }
    ]
  }
];
```

---

## 13. Priority Matrix

### Implementation Priority

| Priority | Recommendation | Impact | Effort | Dependencies |
|----------|----------------|--------|--------|--------------|
| 🔴 **P0** | Create Part 2 specification | Critical | Medium | None |
| 🔴 **P0** | Semantic search with embeddings | High | High | Vector DB setup |
| 🟠 **P1** | Knowledge Base Agent | High | High | Agent Module |
| 🟠 **P1** | Knowledge Graph layer | High | High | Database schema |
| 🟠 **P1** | Granular permissions model | High | Medium | RBAC integration |
| 🟡 **P2** | Quick Capture widget | Medium | Low | UI framework |
| 🟡 **P2** | Code-to-Doc sync | Medium | Medium | File watcher |
| 🟡 **P2** | Planning Module integration | Medium | Medium | Planning Module |
| 🟡 **P2** | Offline-first architecture | Medium | High | IndexedDB, CRDT |
| 🟢 **P3** | Health dashboard | Low | Medium | Analytics setup |
| 🟢 **P3** | Smart templates | Low | Medium | AI integration |
| 🟢 **P3** | Knowledge extraction workflows | Low | High | Multiple integrations |

### Implementation Phases

**Phase 1: Foundation (Weeks 1-4)**
- Complete Part 2 specification
- Set up vector database (pgvector)
- Implement basic semantic search
- Design Knowledge Graph schema

**Phase 2: Core AI Features (Weeks 5-8)**
- Implement Knowledge Base Agent
- Build embedding pipeline
- Create basic graph queries
- Integrate with Agent Orchestrator

**Phase 3: Integration (Weeks 9-12)**
- Planning Module integration
- Code-to-Doc sync
- Quick Capture widget
- Knowledge sidebar panel

**Phase 4: Advanced Features (Weeks 13-16)**
- Knowledge extraction workflows
- Smart templates
- Health dashboard
- Offline support

---

## Appendix A: Related Module References

- **Agent Module**: `src/core/agents/` - For Knowledge Base Agent integration
- **Planning Module**: `src/core/planning/` - For bidirectional plan-KB linking
- **RBAC Middleware**: `server/src/middleware/rbac.ts` - For permissions integration
- **Context Aggregation**: `src/core/context/` - For code context extraction
- **Database Schema**: `server/database/` - For schema extensions

---

## Appendix B: Technology Recommendations

| Component | Recommended Technology | Alternative |
|-----------|----------------------|-------------|
| Vector Database | pgvector (PostgreSQL) | Pinecone, Milvus |
| Embedding Model | OpenAI text-embedding-3-small | Local E5, Cohere |
| Graph Database | PostgreSQL with recursive CTEs | Neo4j |
| Real-time Sync | Yjs (CRDT) | Automerge |
| Offline Storage | IndexedDB | SQLite (via sql.js) |
| Search UI | Algolia InstantSearch | Custom |

---

## Appendix C: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-20 | Initial recommendations document |

---

*This document complements the main Knowledge Base specification and should be reviewed alongside `knowledge-base-spec-v2-part1.md`.*

