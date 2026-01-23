/**
 * Migration Service types
 * Core data model for code migrations and refactoring
 */

export enum MigrationType {
  VERSION_UPGRADE = 'version_upgrade',
  BREAKING_CHANGE = 'breaking_change',
  LARGE_SCALE_REFACTORING = 'large_scale_refactoring',
  TECH_STACK = 'tech_stack',
  DATABASE = 'database',
  API = 'api',
  DEPENDENCY = 'dependency',
  CUSTOM = 'custom',
}

export enum MigrationStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
  CANCELLED = 'cancelled',
}

export enum MigrationStepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Migration
 */
export interface Migration {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  type: MigrationType;
  status: MigrationStatus;
  source: {
    version?: string;
    stack?: string;
    framework?: string;
  };
  target: {
    version?: string;
    stack?: string;
    framework?: string;
  };
  scope: {
    type: 'file' | 'directory' | 'module' | 'project';
    paths: string[];
  };
  steps: string[]; // Migration step IDs
  rollbackSteps?: string[]; // Rollback step IDs
  metadata?: {
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    estimatedDuration?: number; // in minutes
    riskLevel?: 'low' | 'medium' | 'high';
    dependencies?: string[]; // Other migration IDs
  };
  startedAt?: Date;
  completedAt?: Date;
  rolledBackAt?: Date;
  duration?: number; // in milliseconds
  error?: string;
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
 * Migration Step
 */
export interface MigrationStep {
  id: string;
  tenantId: string; // Partition key
  migrationId: string;
  order: number; // Execution order
  name: string;
  description?: string;
  type: 'transform' | 'replace' | 'refactor' | 'update' | 'delete' | 'create';
  status: MigrationStepStatus;
  transformation: {
    pattern?: string; // Pattern to match
    replacement?: string; // Replacement pattern
    script?: string; // Transformation script
    rules?: any[]; // Transformation rules
  };
  validation?: {
    checks?: string[]; // Validation checks to run
    required?: boolean; // Must pass to continue
  };
  rollback?: {
    pattern?: string;
    replacement?: string;
    script?: string;
  };
  results?: {
    filesChanged?: number;
    linesChanged?: number;
    errors?: number;
    warnings?: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  error?: string;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Migration Plan
 */
export interface MigrationPlan {
  id: string;
  tenantId: string; // Partition key
  migrationId: string;
  analysis: {
    filesAffected: number;
    estimatedChanges: number;
    breakingChanges: string[];
    dependencies: string[];
    risks: Array<{
      level: 'low' | 'medium' | 'high';
      description: string;
      mitigation?: string;
    }>;
  };
  executionOrder: string[]; // Step IDs in execution order
  estimatedDuration: number; // in minutes
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create migration input
 */
export interface CreateMigrationInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  type: MigrationType;
  source: {
    version?: string;
    stack?: string;
    framework?: string;
  };
  target: {
    version?: string;
    stack?: string;
    framework?: string;
  };
  scope: {
    type: 'file' | 'directory' | 'module' | 'project';
    paths: string[];
  };
  metadata?: {
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    estimatedDuration?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    dependencies?: string[];
  };
}

/**
 * Update migration input
 */
export interface UpdateMigrationInput {
  name?: string;
  description?: string;
  status?: MigrationStatus;
  metadata?: {
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    estimatedDuration?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    dependencies?: string[];
  };
}

/**
 * Create migration step input
 */
export interface CreateMigrationStepInput {
  tenantId: string;
  userId: string;
  migrationId: string;
  order: number;
  name: string;
  description?: string;
  type: 'transform' | 'replace' | 'refactor' | 'update' | 'delete' | 'create';
  transformation: {
    pattern?: string;
    replacement?: string;
    script?: string;
    rules?: any[];
  };
  validation?: {
    checks?: string[];
    required?: boolean;
  };
  rollback?: {
    pattern?: string;
    replacement?: string;
    script?: string;
  };
}

/**
 * Execute migration input
 */
export interface ExecuteMigrationInput {
  tenantId: string;
  userId: string;
  migrationId: string;
  dryRun?: boolean; // If true, don't apply changes
}

