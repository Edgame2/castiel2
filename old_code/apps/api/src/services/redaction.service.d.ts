/**
 * Redaction Service (Phase 2)
 *
 * Handles PII redaction for shards based on tenant configuration.
 *
 * Features:
 * - Default: no redaction
 * - Tenant Admin configures PII fields to redact
 * - Track redactions in shard metadata
 * - Apply redaction at query time
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import type { Shard } from '../types/shard.types.js';
/**
 * Redaction configuration for a tenant
 */
export interface RedactionConfig {
    tenantId: string;
    enabled: boolean;
    fields: string[];
    redactionValue: string;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string;
}
/**
 * Redaction metadata stored in shard
 */
export interface RedactionMetadata {
    redacted: boolean;
    redactedFields?: string[];
    redactedAt?: Date;
    redactedBy?: string;
    redactionConfigId?: string;
}
export declare class RedactionService {
    private shardRepository;
    private monitoring;
    private redactionConfigs;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository);
    /**
     * Configure redaction for a tenant
     */
    configureRedaction(tenantId: string, fields: string[], redactionValue: string | undefined, userId: string): Promise<void>;
    /**
     * Get redaction configuration for a tenant
     */
    getRedactionConfig(tenantId: string): RedactionConfig | null;
    /**
     * Apply redaction to a shard at query time
     */
    applyRedaction(shard: Shard, tenantId: string): Shard;
    /**
     * Redact a specific field in a shard
     */
    private redactField;
    /**
     * Track redaction access (who accessed redacted data)
     */
    trackRedactionAccess(shardId: string, tenantId: string, userId: string): Promise<void>;
    /**
     * Check if a shard has redacted fields
     */
    hasRedactedFields(shard: Shard): boolean;
    /**
     * Get list of redacted fields for a shard
     */
    getRedactedFields(shard: Shard): string[];
}
//# sourceMappingURL=redaction.service.d.ts.map