/**
 * Agent Registry types
 * Core data model for specialized AI agent management
 */

export enum AgentType {
  ARCHITECTURE = 'architecture',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  REFACTORING = 'refactoring',
  DATABASE = 'database',
  API_DESIGN = 'api_design',
  UI_UX = 'ui_ux',
  DEVOPS = 'devops',
  CODE_REVIEW = 'code_review',
  MIGRATION = 'migration',
  QUALITY = 'quality',
  OBSERVABILITY = 'observability',
  CUSTOM = 'custom',
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
  MAINTENANCE = 'maintenance',
}

export enum AgentScope {
  GLOBAL = 'global',
  PROJECT = 'project',
  USER = 'user',
  EPHEMERAL = 'ephemeral',
}

export enum MemoryType {
  NONE = 'none',
  SESSION = 'session',
  PERSISTENT = 'persistent',
}

/**
 * Agent
 */
export interface Agent {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description: string;
  type: AgentType;
  scope: AgentScope;
  ownerId: string; // User ID, project ID, or 'system' for global
  status: AgentStatus;
  version: string;
  instructions: {
    systemPrompt: string;
    dynamicPromptRefs?: string[]; // References to dynamic prompts
  };
  capabilities: {
    tools?: string[]; // Available tools (e.g., 'read_files', 'write_files')
    apis?: string[]; // Available APIs (e.g., 'github', 'jira')
    permissions?: {
      writeScope?: 'limited' | 'full';
      environmentAccess?: 'dev' | 'test' | 'prod';
    };
  };
  constraints?: {
    forbiddenActions?: string[];
    maxFilesChanged?: number;
    maxTokens?: number;
    timeout?: number; // Timeout in seconds
  };
  memory?: {
    type: MemoryType;
    storage?: 'vector' | 'db' | 'file';
    ttl?: number; // Time to live in days
  };
  triggers?: {
    manual?: boolean;
    events?: string[]; // Event triggers (e.g., 'on_codegen_complete')
  };
  outputs?: {
    artifacts?: string[]; // Output artifacts (e.g., 'code_diff', 'report')
    schema?: {
      type: 'json' | 'text' | 'code';
      requiredFields?: string[];
    };
  };
  metadata?: {
    tags?: string[];
    category?: string;
    author?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  metrics?: {
    totalExecutions?: number;
    successRate?: number;
    averageExecutionTime?: number; // in milliseconds
    lastExecutedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Agent Execution
 */
export interface AgentExecution {
  id: string;
  tenantId: string; // Partition key
  agentId: string;
  task: string; // Task description
  input?: Record<string, any>;
  output?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  executionTime?: number; // in milliseconds
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
 * Agent Selection Criteria
 */
export interface AgentSelectionCriteria {
  task: string;
  taskType?: string;
  requiredCapabilities?: string[];
  preferredAgentTypes?: AgentType[];
  scope?: AgentScope;
  maxTokens?: number;
  timeout?: number;
}

/**
 * Create agent input
 */
export interface CreateAgentInput {
  tenantId: string;
  userId: string;
  name: string;
  description: string;
  type: AgentType;
  scope: AgentScope;
  ownerId?: string;
  instructions: {
    systemPrompt: string;
    dynamicPromptRefs?: string[];
  };
  capabilities?: {
    tools?: string[];
    apis?: string[];
    permissions?: {
      writeScope?: 'limited' | 'full';
      environmentAccess?: 'dev' | 'test' | 'prod';
    };
  };
  constraints?: {
    forbiddenActions?: string[];
    maxFilesChanged?: number;
    maxTokens?: number;
    timeout?: number;
  };
  memory?: {
    type: MemoryType;
    storage?: 'vector' | 'db' | 'file';
    ttl?: number;
  };
  triggers?: {
    manual?: boolean;
    events?: string[];
  };
  outputs?: {
    artifacts?: string[];
    schema?: {
      type: 'json' | 'text' | 'code';
      requiredFields?: string[];
    };
  };
  metadata?: {
    tags?: string[];
    category?: string;
  };
}

/**
 * Update agent input
 */
export interface UpdateAgentInput {
  name?: string;
  description?: string;
  status?: AgentStatus;
  instructions?: {
    systemPrompt?: string;
    dynamicPromptRefs?: string[];
  };
  capabilities?: {
    tools?: string[];
    apis?: string[];
    permissions?: {
      writeScope?: 'limited' | 'full';
      environmentAccess?: 'dev' | 'test' | 'prod';
    };
  };
  constraints?: {
    forbiddenActions?: string[];
    maxFilesChanged?: number;
    maxTokens?: number;
    timeout?: number;
  };
  memory?: {
    type?: MemoryType;
    storage?: 'vector' | 'db' | 'file';
    ttl?: number;
  };
  triggers?: {
    manual?: boolean;
    events?: string[];
  };
  outputs?: {
    artifacts?: string[];
    schema?: {
      type?: 'json' | 'text' | 'code';
      requiredFields?: string[];
    };
  };
  metadata?: {
    tags?: string[];
    category?: string;
  };
}

/**
 * Execute agent input
 */
export interface ExecuteAgentInput {
  tenantId: string;
  userId: string;
  agentId: string;
  task: string;
  input?: Record<string, any>;
}

