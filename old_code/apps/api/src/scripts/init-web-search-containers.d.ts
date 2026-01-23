#!/usr/bin/env tsx
/**
 * Web Search Container Initialization
 *
 * Creates and configures the c_search and c_webpages containers
 * with proper partition keys, indexes, and TTL.
 *
 * Note: Hierarchical Partition Keys (HPK) using MultiHash require
 * Azure Cosmos DB SDK v4.8.0+ and API version 2023-04-01+
 *
 * Usage:
 *   npx tsx apps/api/src/scripts/init-web-search-containers.ts
 */
import { Database } from '@azure/cosmos';
interface WebSearchContainerConfig {
    id: string;
    partitionKey: string[];
    description: string;
    defaultTTL: number;
    indexes?: {
        composite?: Array<Array<{
            path: string;
            order: 'ascending' | 'descending';
        }>>;
    };
}
declare function createWebSearchContainer(database: Database, config: WebSearchContainerConfig): Promise<{
    created: boolean;
    name: string;
}>;
declare function initializeWebSearchContainers(): Promise<void>;
export { initializeWebSearchContainers, createWebSearchContainer };
//# sourceMappingURL=init-web-search-containers.d.ts.map