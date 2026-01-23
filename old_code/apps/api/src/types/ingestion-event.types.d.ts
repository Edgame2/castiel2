/**
 * Ingestion Event Types (Phase 2)
 *
 * Types for ingestion events emitted by Phase 2 ingestion functions
 */
/**
 * Ingestion source system
 */
export type IngestionSource = 'salesforce' | 'gdrive' | 'slack' | 'sharepoint';
/**
 * Ingestion event type
 */
export type IngestionEventType = 'create' | 'update' | 'delete';
/**
 * Ingestion event message
 * Emitted by ingestion functions to the ingestion-events queue
 */
export interface IngestionEvent {
    tenantId: string;
    source: IngestionSource;
    sourceId: string;
    eventType: IngestionEventType;
    observedAt: Date;
    payload?: any;
    correlationId?: string;
}
/**
 * Ingestion event metadata
 */
export interface IngestionEventMetadata {
    integrationId?: string;
    userId?: string;
    retryCount?: number;
    errorMessage?: string;
}
//# sourceMappingURL=ingestion-event.types.d.ts.map