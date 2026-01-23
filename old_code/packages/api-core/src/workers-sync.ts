/**
 * @castiel/api-core - Workers Sync Exports
 * 
 * Minimal export file for workers-sync that only exports what it actually uses.
 * This avoids TypeScript errors from optional AI services that workers-sync doesn't need.
 */

// Core sync services (used by workers-sync)
export * from './services/secure-credential.service.js';
export * from './services/sync-task.service.js';
export * from './services/conversion-schema.service.js';
export * from './services/integration-shard.service.js';
export * from './services/integration-deduplication.service.js';
export {
  BidirectionalSyncEngine,
  type ConflictResolutionStrategy,
  type SyncConflict,
  type ConflictResolution,
} from './services/bidirectional-sync.service.js';
export {
  IntegrationRateLimiter,
  type RateLimitResult,
} from './services/integration-rate-limiter.service.js';
export type { RateLimitConfig } from './services/integration-rate-limiter.service.js';
export * from './services/webhook-management.service.js';
export * from './services/adapter-manager.service.js';
export * from './services/integration.service.js';
export * from './services/sso-team-sync.service.js';
export * from './services/team.service.js';
export * from './services/shard-relationship.service.js';

// Integration adapters
export {
  IntegrationAdapterRegistry,
  adapterRegistry,
  type BaseIntegrationAdapter,
} from './integrations/base-adapter.js';
export type { IntegrationAdapter } from './types/adapter.types.js';

// Core repositories (used by workers-sync)
export * from './repositories/sync-task.repository.js';
export * from './repositories/conversion-schema.repository.js';
export * from './repositories/shard.repository.js';
export * from './repositories/shard-type.repository.js';
export * from './repositories/integration.repository.js';

// Core types (used by workers-sync)
export * from './types/integration.types.js';
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
export * from './types/sync-task.types.js';
export * from './types/core-shard-types.js';
export { CORE_SHARD_TYPE_NAMES } from './types/core-shard-types.js';

// Integration adapters (used by workers-sync)
export * from './integrations/adapters/google-workspace.adapter.js';
export * from './integrations/adapters/salesforce.adapter.js';

