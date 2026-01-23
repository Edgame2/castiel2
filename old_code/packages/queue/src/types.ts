/**
 * Queue Job Types
 * 
 * Defines all job types and their payloads for BullMQ queues
 */

// Embedding Jobs
export interface EmbeddingJobMessage {
  shardId: string;
  tenantId: string;
  shardTypeId: string;
  revisionNumber: number;
  dedupeKey: string;
  correlationId?: string; // For tracking related jobs
  parentJobId?: string; // For parent-child job relationships
}

// Document Processing Jobs
export interface DocumentChunkJobMessage {
  shardId: string;
  tenantId: string;
  userId?: string;
  projectId?: string;
  containerName: string;
  documentFileName: string;
  filePath: string;
  enqueuedAt: string;
  correlationId?: string; // For tracking related jobs
  parentJobId?: string; // For parent-child job relationships
}

export interface DocumentCheckJobMessage {
  shardId: string;
  tenantId: string;
  userId?: string;
  documentFileName: string;
  filePath?: string; // Optional - can use blobUrl as fallback
  blobUrl?: string;
  metadata?: Record<string, any>;
  enqueuedAt?: string; // Optional - will be set if not provided
  correlationId?: string; // For tracking related jobs
  parentJobId?: string; // For parent-child job relationships
}

// Content Generation Jobs
export interface GenerationJobMessage {
  id: string;
  templateId: string;
  tenantId: string;
  userId: string;
  status: string;
  destinationProvider: string;
  template?: any;
  userToken?: string;
  correlationId?: string; // For tracking related jobs
}

// Sync Jobs
export interface SyncInboundScheduledMessage {
  integrationId: string;
  tenantId: string;
  connectionId: string;
  syncTaskId: string;
  scheduledAt: string;
  correlationId?: string; // For tracking related jobs
}

export interface SyncInboundWebhookMessage {
  integrationId: string;
  tenantId: string;
  connectionId: string;
  webhookEvent: any;
  receivedAt: string;
  correlationId?: string; // For tracking related jobs
}

export interface SyncOutboundMessage {
  integrationId: string;
  tenantId: string;
  connectionId: string;
  entityId: string;
  shardId: string;
  operation: 'create' | 'update' | 'delete';
  changes: Record<string, any>;
  correlationId: string;
  timestamp: string;
}

// Ingestion Jobs
export interface IngestionEventMessage {
  tenantId: string;
  sourceId: string;
  source: string;
  eventType: string;
  data: any;
  timestamp: string;
  correlationId?: string; // For tracking related jobs
}

// Processing Jobs
export interface EnrichmentJobMessage {
  jobId: string;
  tenantId: string;
  shardId: string;
  configId: string;
  processors?: string[];
  shardTypeId?: string;
  correlationId?: string; // For tracking related jobs
  parentJobId?: string; // For parent-child job relationships
}

export interface ShardCreatedMessage {
  shardId: string;
  tenantId: string;
  shardTypeId: string;
  shard: any;
  correlationId?: string; // For tracking related jobs
}

export interface RiskEvaluationMessage {
  opportunityId: string;
  tenantId: string;
  userId: string;
  trigger: 'scheduled' | 'opportunity_updated' | 'shard_created' | 'manual';
  priority: 'high' | 'normal' | 'low';
  options: {
    includeHistorical?: boolean;
    includeAI?: boolean;
    includeSemanticDiscovery?: boolean;
  };
  timestamp: Date;
  correlationId?: string; // For tracking related jobs
}

// Shard Emission Jobs
export interface ShardEmissionMessage {
  shardId: string;
  tenantId: string;
  shardTypeId: string;
  eventType: 'created' | 'updated' | 'deleted' | 'restored';
  triggeredBy?: string;
  triggerSource?: 'api' | 'worker' | 'sync' | 'system';
  changes?: Record<string, any>;
  previousState?: Record<string, any>;
  shardSnapshot?: {
    id: string;
    tenantId: string;
    shardTypeId: string;
    shardTypeName?: string;
    title?: string;
    status?: string;
    structuredData?: any;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
  timestamp: string;
  correlationId?: string; // For tracking related jobs
}

// Queue Names
export enum QueueName {
  EMBEDDING_JOBS = 'embedding-jobs',
  DOCUMENT_CHUNK_JOBS = 'document-chunk-jobs',
  DOCUMENT_CHECK_JOBS = 'document-check-jobs',
  CONTENT_GENERATION_JOBS = 'content-generation-jobs',
  SYNC_INBOUND_SCHEDULED = 'sync-inbound-scheduled',
  SYNC_INBOUND_WEBHOOK = 'sync-inbound-webhook',
  SYNC_OUTBOUND = 'sync-outbound',
  INGESTION_EVENTS = 'ingestion-events',
  ENRICHMENT_JOBS = 'enrichment-jobs',
  SHARD_CREATED = 'shard-created',
  SHARD_EMISSION = 'shard-emission',
  RISK_EVALUATIONS = 'risk-evaluations',
}

