/**
 * Context Service types
 * Core data model for context management and assembly
 */

export enum ContextType {
  FILE = 'file',
  FUNCTION = 'function',
  MODULE = 'module',
  CLASS = 'class',
  INTERFACE = 'interface',
  TYPE = 'type',
  VARIABLE = 'variable',
  DEPENDENCY = 'dependency',
  CALL_GRAPH = 'call_graph',
  AST = 'ast',
  CODEBASE_GRAPH = 'codebase_graph',
}

export enum ContextScope {
  FILE = 'file',
  MODULE = 'module',
  PACKAGE = 'package',
  PROJECT = 'project',
  WORKSPACE = 'workspace',
}

export enum AnalysisStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Context
 */
export interface Context {
  id: string;
  tenantId: string; // Partition key
  type: ContextType;
  scope: ContextScope;
  path: string; // File path or identifier
  name: string;
  content?: string; // Actual content (code, AST, etc.)
  metadata?: {
    language?: string;
    size?: number;
    lineCount?: number;
    complexity?: number;
    lastModified?: Date;
    hash?: string; // Content hash for change detection
  };
  ast?: any; // AST representation
  dependencies?: string[]; // IDs of dependent contexts
  dependents?: string[]; // IDs of contexts that depend on this
  callers?: string[]; // Function/class callers
  callees?: string[]; // Functions/classes called
  embeddings?: {
    embeddingId: string;
    vector?: number[];
  };
  relevanceScore?: number; // 0-1 relevance score
  tokenCount?: number;
  createdAt: Date;
  updatedAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Context Analysis
 */
export interface ContextAnalysis {
  id: string;
  tenantId: string; // Partition key
  contextId: string; // Reference to context
  analysisType: 'ast' | 'dependency' | 'call_graph' | 'codebase_graph' | 'runtime';
  status: AnalysisStatus;
  result?: {
    ast?: any;
    dependencies?: Array<{
      id: string;
      type: string;
      path: string;
      relationship: 'import' | 'require' | 'extends' | 'implements' | 'uses';
    }>;
    callGraph?: {
      nodes: Array<{ id: string; name: string; type: string }>;
      edges: Array<{ from: string; to: string; type: string }>;
    };
    codebaseGraph?: {
      nodes: Array<{ id: string; name: string; type: string; metadata?: any }>;
      edges: Array<{ from: string; to: string; type: string; weight?: number }>;
    };
    runtimeBehavior?: any;
  };
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Context Assembly Request
 */
export interface ContextAssemblyRequest {
  tenantId: string;
  userId: string;
  task: string; // Description of the task
  scope: ContextScope;
  targetPath?: string; // Target file/path for context
  includeTypes?: ContextType[]; // Types of context to include
  excludeTypes?: ContextType[]; // Types to exclude
  maxTokens?: number; // Token budget
  maxFiles?: number; // Maximum number of files
  includeDependencies?: boolean; // Include dependency context
  includeCallers?: boolean; // Include caller context
  includeCallees?: boolean; // Include callee context
  relevanceThreshold?: number; // Minimum relevance score (0-1)
  compression?: boolean; // Enable context compression
}

/**
 * Context Assembly Result
 */
export interface ContextAssembly {
  id: string;
  tenantId: string; // Partition key
  requestId: string; // Reference to assembly request
  contexts: Array<{
    contextId: string;
    type: ContextType;
    path: string;
    name: string;
    relevanceScore: number;
    tokenCount: number;
    snippet?: string; // Relevant snippet
  }>;
  totalTokens: number;
  compressionRatio?: number;
  assembledAt: Date;
  expiresAt?: Date; // Cache expiration
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Dependency Tree
 */
export interface DependencyTree {
  id: string;
  tenantId: string; // Partition key
  rootPath: string;
  tree: {
    path: string;
    type: string;
    dependencies: DependencyTree['tree'][];
  };
  depth: number;
  totalNodes: number;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Call Graph
 */
export interface CallGraph {
  id: string;
  tenantId: string; // Partition key
  rootFunction?: string; // Starting function
  scope: ContextScope;
  nodes: Array<{
    id: string;
    name: string;
    type: 'function' | 'method' | 'class' | 'module';
    path: string;
    metadata?: any;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: 'call' | 'import' | 'extend' | 'implement';
    weight?: number;
  }>;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create context input
 */
export interface CreateContextInput {
  tenantId: string;
  userId: string;
  type: ContextType;
  scope: ContextScope;
  path: string;
  name: string;
  content?: string;
  metadata?: Context['metadata'];
  ast?: any;
  dependencies?: string[];
  dependents?: string[];
  callers?: string[];
  callees?: string[];
}

/**
 * Update context input
 */
export interface UpdateContextInput {
  content?: string;
  metadata?: Context['metadata'];
  ast?: any;
  dependencies?: string[];
  dependents?: string[];
  callers?: string[];
  callees?: string[];
  embeddings?: Context['embeddings'];
  relevanceScore?: number;
  tokenCount?: number;
}

/**
 * Assemble context input
 */
export interface AssembleContextInput {
  task: string;
  scope: ContextScope;
  targetPath?: string;
  includeTypes?: ContextType[];
  excludeTypes?: ContextType[];
  maxTokens?: number;
  maxFiles?: number;
  includeDependencies?: boolean;
  includeCallers?: boolean;
  includeCallees?: boolean;
  relevanceThreshold?: number;
  compression?: boolean;
}

