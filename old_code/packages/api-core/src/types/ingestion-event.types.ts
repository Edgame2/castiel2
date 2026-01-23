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
  sourceId: string; // ID in the external system
  eventType: IngestionEventType;
  observedAt: Date;
  payload?: any; // Raw payload from external system
  correlationId?: string; // For tracking across services
}

/**
 * Ingestion event metadata
 */
export interface IngestionEventMetadata {
  integrationId?: string; // Integration connection ID
  userId?: string; // User who triggered the sync (if manual)
  retryCount?: number; // Number of retries attempted
  errorMessage?: string; // Error message if processing failed
}






