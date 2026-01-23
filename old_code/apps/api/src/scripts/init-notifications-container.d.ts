#!/usr/bin/env tsx
/**
 * Notifications Container Initialization
 *
 * Creates and configures the notifications container
 * with hierarchical partition keys (HPK), indexes, and TTL.
 *
 * Note: Hierarchical Partition Keys (HPK) using MultiHash require
 * Azure Cosmos DB SDK v4.8.0+ and API version 2023-04-01+
 *
 * Usage:
 *   npx tsx apps/api/src/scripts/init-notifications-container.ts
 */
import { Database } from '@azure/cosmos';
interface NotificationsContainerConfig {
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
declare function createNotificationsContainer(database: Database, config: NotificationsContainerConfig): Promise<{
    created: boolean;
    name: string;
}>;
declare function initializeNotificationsContainer(): Promise<void>;
export { initializeNotificationsContainer, createNotificationsContainer };
//# sourceMappingURL=init-notifications-container.d.ts.map