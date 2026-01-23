/**
 * Standardized error codes for Shard operations
 */
/**
 * Shard-specific error codes
 */
export var ShardErrorCode;
(function (ShardErrorCode) {
    // Validation errors
    ShardErrorCode["SHARD_VALIDATION_FAILED"] = "SHARD_VALIDATION_FAILED";
    ShardErrorCode["SHARD_TYPE_NOT_FOUND"] = "SHARD_TYPE_NOT_FOUND";
    ShardErrorCode["SHARD_TYPE_INACTIVE"] = "SHARD_TYPE_INACTIVE";
    ShardErrorCode["REQUIRED_FIELD_MISSING"] = "REQUIRED_FIELD_MISSING";
    ShardErrorCode["INVALID_FIELD_VALUE"] = "INVALID_FIELD_VALUE";
    ShardErrorCode["SCHEMA_VALIDATION_FAILED"] = "SCHEMA_VALIDATION_FAILED";
    // Access errors
    ShardErrorCode["SHARD_NOT_FOUND"] = "SHARD_NOT_FOUND";
    ShardErrorCode["SHARD_ACCESS_DENIED"] = "SHARD_ACCESS_DENIED";
    ShardErrorCode["CROSS_TENANT_ACCESS"] = "CROSS_TENANT_ACCESS";
    ShardErrorCode["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    // Relationship errors
    ShardErrorCode["RELATIONSHIP_TARGET_NOT_FOUND"] = "RELATIONSHIP_TARGET_NOT_FOUND";
    ShardErrorCode["RELATIONSHIP_CYCLE_DETECTED"] = "RELATIONSHIP_CYCLE_DETECTED";
    ShardErrorCode["INVALID_RELATIONSHIP_TYPE"] = "INVALID_RELATIONSHIP_TYPE";
    ShardErrorCode["RELATIONSHIP_ALREADY_EXISTS"] = "RELATIONSHIP_ALREADY_EXISTS";
    ShardErrorCode["SELF_RELATIONSHIP_NOT_ALLOWED"] = "SELF_RELATIONSHIP_NOT_ALLOWED";
    // Operation errors
    ShardErrorCode["SHARD_ALREADY_DELETED"] = "SHARD_ALREADY_DELETED";
    ShardErrorCode["SHARD_RESTORE_FAILED"] = "SHARD_RESTORE_FAILED";
    ShardErrorCode["SHARD_ALREADY_ARCHIVED"] = "SHARD_ALREADY_ARCHIVED";
    ShardErrorCode["SHARD_NOT_ARCHIVED"] = "SHARD_NOT_ARCHIVED";
    ShardErrorCode["SHARD_NOT_DELETED"] = "SHARD_NOT_DELETED";
    // Bulk operation errors
    ShardErrorCode["BULK_OPERATION_PARTIAL_FAILURE"] = "BULK_OPERATION_PARTIAL_FAILURE";
    ShardErrorCode["BULK_OPERATION_LIMIT_EXCEEDED"] = "BULK_OPERATION_LIMIT_EXCEEDED";
    ShardErrorCode["BULK_OPERATION_ABORTED"] = "BULK_OPERATION_ABORTED";
    // Schema migration errors
    ShardErrorCode["SCHEMA_MIGRATION_FAILED"] = "SCHEMA_MIGRATION_FAILED";
    ShardErrorCode["SCHEMA_VERSION_MISMATCH"] = "SCHEMA_VERSION_MISMATCH";
    ShardErrorCode["MIGRATION_NOT_SUPPORTED"] = "MIGRATION_NOT_SUPPORTED";
    // Import/Export errors
    ShardErrorCode["IMPORT_FAILED"] = "IMPORT_FAILED";
    ShardErrorCode["IMPORT_VALIDATION_FAILED"] = "IMPORT_VALIDATION_FAILED";
    ShardErrorCode["EXPORT_FAILED"] = "EXPORT_FAILED";
    ShardErrorCode["UNSUPPORTED_FILE_FORMAT"] = "UNSUPPORTED_FILE_FORMAT";
    // Enrichment errors
    ShardErrorCode["ENRICHMENT_FAILED"] = "ENRICHMENT_FAILED";
    ShardErrorCode["EMBEDDING_GENERATION_FAILED"] = "EMBEDDING_GENERATION_FAILED";
    // Rate limiting
    ShardErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
})(ShardErrorCode || (ShardErrorCode = {}));
/**
 * Create a standardized shard error info object
 * @deprecated Use ShardError class or ShardErrors helpers instead
 */
export function createShardError(code, message, details) {
    return {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
    };
}
/**
 * HTTP status code mapping for shard errors
 */
export const ShardErrorHttpStatus = {
    // 400 Bad Request
    [ShardErrorCode.SHARD_VALIDATION_FAILED]: 400,
    [ShardErrorCode.REQUIRED_FIELD_MISSING]: 400,
    [ShardErrorCode.INVALID_FIELD_VALUE]: 400,
    [ShardErrorCode.SCHEMA_VALIDATION_FAILED]: 400,
    [ShardErrorCode.INVALID_RELATIONSHIP_TYPE]: 400,
    [ShardErrorCode.SELF_RELATIONSHIP_NOT_ALLOWED]: 400,
    [ShardErrorCode.SCHEMA_VERSION_MISMATCH]: 400,
    [ShardErrorCode.IMPORT_VALIDATION_FAILED]: 400,
    [ShardErrorCode.UNSUPPORTED_FILE_FORMAT]: 400,
    // 403 Forbidden
    [ShardErrorCode.SHARD_ACCESS_DENIED]: 403,
    [ShardErrorCode.CROSS_TENANT_ACCESS]: 403,
    [ShardErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
    // 404 Not Found
    [ShardErrorCode.SHARD_NOT_FOUND]: 404,
    [ShardErrorCode.SHARD_TYPE_NOT_FOUND]: 404,
    [ShardErrorCode.RELATIONSHIP_TARGET_NOT_FOUND]: 404,
    // 409 Conflict
    [ShardErrorCode.SHARD_ALREADY_DELETED]: 409,
    [ShardErrorCode.SHARD_ALREADY_ARCHIVED]: 409,
    [ShardErrorCode.SHARD_NOT_ARCHIVED]: 409,
    [ShardErrorCode.SHARD_NOT_DELETED]: 409,
    [ShardErrorCode.RELATIONSHIP_ALREADY_EXISTS]: 409,
    [ShardErrorCode.RELATIONSHIP_CYCLE_DETECTED]: 409,
    // 410 Gone
    [ShardErrorCode.SHARD_TYPE_INACTIVE]: 410,
    // 422 Unprocessable Entity
    [ShardErrorCode.SHARD_RESTORE_FAILED]: 422,
    [ShardErrorCode.SCHEMA_MIGRATION_FAILED]: 422,
    [ShardErrorCode.MIGRATION_NOT_SUPPORTED]: 422,
    [ShardErrorCode.IMPORT_FAILED]: 422,
    [ShardErrorCode.EXPORT_FAILED]: 422,
    [ShardErrorCode.ENRICHMENT_FAILED]: 422,
    [ShardErrorCode.EMBEDDING_GENERATION_FAILED]: 422,
    // 429 Too Many Requests
    [ShardErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    [ShardErrorCode.BULK_OPERATION_LIMIT_EXCEEDED]: 429,
    // 500 Internal Server Error (partial failures)
    [ShardErrorCode.BULK_OPERATION_PARTIAL_FAILURE]: 207, // Multi-Status
    [ShardErrorCode.BULK_OPERATION_ABORTED]: 500,
};
/**
 * Get HTTP status code for a ShardErrorCode
 * @param code - The shard error code
 * @returns HTTP status code
 */
export function errorCodeToHttpStatus(code) {
    return ShardErrorHttpStatus[code] ?? 500;
}
/**
 * ShardError class extending Error with structured error information
 * Use this for throwing typed errors in shard operations
 */
export class ShardError extends Error {
    code;
    statusCode;
    details;
    shardId;
    field;
    timestamp;
    constructor(code, message, options) {
        super(message, { cause: options?.cause });
        this.name = 'ShardError';
        this.code = code;
        this.statusCode = errorCodeToHttpStatus(code);
        this.details = options?.details;
        this.shardId = options?.shardId;
        this.field = options?.field;
        this.timestamp = new Date().toISOString();
        // Maintains proper stack trace for where error was thrown (V8 engines)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ShardError);
        }
    }
    /**
     * Convert to JSON-serializable object for API responses
     */
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
            shardId: this.shardId,
            field: this.field,
            timestamp: this.timestamp,
        };
    }
    /**
     * Create a ShardError from an unknown error
     */
    static fromError(error, defaultCode = ShardErrorCode.SHARD_VALIDATION_FAILED) {
        if (error instanceof ShardError) {
            return error;
        }
        if (error instanceof Error) {
            return new ShardError(defaultCode, error.message, { cause: error });
        }
        return new ShardError(defaultCode, String(error));
    }
    /**
     * Type guard to check if an error is a ShardError
     */
    static isShardError(error) {
        return error instanceof ShardError;
    }
}
/**
 * Helper to create common shard errors
 */
export const ShardErrors = {
    notFound(shardId) {
        return new ShardError(ShardErrorCode.SHARD_NOT_FOUND, `Shard not found: ${shardId}`, { shardId });
    },
    accessDenied(shardId, userId) {
        return new ShardError(ShardErrorCode.SHARD_ACCESS_DENIED, 'Access denied to shard', { shardId, details: userId ? { userId } : undefined });
    },
    insufficientPermissions(shardId, requiredPermission) {
        return new ShardError(ShardErrorCode.INSUFFICIENT_PERMISSIONS, `Insufficient permissions: requires ${requiredPermission}`, { shardId, details: { requiredPermission } });
    },
    validationFailed(message, field, details) {
        return new ShardError(ShardErrorCode.SHARD_VALIDATION_FAILED, message, { field, details });
    },
    requiredFieldMissing(field) {
        return new ShardError(ShardErrorCode.REQUIRED_FIELD_MISSING, `Missing required field: ${field}`, { field });
    },
    invalidFieldValue(field, reason) {
        return new ShardError(ShardErrorCode.INVALID_FIELD_VALUE, reason ? `Invalid value for field '${field}': ${reason}` : `Invalid value for field: ${field}`, { field, details: reason ? { reason } : undefined });
    },
    typeNotFound(shardTypeId) {
        return new ShardError(ShardErrorCode.SHARD_TYPE_NOT_FOUND, `Shard type not found: ${shardTypeId}`, { details: { shardTypeId } });
    },
    typeInactive(shardTypeId) {
        return new ShardError(ShardErrorCode.SHARD_TYPE_INACTIVE, `Shard type is inactive: ${shardTypeId}`, { details: { shardTypeId } });
    },
    alreadyDeleted(shardId) {
        return new ShardError(ShardErrorCode.SHARD_ALREADY_DELETED, 'Shard is already deleted', { shardId });
    },
    alreadyArchived(shardId) {
        return new ShardError(ShardErrorCode.SHARD_ALREADY_ARCHIVED, 'Shard is already archived', { shardId });
    },
    notArchived(shardId) {
        return new ShardError(ShardErrorCode.SHARD_NOT_ARCHIVED, 'Shard is not archived', { shardId });
    },
    crossTenantAccess(shardId, targetTenantId) {
        return new ShardError(ShardErrorCode.CROSS_TENANT_ACCESS, 'Cross-tenant access is not allowed', { shardId, details: { targetTenantId } });
    },
    relationshipTargetNotFound(targetId) {
        return new ShardError(ShardErrorCode.RELATIONSHIP_TARGET_NOT_FOUND, `Relationship target not found: ${targetId}`, { details: { targetId } });
    },
    relationshipCycleDetected(shardId, targetId) {
        return new ShardError(ShardErrorCode.RELATIONSHIP_CYCLE_DETECTED, 'Relationship would create a cycle', { shardId, details: { targetId } });
    },
    invalidRelationshipType(relationshipType) {
        return new ShardError(ShardErrorCode.INVALID_RELATIONSHIP_TYPE, `Invalid relationship type: ${relationshipType}`, { details: { relationshipType } });
    },
    schemaMigrationFailed(shardId, reason) {
        return new ShardError(ShardErrorCode.SCHEMA_MIGRATION_FAILED, `Schema migration failed: ${reason}`, { shardId, details: { reason } });
    },
    schemaVersionMismatch(shardId, expected, actual) {
        return new ShardError(ShardErrorCode.SCHEMA_VERSION_MISMATCH, `Schema version mismatch: expected ${expected}, got ${actual}`, { shardId, details: { expected, actual } });
    },
    bulkOperationPartialFailure(summary, errors) {
        return new ShardError(ShardErrorCode.BULK_OPERATION_PARTIAL_FAILURE, `Bulk operation partially failed: ${summary.failed}/${summary.total} failed`, {
            details: {
                summary,
                errors: errors.map((e) => ({
                    index: e.index,
                    code: e.error.code,
                    message: e.error.message,
                })),
            },
        });
    },
    rateLimitExceeded(retryAfter) {
        return new ShardError(ShardErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded', { details: retryAfter ? { retryAfter } : undefined });
    },
};
//# sourceMappingURL=shard-errors.types.js.map