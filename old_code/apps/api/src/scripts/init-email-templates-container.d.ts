#!/usr/bin/env tsx
/**
 * Email Templates Container Initialization
 *
 * Creates and configures the EmailTemplates container
 * with partition key, unique keys, and indexing policies.
 *
 * Usage:
 *   npx tsx apps/api/src/scripts/init-email-templates-container.ts
 */
import { Database } from '@azure/cosmos';
interface EmailTemplatesContainerConfig {
    id: string;
    partitionKey: string;
    description: string;
    uniqueKeys: string[][];
    indexes?: {
        composite?: Array<Array<{
            path: string;
            order: 'ascending' | 'descending';
        }>>;
    };
}
declare function createEmailTemplatesContainer(database: Database, config: EmailTemplatesContainerConfig): Promise<{
    created: boolean;
    name: string;
}>;
declare function initializeEmailTemplatesContainer(): Promise<void>;
export { initializeEmailTemplatesContainer, createEmailTemplatesContainer };
//# sourceMappingURL=init-email-templates-container.d.ts.map