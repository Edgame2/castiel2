/**
 * Core Shard Types Seed Data
 *
 * Defines the built-in shard types for common use cases
 */
import type { ShardType } from '../types/shard-type.types.js';
/**
 * c_task - Task/Todo Shard Type
 */
export declare const TASK_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_event - Calendar Event Shard Type
 */
export declare const EVENT_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_email - Email Thread Shard Type
 */
export declare const EMAIL_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_project - Project Shard Type
 */
export declare const PROJECT_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_document - Document Shard Type
 */
export declare const DOCUMENT_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_opportunity - Salesforce Opportunity Shard Type (Phase 2)
 */
export declare const OPPORTUNITY_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_account - Salesforce Account Shard Type (Phase 2)
 */
export declare const ACCOUNT_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_folder - Google Drive/SharePoint Folder Shard Type (Phase 2)
 */
export declare const FOLDER_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_file - Google Drive/SharePoint File Shard Type (Phase 2)
 */
export declare const FILE_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_sp_site - SharePoint Site Shard Type (Phase 2)
 */
export declare const SP_SITE_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_channel - Slack/Teams Channel Shard Type (Phase 2)
 */
export declare const CHANNEL_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * integration.state - Integration State Shard Type (Phase 2)
 */
export declare const INTEGRATION_STATE_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * Get all core shard types
 */
export declare function getCoreShardTypes(): Omit<ShardType, "id" | "createdAt" | "updatedAt">[];
/**
 * Get shard type by name
 */
export declare function getCoreShardTypeByName(name: string): Omit<ShardType, "id" | "createdAt" | "updatedAt"> | undefined;
//# sourceMappingURL=core-shard-types.seed.d.ts.map