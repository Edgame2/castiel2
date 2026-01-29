/**
 * Container Manager
 * Helper utilities for managing Cosmos DB containers
 * @module @coder/shared/database
 */
import { Container } from '@azure/cosmos';
/**
 * Get a container by name
 * Uses caching for performance
 * Note: Database must be connected first via connectDatabase()
 */
export declare function getContainer(containerName: string): Container;
/**
 * Ensure container exists (create if not exists)
 * Note: In production, containers should be created via infrastructure as code
 * This is mainly for development/testing
 * Note: Database must be connected first via connectDatabase()
 */
export declare function ensureContainer(containerName: string, partitionKey?: string, // Default to tenantId for multi-tenancy
options?: {
    defaultTtl?: number;
}): Promise<Container>;
//# sourceMappingURL=containerManager.d.ts.map