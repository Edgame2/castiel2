/**
 * Schema Migration Types
 * Handles schema evolution when ShardType schemas change
 */
import type { ShardTypeSchema, SchemaFormat } from './shard-type.types.js';
import type { RichFieldDefinition } from '@castiel/shared-types';
/**
 * Migration strategy for applying schema changes
 */
export declare enum MigrationStrategy {
    /** Apply migrations when Shards are read (on-demand) */
    LAZY = "lazy",
    /** Apply migrations immediately to all affected Shards in background */
    EAGER = "eager",
    /** Require manual migration via admin action */
    MANUAL = "manual",
    /** No migration needed (additive changes only) */
    NONE = "none"
}
/**
 * Types of field changes that can occur in a schema migration
 */
export declare enum FieldChangeType {
    /** New field added to schema */
    ADDED = "added",
    /** Field removed from schema */
    REMOVED = "removed",
    /** Field renamed (requires mapping) */
    RENAMED = "renamed",
    /** Field type changed (may require transformation) */
    TYPE_CHANGED = "type_changed",
    /** Field configuration changed (e.g., min/max, options) */
    CONFIG_CHANGED = "config_changed",
    /** Field made required */
    MADE_REQUIRED = "made_required",
    /** Field made optional */
    MADE_OPTIONAL = "made_optional",
    /** Field default value changed */
    DEFAULT_CHANGED = "default_changed"
}
/**
 * Individual field change in a migration
 */
export interface FieldChange {
    /** Type of change */
    changeType: FieldChangeType;
    /** Field name (or old name for renames) */
    fieldName: string;
    /** New field name (for renames) */
    newFieldName?: string;
    /** Old field definition */
    oldDefinition?: RichFieldDefinition | Record<string, any>;
    /** New field definition */
    newDefinition?: RichFieldDefinition | Record<string, any>;
    /** Default value to apply for new required fields */
    defaultValue?: any;
    /** Transformation function name (for type changes) */
    transformFn?: string;
    /** Whether this change is breaking (requires data migration) */
    isBreaking: boolean;
    /** Human-readable description of the change */
    description: string;
}
/**
 * Migration status for tracking progress
 */
export declare enum MigrationStatus {
    /** Migration defined but not started */
    PENDING = "pending",
    /** Migration is currently running */
    IN_PROGRESS = "in_progress",
    /** Migration completed successfully */
    COMPLETED = "completed",
    /** Migration failed (may be partially applied) */
    FAILED = "failed",
    /** Migration was cancelled */
    CANCELLED = "cancelled",
    /** Migration is paused (can be resumed) */
    PAUSED = "paused"
}
/**
 * Schema migration definition
 * Represents a migration from one schema version to another
 */
export interface SchemaMigration {
    /** Unique migration ID */
    id: string;
    /** Tenant ID (partition key) */
    tenantId: string;
    /** ShardType ID this migration belongs to */
    shardTypeId: string;
    /** ShardType name (for reference) */
    shardTypeName: string;
    /** Source schema version */
    fromVersion: number;
    /** Target schema version */
    toVersion: number;
    /** Source schema snapshot */
    fromSchema: ShardTypeSchema;
    /** Target schema snapshot */
    toSchema: ShardTypeSchema;
    /** Schema format (legacy, jsonschema, rich) */
    schemaFormat: SchemaFormat;
    /** List of field changes in this migration */
    changes: FieldChange[];
    /** Number of breaking changes */
    breakingChangeCount: number;
    /** Whether this migration requires data transformation */
    requiresDataMigration: boolean;
    /** Migration strategy */
    strategy: MigrationStrategy;
    /** Current status */
    status: MigrationStatus;
    /** Progress tracking */
    progress: MigrationProgress;
    /** Error details if failed */
    error?: string;
    errorDetails?: Record<string, any>;
    /** Audit fields */
    createdBy: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    updatedAt: Date;
}
/**
 * Migration progress tracking
 */
export interface MigrationProgress {
    /** Total number of Shards to migrate */
    totalShards: number;
    /** Number of Shards successfully migrated */
    migratedShards: number;
    /** Number of Shards that failed migration */
    failedShards: number;
    /** Number of Shards skipped (already at target version) */
    skippedShards: number;
    /** Percentage complete (0-100) */
    percentComplete: number;
    /** Estimated time remaining in seconds */
    estimatedSecondsRemaining?: number;
    /** Last processed Shard ID (for resumption) */
    lastProcessedShardId?: string;
    /** Continuation token for pagination */
    continuationToken?: string;
}
/**
 * Result of applying a migration to a single Shard
 */
export interface ShardMigrationResult {
    /** Shard ID */
    shardId: string;
    /** Whether migration was successful */
    success: boolean;
    /** From schema version */
    fromVersion: number;
    /** To schema version */
    toVersion: number;
    /** Changes applied */
    changesApplied: string[];
    /** Error message if failed */
    error?: string;
    /** Migrated structured data (if successful) */
    migratedData?: Record<string, any>;
    /** Duration in milliseconds */
    durationMs: number;
}
/**
 * Batch migration result
 */
export interface BatchMigrationResult {
    /** Migration ID */
    migrationId: string;
    /** Total shards processed in this batch */
    processed: number;
    /** Successful migrations */
    succeeded: number;
    /** Failed migrations */
    failed: number;
    /** Individual results */
    results: ShardMigrationResult[];
    /** Continuation token for next batch */
    continuationToken?: string;
    /** Whether there are more shards to process */
    hasMore: boolean;
}
/**
 * Schema diff result
 */
export interface SchemaDiff {
    /** List of field changes */
    changes: FieldChange[];
    /** Total number of changes */
    totalChanges: number;
    /** Number of breaking changes */
    breakingChanges: number;
    /** Number of additive changes (safe) */
    additiveChanges: number;
    /** Whether any changes require data migration */
    requiresDataMigration: boolean;
    /** Recommended migration strategy */
    recommendedStrategy: MigrationStrategy;
    /** Human-readable summary */
    summary: string;
}
/**
 * Input for creating a schema migration
 */
export interface CreateMigrationInput {
    shardTypeId: string;
    fromVersion: number;
    toVersion: number;
    fromSchema: ShardTypeSchema;
    toSchema: ShardTypeSchema;
    schemaFormat: SchemaFormat;
    strategy?: MigrationStrategy;
    createdBy: string;
    /** Custom field mappings (for renames) */
    fieldMappings?: Record<string, string>;
    /** Custom default values for new required fields */
    defaultValues?: Record<string, any>;
    /** Custom transformation functions */
    transformations?: Record<string, string>;
}
/**
 * Migration query options
 */
export interface MigrationQueryOptions {
    tenantId: string;
    shardTypeId?: string;
    status?: MigrationStatus;
    fromVersion?: number;
    toVersion?: number;
    limit?: number;
    continuationToken?: string;
}
/**
 * Migration list result
 */
export interface MigrationListResult {
    migrations: SchemaMigration[];
    continuationToken?: string;
    count: number;
}
/**
 * Built-in transformation functions
 */
export declare const BUILT_IN_TRANSFORMATIONS: {
    /** Convert string to number */
    readonly STRING_TO_NUMBER: "stringToNumber";
    /** Convert number to string */
    readonly NUMBER_TO_STRING: "numberToString";
    /** Convert string to boolean */
    readonly STRING_TO_BOOLEAN: "stringToBoolean";
    /** Convert boolean to string */
    readonly BOOLEAN_TO_STRING: "booleanToString";
    /** Convert single value to array */
    readonly VALUE_TO_ARRAY: "valueToArray";
    /** Convert array to single value (first element) */
    readonly ARRAY_TO_VALUE: "arrayToValue";
    /** Convert date string to ISO format */
    readonly DATE_TO_ISO: "dateToISO";
    /** Parse JSON string */
    readonly PARSE_JSON: "parseJSON";
    /** Stringify to JSON */
    readonly STRINGIFY_JSON: "stringifyJSON";
    /** Convert to uppercase */
    readonly TO_UPPERCASE: "toUppercase";
    /** Convert to lowercase */
    readonly TO_LOWERCASE: "toLowercase";
    /** Trim whitespace */
    readonly TRIM: "trim";
};
/**
 * Schema compatibility check result
 */
export interface CompatibilityCheckResult {
    /** Whether schemas are compatible (no breaking changes) */
    isCompatible: boolean;
    /** Whether migration is required */
    requiresMigration: boolean;
    /** List of compatibility issues */
    issues: CompatibilityIssue[];
    /** Recommended actions */
    recommendations: string[];
}
/**
 * Individual compatibility issue
 */
export interface CompatibilityIssue {
    /** Severity: warning, error */
    severity: 'warning' | 'error';
    /** Field name */
    field: string;
    /** Issue description */
    message: string;
    /** How to resolve */
    resolution?: string;
}
//# sourceMappingURL=schema-migration.types.d.ts.map