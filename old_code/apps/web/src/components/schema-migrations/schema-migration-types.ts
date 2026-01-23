/**
 * Schema Migration Types
 * Frontend types matching backend API
 */

/**
 * Schema migration strategy
 */
export enum MigrationStrategy {
  LAZY = 'lazy',
  EAGER = 'eager',
  MANUAL = 'manual',
  VERSIONED = 'versioned',
}

/**
 * Field transformation types
 */
export enum TransformationType {
  RENAME = 'rename',
  DELETE = 'delete',
  ADD = 'add',
  CHANGE_TYPE = 'change_type',
  MOVE = 'move',
  MERGE = 'merge',
  SPLIT = 'split',
  COMPUTE = 'compute',
}

/**
 * Migration status
 */
export enum MigrationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

/**
 * Field transformation definition
 */
export interface FieldTransformation {
  type: TransformationType
  sourcePath?: string
  targetPath?: string
  defaultValue?: unknown
  transformer?: string
  config?: Record<string, unknown>
}

/**
 * Schema migration definition
 */
export interface SchemaMigration {
  id: string
  shardTypeId: string
  fromVersion: number
  toVersion: number
  description: string
  transformations: FieldTransformation[]
  preValidation?: string
  postValidation?: string
  strategy: MigrationStrategy
  batchSize?: number
  reversible: boolean
  rollbackTransformations?: FieldTransformation[]
  createdAt: string
  createdBy: string
  executedAt?: string
  status: MigrationStatus
}

/**
 * Migration execution result
 */
export interface MigrationResult {
  migrationId: string
  success: boolean
  shardsProcessed: number
  shardsSucceeded: number
  shardsFailed: number
  errors: Array<{
    shardId: string
    error: string
  }>
  startedAt: string
  completedAt?: string
  duration?: number
}

/**
 * Schema version info
 */
export interface SchemaVersionInfo {
  shardTypeId: string
  currentVersion: number
  latestVersion: number
  migrations: Array<{
    fromVersion: number
    toVersion: number
    status: MigrationStatus
    description: string
  }>
  shardsPerVersion: Record<number, number>
}

/**
 * Create migration input
 */
export interface CreateMigrationInput {
  shardTypeId: string
  fromVersion: number
  toVersion: number
  description: string
  transformations: FieldTransformation[]
  strategy?: MigrationStrategy
  batchSize?: number
  reversible?: boolean
  rollbackTransformations?: FieldTransformation[]
}

/**
 * Migration execution options
 */
export interface MigrationExecutionOptions {
  dryRun?: boolean
  batchSize?: number
  continueOnError?: boolean
  notifyOnCompletion?: boolean
}

/**
 * Labels and configurations for UI
 */
export const migrationStrategyLabels: Record<MigrationStrategy, string> = {
  [MigrationStrategy.LAZY]: 'Lazy (Migrate on read)',
  [MigrationStrategy.EAGER]: 'Eager (Migrate all at once)',
  [MigrationStrategy.MANUAL]: 'Manual (Explicit migration)',
  [MigrationStrategy.VERSIONED]: 'Versioned (Keep multiple versions)',
}

export const transformationTypeLabels: Record<TransformationType, string> = {
  [TransformationType.RENAME]: 'Rename Field',
  [TransformationType.DELETE]: 'Delete Field',
  [TransformationType.ADD]: 'Add Field',
  [TransformationType.CHANGE_TYPE]: 'Change Type',
  [TransformationType.MOVE]: 'Move Field',
  [TransformationType.MERGE]: 'Merge Fields',
  [TransformationType.SPLIT]: 'Split Field',
  [TransformationType.COMPUTE]: 'Compute Value',
}

export const migrationStatusConfig: Record<MigrationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  [MigrationStatus.PENDING]: { label: 'Pending', variant: 'secondary', color: 'bg-gray-500' },
  [MigrationStatus.IN_PROGRESS]: { label: 'In Progress', variant: 'default', color: 'bg-blue-500' },
  [MigrationStatus.COMPLETED]: { label: 'Completed', variant: 'default', color: 'bg-green-500' },
  [MigrationStatus.FAILED]: { label: 'Failed', variant: 'destructive', color: 'bg-red-500' },
  [MigrationStatus.ROLLED_BACK]: { label: 'Rolled Back', variant: 'outline', color: 'bg-yellow-500' },
}
