/**
 * Standardized error codes for Shard operations
 */
/**
 * Shard-specific error codes
 */
export declare enum ShardErrorCode {
    SHARD_VALIDATION_FAILED = "SHARD_VALIDATION_FAILED",
    SHARD_TYPE_NOT_FOUND = "SHARD_TYPE_NOT_FOUND",
    SHARD_TYPE_INACTIVE = "SHARD_TYPE_INACTIVE",
    REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING",
    INVALID_FIELD_VALUE = "INVALID_FIELD_VALUE",
    SCHEMA_VALIDATION_FAILED = "SCHEMA_VALIDATION_FAILED",
    SHARD_NOT_FOUND = "SHARD_NOT_FOUND",
    SHARD_ACCESS_DENIED = "SHARD_ACCESS_DENIED",
    CROSS_TENANT_ACCESS = "CROSS_TENANT_ACCESS",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    RELATIONSHIP_TARGET_NOT_FOUND = "RELATIONSHIP_TARGET_NOT_FOUND",
    RELATIONSHIP_CYCLE_DETECTED = "RELATIONSHIP_CYCLE_DETECTED",
    INVALID_RELATIONSHIP_TYPE = "INVALID_RELATIONSHIP_TYPE",
    RELATIONSHIP_ALREADY_EXISTS = "RELATIONSHIP_ALREADY_EXISTS",
    SELF_RELATIONSHIP_NOT_ALLOWED = "SELF_RELATIONSHIP_NOT_ALLOWED",
    SHARD_ALREADY_DELETED = "SHARD_ALREADY_DELETED",
    SHARD_RESTORE_FAILED = "SHARD_RESTORE_FAILED",
    SHARD_ALREADY_ARCHIVED = "SHARD_ALREADY_ARCHIVED",
    SHARD_NOT_ARCHIVED = "SHARD_NOT_ARCHIVED",
    SHARD_NOT_DELETED = "SHARD_NOT_DELETED",
    BULK_OPERATION_PARTIAL_FAILURE = "BULK_OPERATION_PARTIAL_FAILURE",
    BULK_OPERATION_LIMIT_EXCEEDED = "BULK_OPERATION_LIMIT_EXCEEDED",
    BULK_OPERATION_ABORTED = "BULK_OPERATION_ABORTED",
    SCHEMA_MIGRATION_FAILED = "SCHEMA_MIGRATION_FAILED",
    SCHEMA_VERSION_MISMATCH = "SCHEMA_VERSION_MISMATCH",
    MIGRATION_NOT_SUPPORTED = "MIGRATION_NOT_SUPPORTED",
    IMPORT_FAILED = "IMPORT_FAILED",
    IMPORT_VALIDATION_FAILED = "IMPORT_VALIDATION_FAILED",
    EXPORT_FAILED = "EXPORT_FAILED",
    UNSUPPORTED_FILE_FORMAT = "UNSUPPORTED_FILE_FORMAT",
    ENRICHMENT_FAILED = "ENRICHMENT_FAILED",
    EMBEDDING_GENERATION_FAILED = "EMBEDDING_GENERATION_FAILED",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
}
/**
 * Structured error response for Shard API (deprecated - use ShardError class)
 * @deprecated Use ShardError class instead
 */
export interface ShardErrorInfo {
    code: ShardErrorCode;
    message: string;
    details?: Record<string, unknown>;
    field?: string;
    shardId?: string;
    timestamp: string;
}
/**
 * Bulk operation error detail
 */
export interface BulkOperationError {
    index: number;
    code: ShardErrorCode;
    message: string;
    shardId?: string;
    field?: string;
}
/**
 * Bulk operation result
 */
export interface BulkOperationResult<T = any> {
    success: boolean;
    summary: {
        total: number;
        succeeded: number;
        failed: number;
    };
    results: Array<{
        index: number;
        status: 'created' | 'updated' | 'deleted' | 'failed';
        shardId?: string;
        data?: T;
        error?: BulkOperationError;
    }>;
}
/**
 * Create a standardized shard error info object
 * @deprecated Use ShardError class or ShardErrors helpers instead
 */
export declare function createShardError(code: ShardErrorCode, message: string, details?: Record<string, unknown>): ShardErrorInfo;
/**
 * HTTP status code mapping for shard errors
 */
export declare const ShardErrorHttpStatus: Record<ShardErrorCode, number>;
/**
 * Get HTTP status code for a ShardErrorCode
 * @param code - The shard error code
 * @returns HTTP status code
 */
export declare function errorCodeToHttpStatus(code: ShardErrorCode): number;
/**
 * ShardError class extending Error with structured error information
 * Use this for throwing typed errors in shard operations
 */
export declare class ShardError extends Error {
    readonly code: ShardErrorCode;
    readonly statusCode: number;
    readonly details?: Record<string, unknown>;
    readonly shardId?: string;
    readonly field?: string;
    readonly timestamp: string;
    constructor(code: ShardErrorCode, message: string, options?: {
        details?: Record<string, unknown>;
        shardId?: string;
        field?: string;
        cause?: Error;
    });
    /**
     * Convert to JSON-serializable object for API responses
     */
    toJSON(): ShardErrorResponse;
    /**
     * Create a ShardError from an unknown error
     */
    static fromError(error: unknown, defaultCode?: ShardErrorCode): ShardError;
    /**
     * Type guard to check if an error is a ShardError
     */
    static isShardError(error: unknown): error is ShardError;
}
/**
 * Type for ShardError JSON response
 */
export interface ShardErrorResponse {
    code: ShardErrorCode;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
    shardId?: string;
    field?: string;
    timestamp: string;
}
/**
 * Helper to create common shard errors
 */
export declare const ShardErrors: {
    notFound(shardId: string): ShardError;
    accessDenied(shardId: string, userId?: string): ShardError;
    insufficientPermissions(shardId: string, requiredPermission: string): ShardError;
    validationFailed(message: string, field?: string, details?: Record<string, unknown>): ShardError;
    requiredFieldMissing(field: string): ShardError;
    invalidFieldValue(field: string, reason?: string): ShardError;
    typeNotFound(shardTypeId: string): ShardError;
    typeInactive(shardTypeId: string): ShardError;
    alreadyDeleted(shardId: string): ShardError;
    alreadyArchived(shardId: string): ShardError;
    notArchived(shardId: string): ShardError;
    crossTenantAccess(shardId: string, targetTenantId: string): ShardError;
    relationshipTargetNotFound(targetId: string): ShardError;
    relationshipCycleDetected(shardId: string, targetId: string): ShardError;
    invalidRelationshipType(relationshipType: string): ShardError;
    schemaMigrationFailed(shardId: string, reason: string): ShardError;
    schemaVersionMismatch(shardId: string, expected: number, actual: number): ShardError;
    bulkOperationPartialFailure(summary: {
        total: number;
        succeeded: number;
        failed: number;
    }, errors: Array<{
        index: number;
        error: ShardError;
    }>): ShardError;
    rateLimitExceeded(retryAfter?: number): ShardError;
};
//# sourceMappingURL=shard-errors.types.d.ts.map