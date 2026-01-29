/**
 * Opportunity Event Debouncer
 * Distributed debouncing using Redis for grouping multiple entity links within 5-second window per opportunity
 * @module @coder/shared/services
 */
/**
 * Debounce buffer entry
 */
interface DebounceBuffer {
    opportunityId: string;
    shardId: string;
    eventData: {
        integrationId: string;
        tenantId: string;
        syncTaskId: string;
        correlationId: string;
        metadata?: Record<string, any>;
    };
    expiresAt: number;
}
/**
 * Opportunity Event Debouncer
 * Uses Redis for distributed debouncing across multiple consumer instances
 */
export declare class OpportunityEventDebouncer {
    private debounceWindowMs;
    private cleanupInterval;
    private useRedis;
    private fallbackToMemory;
    private memoryBuffer;
    constructor(options?: {
        debounceWindowMs?: number;
        useRedis?: boolean;
        fallbackToMemory?: boolean;
    });
    /**
     * Schedule opportunity event (with debouncing)
     * Returns true if event should be published immediately, false if debounced
     */
    scheduleOpportunityEvent(opportunityId: string, shardId: string, eventData: {
        integrationId: string;
        tenantId: string;
        syncTaskId: string;
        correlationId: string;
        metadata?: Record<string, any>;
    }): Promise<{
        shouldPublish: boolean;
        bufferKey: string;
    }>;
    /**
     * Flush and publish opportunity event
     * Called when debounce window expires or on shutdown
     */
    flushAndPublish(bufferKey: string): Promise<DebounceBuffer | null>;
    /**
     * Get all pending opportunity events (for shutdown flush)
     */
    getAllPendingEvents(): Promise<DebounceBuffer[]>;
    /**
     * Cleanup expired entries
     */
    private cleanupExpiredEntries;
    /**
     * Stop debouncer (cleanup)
     */
    stop(): void;
}
export {};
//# sourceMappingURL=OpportunityEventDebouncer.d.ts.map