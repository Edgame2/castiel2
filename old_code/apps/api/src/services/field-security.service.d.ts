import { IMonitoringProvider } from '@castiel/monitoring';
import { FieldSecurityConfig, FieldSecurityContext, FieldSecurityCheckResult, FieldSecurityAuditEntry, SecuredShardData, ShardTypeSecurityConfig, ExportSecurityPolicy } from '../types/field-security.types.js';
import { Shard } from '../types/shard.types.js';
import { ShardType } from '../types/shard-type.types.js';
/**
 * Field Security Service
 * Handles per-field access control, encryption, and masking
 */
export declare class FieldSecurityService {
    private monitoring;
    private securityConfigCache;
    private readonly CACHE_TTL_MS;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Apply field security to shard data for read operations
     */
    secureShardForRead(shard: Shard, shardType: ShardType, context: FieldSecurityContext): Promise<SecuredShardData>;
    /**
     * Validate field security for write operations
     */
    validateFieldsForWrite(data: Record<string, any>, shardType: ShardType, context: FieldSecurityContext): Promise<{
        valid: boolean;
        errors: Array<{
            field: string;
            message: string;
        }>;
        auditEntries: FieldSecurityAuditEntry[];
    }>;
    /**
     * Apply security policy for data export
     */
    secureDataForExport(shards: Shard[], shardType: ShardType, context: FieldSecurityContext, policy: ExportSecurityPolicy): Promise<{
        data: Record<string, any>[];
        summary: {
            totalShards: number;
            maskedFields: string[];
            excludedFields: string[];
        };
    }>;
    /**
     * Secure data for AI context (exclude sensitive fields)
     */
    secureDataForAI(shard: Shard, shardType: ShardType, context: FieldSecurityContext): Promise<Record<string, any>>;
    /**
     * Check field access and determine if masking is needed
     */
    checkFieldAccess(fieldConfig: FieldSecurityConfig, context: FieldSecurityContext): FieldSecurityCheckResult;
    /**
     * Mask a value using the specified pattern
     */
    maskValue(value: any, maskPattern?: string): any;
    /**
     * Get security config for a ShardType
     */
    getSecurityConfig(shardType: ShardType): ShardTypeSecurityConfig | null;
    /**
     * Auto-detect security requirements based on field names
     */
    private autoDetectSecurityConfig;
    /**
     * Extract field names from ShardType schema
     */
    private extractFieldNames;
    /**
     * Validate a field value against a rule
     */
    private validateFieldValue;
    /**
     * Check if user has any of the required roles
     */
    private hasRoleAccess;
    /**
     * Create an audit entry for field access
     */
    private createAuditEntry;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Set nested value in object using dot notation
     */
    private setNestedValue;
    /**
     * Remove nested value from object using dot notation
     */
    private removeNestedValue;
    /**
     * Clear security config cache
     */
    clearCache(): void;
    /**
     * Clear cache for specific ShardType
     */
    clearCacheForShardType(shardTypeId: string): void;
}
//# sourceMappingURL=field-security.service.d.ts.map