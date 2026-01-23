// @ts-nocheck - Not used by workers-sync, has type mismatches
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
export class RedactionService {
    shardRepository;
    monitoring;
    redactionConfigs = new Map(); // tenantId -> config
    constructor(monitoring, shardRepository) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
    }
    /**
     * Configure redaction for a tenant
     */
    async configureRedaction(tenantId, fields, redactionValue = '[REDACTED]', userId) {
        const config = {
            tenantId,
            enabled: fields.length > 0,
            fields,
            redactionValue,
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: userId,
        };
        this.redactionConfigs.set(tenantId, config);
        this.monitoring.trackEvent('redaction.config-updated', {
            tenantId,
            fieldCount: fields.length,
            enabled: config.enabled,
        });
    }
    /**
     * Get redaction configuration for a tenant
     */
    getRedactionConfig(tenantId) {
        return this.redactionConfigs.get(tenantId) || null;
    }
    /**
     * Apply redaction to a shard at query time
     */
    applyRedaction(shard, tenantId) {
        const config = this.getRedactionConfig(tenantId);
        if (!config || !config.enabled || config.fields.length === 0) {
            return shard; // No redaction configured
        }
        // Deep clone shard to avoid mutating original
        const redactedShard = JSON.parse(JSON.stringify(shard));
        // Apply redaction to configured fields
        const redactedFields = [];
        for (const fieldPath of config.fields) {
            if (this.redactField(redactedShard, fieldPath, config.redactionValue)) {
                redactedFields.push(fieldPath);
            }
        }
        // Update metadata with redaction info
        if (redactedFields.length > 0) {
            redactedShard.metadata = redactedShard.metadata || {};
            redactedShard.metadata.redaction = {
                redacted: true,
                redactedFields,
                redactedAt: new Date(),
                redactionConfigId: tenantId,
            };
            this.monitoring.trackEvent('redaction.applied', {
                tenantId,
                shardId: shard.id,
                fieldCount: redactedFields.length,
            });
        }
        return redactedShard;
    }
    /**
     * Redact a specific field in a shard
     */
    redactField(shard, fieldPath, redactionValue) {
        const parts = fieldPath.split('.');
        let current = shard;
        // Navigate to the field
        for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] === undefined || current[parts[i]] === null) {
                return false; // Field path doesn't exist
            }
            current = current[parts[i]];
        }
        const fieldName = parts[parts.length - 1];
        if (current[fieldName] !== undefined && current[fieldName] !== null) {
            const originalValue = current[fieldName];
            current[fieldName] = redactionValue;
            return originalValue !== redactionValue; // Return true if value was changed
        }
        return false;
    }
    /**
     * Track redaction access (who accessed redacted data)
     */
    async trackRedactionAccess(shardId, tenantId, userId) {
        try {
            // Get shard to check if it was redacted
            const shard = await this.shardRepository.findById(shardId, tenantId);
            if (!shard) {
                return;
            }
            const redactionMeta = shard.metadata?.redaction;
            if (redactionMeta?.redacted) {
                this.monitoring.trackEvent('redaction.access-tracked', {
                    tenantId,
                    shardId,
                    userId,
                    redactedFields: redactionMeta.redactedFields || [],
                });
            }
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'RedactionService',
                operation: 'track-redaction-access',
                shardId,
                tenantId,
            });
        }
    }
    /**
     * Check if a shard has redacted fields
     */
    hasRedactedFields(shard) {
        const redactionMeta = shard.metadata?.redaction;
        return redactionMeta?.redacted === true;
    }
    /**
     * Get list of redacted fields for a shard
     */
    getRedactedFields(shard) {
        const redactionMeta = shard.metadata?.redaction;
        return redactionMeta?.redactedFields || [];
    }
}
//# sourceMappingURL=redaction.service.js.map