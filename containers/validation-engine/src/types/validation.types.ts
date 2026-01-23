/**
 * Validation Engine types
 * Core data model for comprehensive validation
 */

export enum ValidationType {
  SYNTAX = 'syntax',
  SEMANTIC = 'semantic',
  ARCHITECTURE = 'architecture',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  CONSISTENCY = 'consistency',
  STANDARDS = 'standards',
  POLICY = 'policy',
  CUSTOM = 'custom',
}

export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum ValidationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Validation Rule
 */
export interface ValidationRule {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  type: ValidationType;
  severity: ValidationSeverity;
  enabled: boolean;
  ruleDefinition: {
    language?: string; // Programming language (e.g., 'typescript', 'python')
    pattern?: string; // Regex pattern or AST pattern
    condition?: string; // Condition expression
    check?: string; // Check function/script
  };
  scope?: {
    filePatterns?: string[]; // File patterns to apply (e.g., ['*.ts', '*.tsx'])
    excludePatterns?: string[]; // Patterns to exclude
    paths?: string[]; // Specific paths
  };
  metadata?: {
    category?: string;
    tags?: string[];
    author?: string;
    version?: string;
  };
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
 * Validation Result
 */
export interface ValidationResult {
  id: string;
  tenantId: string; // Partition key
  validationId: string; // Reference to validation run
  ruleId: string; // Reference to validation rule
  ruleName: string;
  type: ValidationType;
  severity: ValidationSeverity;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  location?: {
    file?: string;
    line?: number;
    column?: number;
    path?: string; // AST path or code path
  };
  details?: Record<string, any>;
  suggestions?: string[]; // Suggested fixes
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Validation Run
 */
export interface ValidationRun {
  id: string;
  tenantId: string; // Partition key
  name?: string;
  description?: string;
  target: {
    type: 'file' | 'directory' | 'module' | 'project';
    path: string;
    language?: string;
  };
  validationTypes?: ValidationType[]; // Types to run (if not specified, run all)
  rules?: string[]; // Specific rule IDs (if not specified, use all enabled rules)
  status: ValidationStatus;
  results: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    warnings: number;
    info: number;
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
 * Create validation rule input
 */
export interface CreateValidationRuleInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  type: ValidationType;
  severity: ValidationSeverity;
  enabled?: boolean;
  ruleDefinition: {
    language?: string;
    pattern?: string;
    condition?: string;
    check?: string;
  };
  scope?: {
    filePatterns?: string[];
    excludePatterns?: string[];
    paths?: string[];
  };
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
  };
}

/**
 * Update validation rule input
 */
export interface UpdateValidationRuleInput {
  name?: string;
  description?: string;
  severity?: ValidationSeverity;
  enabled?: boolean;
  ruleDefinition?: {
    language?: string;
    pattern?: string;
    condition?: string;
    check?: string;
  };
  scope?: {
    filePatterns?: string[];
    excludePatterns?: string[];
    paths?: string[];
  };
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
  };
}

/**
 * Run validation input
 */
export interface RunValidationInput {
  tenantId: string;
  userId: string;
  name?: string;
  description?: string;
  target: {
    type: 'file' | 'directory' | 'module' | 'project';
    path: string;
    language?: string;
  };
  validationTypes?: ValidationType[];
  rules?: string[];
}

