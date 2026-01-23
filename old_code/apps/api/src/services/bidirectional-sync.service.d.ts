/**
 * Bidirectional Sync Engine
 * Handles two-way synchronization with intelligent conflict resolution
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ConversionSchema } from '../types/conversion-schema.types.js';
/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy = 'source_wins' | 'destination_wins' | 'newest_wins' | 'merge' | 'manual' | 'custom';
/**
 * Change tracking method
 */
export type ChangeTrackingMethod = 'timestamp' | 'version' | 'checksum' | 'webhook';
/**
 * Bidirectional sync configuration
 */
export interface BidirectionalSyncConfig {
    enabled: boolean;
    conflictResolution: ConflictResolutionStrategy;
    changeTracking: ChangeTrackingMethod;
    webhookSupport: boolean;
}
/**
 * Sync conflict
 */
export interface SyncConflict {
    id: string;
    tenantId: string;
    syncTaskId: string;
    shardId: string;
    externalId: string;
    /** Type of conflict */
    conflictType: 'field_mismatch' | 'deleted_on_source' | 'deleted_on_destination' | 'concurrent_update';
    /** Local (Castiel) version */
    localVersion: Record<string, any>;
    localModifiedAt: Date;
    /** Remote (external system) version */
    remoteVersion: Record<string, any>;
    remoteModifiedAt: Date;
    /** Field-level conflicts */
    fieldConflicts: FieldConflict[];
    /** Timestamps */
    detectedAt: Date;
    resolvedAt?: Date;
    /** Resolution */
    resolution?: ConflictResolution;
    /** Status */
    status: 'pending' | 'resolved' | 'ignored';
    /** Metadata */
    integrationId: string;
    schema: string;
}
/**
 * Field conflict
 */
export interface FieldConflict {
    fieldName: string;
    localValue: any;
    remoteValue: any;
    lastLocalChange: Date;
    lastRemoteChange: Date;
}
/**
 * Conflict resolution
 */
export interface ConflictResolution {
    strategy: ConflictResolutionStrategy;
    resolvedBy?: string;
    resolvedAt: Date;
    mergedData: Record<string, any>;
    notes?: string;
}
/**
 * Merge rule for field-level merging
 */
export interface MergeRule {
    field: string;
    strategy: 'local' | 'remote' | 'newest' | 'concat' | 'custom';
    customLogic?: (local: any, remote: any) => any;
}
/**
 * Bidirectional Sync Engine
 */
export declare class BidirectionalSyncEngine {
    private monitoring;
    private conflicts;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Detect conflicts between local and remote versions
     */
    detectConflicts(localShard: any, remoteRecord: any, mapping: ConversionSchema, config: BidirectionalSyncConfig): Promise<SyncConflict | null>;
    /**
     * Resolve conflict using specified strategy
     */
    resolveConflict(conflict: SyncConflict, strategy: ConflictResolutionStrategy, resolvedBy?: string, customRules?: MergeRule[]): Promise<ConflictResolution>;
    /**
     * Merge fields intelligently
     */
    mergeFields(local: Record<string, any>, remote: Record<string, any>, conflicts: FieldConflict[], rules: MergeRule[]): Promise<Record<string, any>>;
    /**
     * Apply custom merge rules
     */
    private applyCustomRules;
    /**
     * Compare fields to find conflicts
     */
    private compareFields;
    /**
     * Check if values conflict
     */
    private valuesConflict;
    /**
     * Extract remote modified timestamp
     */
    private extractRemoteModifiedAt;
    /**
     * Extract remote value from record using field mapping
     */
    private extractRemoteValue;
    /**
     * Get conflict by ID
     */
    getConflict(conflictId: string): SyncConflict | undefined;
    /**
     * Get all pending conflicts for a tenant
     */
    getPendingConflicts(tenantId: string): SyncConflict[];
    /**
     * Ignore a conflict (mark as resolved without changes)
     */
    ignoreConflict(conflictId: string): void;
    /**
     * Clear resolved conflicts older than specified days
     */
    clearOldConflicts(daysOld?: number): number;
    /**
     * Get conflict statistics
     */
    getConflictStats(tenantId?: string): {
        total: number;
        pending: number;
        resolved: number;
        ignored: number;
    };
}
//# sourceMappingURL=bidirectional-sync.service.d.ts.map