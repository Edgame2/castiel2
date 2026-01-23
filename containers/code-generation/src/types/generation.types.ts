/**
 * Code Generation types
 * Core data model for specialized code generation
 */

export enum GenerationType {
  UI_COMPONENT = 'ui_component',
  API_ENDPOINT = 'api_endpoint',
  DATABASE_SCHEMA = 'database_schema',
  TEST_DATA = 'test_data',
  CONFIGURATION = 'configuration',
  MIGRATION = 'migration',
  IAC = 'iac',
  CUSTOM = 'custom',
}

export enum GenerationStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum OutputFormat {
  CODE = 'code',
  JSON = 'json',
  YAML = 'yaml',
  MARKDOWN = 'markdown',
  MULTIPLE = 'multiple',
}

/**
 * Code Generation Job
 */
export interface CodeGenerationJob {
  id: string;
  tenantId: string; // Partition key
  name?: string;
  description?: string;
  type: GenerationType;
  status: GenerationStatus;
  templateId?: string; // Reference to generation template
  input: {
    specification?: string; // Natural language specification
    requirements?: Record<string, any>; // Structured requirements
    context?: string[]; // Context IDs or paths
    examples?: string[]; // Example code snippets
  };
  output?: {
    files?: Array<{
      path: string;
      content: string;
      language?: string;
      format?: OutputFormat;
    }>;
    artifacts?: Array<{
      type: string;
      name: string;
      content: string;
      format?: OutputFormat;
    }>;
  };
  validation?: {
    passed?: boolean;
    errors?: string[];
    warnings?: string[];
  };
  metadata?: {
    language?: string;
    framework?: string;
    tags?: string[];
    estimatedTokens?: number;
    actualTokens?: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  error?: string;
  createdAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Generation Template
 */
export interface GenerationTemplate {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  type: GenerationType;
  template: {
    prompt?: string; // Prompt template
    systemPrompt?: string; // System prompt
    codeTemplate?: string; // Code template with placeholders
    rules?: string[]; // Generation rules
    constraints?: Record<string, any>; // Constraints
  };
  examples?: Array<{
    input: Record<string, any>;
    output: string;
  }>;
  metadata?: {
    language?: string;
    framework?: string;
    tags?: string[];
    version?: string;
    author?: string;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create generation job input
 */
export interface CreateGenerationJobInput {
  tenantId: string;
  userId: string;
  name?: string;
  description?: string;
  type: GenerationType;
  templateId?: string;
  input: {
    specification?: string;
    requirements?: Record<string, any>;
    context?: string[];
    examples?: string[];
  };
  metadata?: {
    language?: string;
    framework?: string;
    tags?: string[];
  };
}

/**
 * Update generation job input
 */
export interface UpdateGenerationJobInput {
  name?: string;
  description?: string;
  status?: GenerationStatus;
  output?: CodeGenerationJob['output'];
  validation?: CodeGenerationJob['validation'];
  error?: string;
}

/**
 * Create template input
 */
export interface CreateTemplateInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  type: GenerationType;
  template: {
    prompt?: string;
    systemPrompt?: string;
    codeTemplate?: string;
    rules?: string[];
    constraints?: Record<string, any>;
  };
  examples?: Array<{
    input: Record<string, any>;
    output: string;
  }>;
  metadata?: {
    language?: string;
    framework?: string;
    tags?: string[];
    version?: string;
  };
  enabled?: boolean;
}

/**
 * Update template input
 */
export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  template?: {
    prompt?: string;
    systemPrompt?: string;
    codeTemplate?: string;
    rules?: string[];
    constraints?: Record<string, any>;
  };
  examples?: Array<{
    input: Record<string, any>;
    output: string;
  }>;
  metadata?: {
    language?: string;
    framework?: string;
    tags?: string[];
    version?: string;
  };
  enabled?: boolean;
}

