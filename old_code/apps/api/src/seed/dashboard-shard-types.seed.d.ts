/**
 * Dashboard Shard Types Seed Data
 *
 * Defines the shard types for dashboards, widgets, and user groups
 */
import type { ShardType } from '../types/shard-type.types.js';
/**
 * c_dashboard - Dashboard Shard Type
 */
export declare const DASHBOARD_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_dashboardWidget - Dashboard Widget Shard Type
 */
export declare const DASHBOARD_WIDGET_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_userGroup - User Group Shard Type
 */
export declare const USER_GROUP_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * c_dashboardVersion - Dashboard Version Shard Type
 */
export declare const DASHBOARD_VERSION_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * Get all dashboard-related shard types
 */
export declare function getDashboardShardTypes(): Omit<ShardType, "id" | "createdAt" | "updatedAt">[];
/**
 * Get dashboard shard type by name
 */
export declare function getDashboardShardTypeByName(name: string): Omit<ShardType, "id" | "createdAt" | "updatedAt"> | undefined;
//# sourceMappingURL=dashboard-shard-types.seed.d.ts.map