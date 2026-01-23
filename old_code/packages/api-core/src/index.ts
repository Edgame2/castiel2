/**
 * @castiel/api-core
 * 
 * Standalone package containing shared API services, repositories, and types.
 * This package is self-contained and does not depend on apps/api/src.
 * Used by workers-processing and other applications that need shared business logic.
 */

// Re-export all services
export * from './services/secure-credential.service.js';
export * from './services/sync-task.service.js';
export * from './services/conversion-schema.service.js';
// IntegrationAdapterRegistry is exported from integrations/base-adapter.js
// Use explicit exports to avoid WebhookEvent conflict
export {
  IntegrationAdapterRegistry,
  adapterRegistry,
  type BaseIntegrationAdapter,
  type IntegrationAdapterFactory,
  type FetchOptions,
  type FetchResult,
  type PushOptions,
  type PushResult,
  type WebhookEvent,
  type BatchFetchOptions,
  type HealthCheckResult,
  type DiscoveredEntity,
  type RateLimitInfo,
} from './integrations/base-adapter.js';
// Export IntegrationAdapter type from adapter.types
export type { IntegrationAdapter } from './types/adapter.types.js';
export * from './services/integration-shard.service.js';
export * from './services/integration-deduplication.service.js';
// Export bidirectional-sync with explicit exports to avoid conflicts
export {
  BidirectionalSyncEngine,
  type ConflictResolutionStrategy,
  type SyncConflict,
  type ConflictResolution,
  type ChangeTrackingMethod,
  type BidirectionalSyncConfig,
  type FieldConflict,
  type MergeRule,
} from './services/bidirectional-sync.service.js';
// Export integration-rate-limiter with explicit exports to avoid RateLimitConfig conflict
export {
  IntegrationRateLimiter,
  type RateLimitResult,
  RedisCacheProvider,
  type ICacheProvider,
} from './services/integration-rate-limiter.service.js';
export type { RateLimitConfig, RateLimitStatus, RateLimitAlert } from './services/integration-rate-limiter.service.js';
export * from './services/webhook-management.service.js';
export * from './services/cosmos-db.service.js';
export * from './services/auth/cosmos-db.service.js'; // CosmosDbClient
export * from './services/adapter-manager.service.js';
export * from './services/integration-external-user-id.service.js';
export * from './services/integration.service.js';
export * from './services/integration-connection.service.js';
// AzureServiceBusService is deprecated - use QueueService from @castiel/queue instead
// export * from '../../../apps/api/src/services/azure-service-bus.service.js';
export * from './services/azure-openai.service.js';
export * from './services/sso-team-sync.service.js';
export * from './services/team.service.js';
export * from './services/shard-relationship.service.js';
export * from './services/notification.service.js';
export * from './services/auth/user.service.js';
export * from './services/auth/tenant.service.js';
export * from './services/email/email.service.js';
export * from './services/audit/audit-log.service.js';
export * from './services/insight.service.js';
export * from './services/intent-analyzer.service.js';
export * from './services/conversation.service.js';
export * from './services/opportunity-auto-linking.service.js';
export * from './services/project-auto-attachment.service.js';
export * from './services/risk-evaluation.service.js';
export * from './services/risk-catalog.service.js';
export * from './services/vector-search.service.js';
// Content generation services are exported below
// ContextTemplateService is already exported from ./services/context-template.service.js above
// RelationshipService doesn't exist - use ShardRelationshipService (already exported above)
export * from './services/notifications/digest.service.js';
export * from './services/notifications/email-notification.service.js';
export * from './services/notifications/webhook-notification.service.js';
export * from './services/notifications/slack-notification.service.js';
export * from './services/notifications/teams-notification.service.js';
export * from './services/notifications/push-notification.service.js';
// Export DeliveryTrackingService explicitly to avoid RetryConfig conflict with sync-task.types
export { DeliveryTrackingService } from './services/notifications/delivery-tracking.service.js';
export type { DeliveryAttempt } from './services/notifications/delivery-tracking.service.js';

// Re-export all repositories
export * from './repositories/sync-task.repository.js';
export * from './repositories/conversion-schema.repository.js';
export * from './repositories/shard.repository.js';
export * from './repositories/shard-type.repository.js';
export * from './repositories/shard-edge.repository.js';
// IntegrationConnectionRepository is exported from integration.repository.js
// It's already included in the export * from integration.repository.js above
export * from './repositories/integration.repository.js';
export * from './repositories/notification.repository.js';
export * from './repositories/notification-digest.repository.js';
export * from './repositories/notification-preference.repository.js';
export * from './repositories/document-template.repository.js';
export * from './repositories/generation-job.repository.js';

// Re-export all types
// Export integration types explicitly to avoid RelationshipMapping conflict
export * from './types/integration.types.js';
// Note: RelationshipMapping is exported from both integration.types and conversion-schema.types
// The one from integration.types takes precedence
// Export shard types with explicit exports to avoid conflicts
export type {
  Shard,
  CreateShardInput,
  UpdateShardInput,
  ShardListOptions,
  ShardListResult,
  ShardStatus,
  ShardSource,
  PermissionCheckResult,
  PermissionLevel,
  InternalRelationship,
} from './types/shard.types.js';
export { SyncDirection, SyncStatus, isValidSyncDirection, isValidSyncStatus } from './types/shard.types.js';
export * from './types/notification.types.js';
export * from './types/team.types.js';
// Export enrichment types explicitly to avoid ExtractedEntity and Citation conflicts
// Note: ExtractedEntity is in both enrichment.types and vector-search.types
// Citation is in both enrichment.types and vector-search.types
// We'll export from enrichment.types first, then vector-search.types will override if needed
// Export enrichment types - ExtractedEntity conflicts with ai-insights.types
// We'll export everything from enrichment.types, then ai-insights will override ExtractedEntity
export * from './types/enrichment.types.js';
export * from './types/sync-task.types.js';
export * from './types/embedding-template.types.js';
export * from './types/field-security.types.js';
export * from './types/shard-type.types.js';
export * from './types/ingestion-event.types.js';
// Export conversion-schema types but exclude RelationshipMapping (already exported from integration.types)
// Export all types explicitly except RelationshipMapping
export type {
  SourceFilterOperator,
  SourceFilter,
  SourceConfig,
  TargetConfig,
  ConditionalRule as ConversionConditionalRule,
  DerivedShardConfig,
  MultiShardOutputConfig,
  FieldMappingType,
  TransformationType,
  Transformation,
  ConditionalOperator,
  Condition,
  ConditionalThen,
  DirectMappingConfig,
  TransformMappingConfig,
  ConditionalMappingConfig,
  DefaultMappingConfig,
  CompositeMappingConfig,
  ConversionSchema,
  CreateConversionSchemaInput,
  UpdateConversionSchemaInput,
  ConversionSchemaListOptions,
  ConversionSchemaListResult,
  FieldMapping,
  FieldMappingConfig,
  TransformationContext,
  TransformationResult,
  SchemaTestInput,
  SchemaTestResult,
} from './types/conversion-schema.types.js';
export * from './types/core-shard-types.js';
export * from './types/shard-edge.types.js';
export * from './types/risk-analysis.types.js';
// Export vector-search types - Citation conflicts with ai-insights.types
// We'll export everything from vector-search.types, then ai-insights will override Citation
export * from './types/vector-search.types.js';
// Export comprehensive-audit types - TokenUsage conflicts with conversation.types
// Export everything explicitly except TokenUsage
export type {
  ComprehensiveAuditLogEntry,
  AuditOperation,
  DataLineage,
  AIInteractionLog,
  DecisionTrail,
  ComprehensiveAuditLogQuery,
  ComprehensiveAuditLogQueryResponse,
  ComprehensiveAuditLogStats,
} from './types/comprehensive-audit.types.js';
// Export TokenUsage from comprehensive-audit.types (preferred over conversation.types)
export type { TokenUsage as ComprehensiveAuditTokenUsage } from './types/comprehensive-audit.types.js';
// Export conversation types - TokenUsage conflicts with comprehensive-audit.types
// Export everything using export * (TokenUsage will override comprehensive-audit.types)
export * from './types/conversation.types.js';
export * from './types/vectorization.types.js';
// Export ai-insights types - ExtractedEntity, Citation, and AssembledContext conflict with other modules
// Export everything explicitly except the conflicting types
export type {
  InsightType,
  InsightTrigger,
  InsightFormat,
  ContextScope,
  IntentAnalysisResult,
  ContextChunk,
  RAGChunk,
  LLMExecutionRequest,
  LLMExecutionResult,
  ToolDefinition,
  ToolCallResult,
  GroundedResponse,
  VerifiedClaim,
  GroundingWarning,
  InsightRequest,
  InsightResponse,
} from './types/ai-insights.types.js';
// Export conflicting types from ai-insights.types (preferred versions)
export type { ExtractedEntity as AIInsightsExtractedEntity } from './types/ai-insights.types.js';
export type { Citation as AIInsightsCitation } from './types/ai-insights.types.js';
export type { AssembledContext as AIInsightsAssembledContext } from './types/ai-insights.types.js';
// Export context-template types - AssembledContext conflicts with ai-insights.types
// Since ai-insights was exported last, its AssembledContext takes precedence
// We'll export everything except AssembledContext from context-template.types
export type {
  TemplateScope,
  TemplateCategory,
  SourceSelection,
  FieldSelection,
  FieldTransform,
  RelationshipSource,
  RAGConfiguration,
  TokenLimits,
  OutputConfiguration,
  ContextTemplateStructuredData,
  SystemTemplateId,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateQueryOptions,
  TemplateSelectionOptions,
  ContextAssemblyOptions,
  RelationshipConfig,
  FieldConfig,
} from './types/context-template.types.js';
// Export AssembledContext from context-template.types (preferred for context templates)
export type { AssembledContext } from './types/context-template.types.js';
// Export CORE_SHARD_TYPE_NAMES constant explicitly
export { CORE_SHARD_TYPE_NAMES } from './types/core-shard-types.js';

// Re-export content generation types
export * from './types/content-generation/generation.types.js';

// Re-export content generation services
export { DocumentRewriterFactory } from './services/content-generation/rewriters/rewriter-factory.js';
export type { DuplicateResult } from './services/content-generation/rewriters/base-rewriter.js';
export type { BaseDocumentRewriter } from './services/content-generation/rewriters/base-rewriter.js';
export type { DocumentAuthToken } from './services/content-generation/rewriters/base-rewriter.js';
export { DocumentTemplateService } from './services/content-generation/services/document-template.service.js';
export { GenerationProcessorService } from './services/content-generation/services/generation-processor.service.js';
export { ContextTemplateService } from './services/context-template.service.js';

// Re-export integration adapters
export * from './integrations/adapters/google-workspace.adapter.js';
export * from './integrations/adapters/salesforce.adapter.js';

// Re-export document processing services (migrated from functions/)
export * from './services/lightweight-notification.service.js';
export * from './services/document-check-orchestrator.service.js';
export * from './services/text-extractor.service.js';
export * from './services/text-normalizer.service.js';
export * from './services/chunking-engine.service.js';
export * from './services/shard-creator.service.js';
export * from './services/document-relationship-updater.service.js';
export * from './services/security-check.service.js';
export * from './services/clamav.service.js';

// Re-export document processing types (migrated from functions/)
export * from './types/document-check.types.js';
export * from './types/document-chunking.types.js';

