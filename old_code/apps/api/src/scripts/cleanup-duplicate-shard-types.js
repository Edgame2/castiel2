#!/usr/bin/env tsx
/**
 * Cleanup Duplicate Shard Types Script
 *
 * Finds and removes duplicate global ShardTypes, keeping only the most recently updated one.
 *
 * Usage:
 *   npx tsx apps/api/src/scripts/cleanup-duplicate-shard-types.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
// Load environment variables BEFORE importing anything that uses config
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env.local') });
console.log('CWD:', process.cwd());
console.log('JWT_ACCESS_SECRET present:', !!process.env.JWT_ACCESS_SECRET);
if (!process.env.JWT_ACCESS_SECRET) {
    console.error('JWT_ACCESS_SECRET is missing!');
    process.exit(1);
}
import { CosmosClient } from '@azure/cosmos';
import { MonitoringService } from '@castiel/monitoring';
const SYSTEM_TENANT_ID = 'system';
async function cleanupDuplicates() {
    // Dynamic import to avoid hoisting issues
    const { ShardTypeRepository } = await import('../repositories/shard-type.repository.js');
    const { ShardTypeStatus } = await import('../types/shard-type.types.js');
    // Get configuration from environment
    // Get configuration from environment
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel';
    // Validate configuration
    if (!endpoint || !key) {
        console.error('❌ Missing Cosmos DB configuration');
        process.exit(1);
    }
    console.log('🧹 Cleanup Duplicate Shard Types');
    console.log('================================');
    // Initialize monitoring (disabled for script)
    const monitoring = MonitoringService.initialize({
        enabled: false,
        provider: 'mock',
    });
    const repo = new ShardTypeRepository(monitoring);
    await repo.ensureContainer();
    try {
        // 1. Fetch all global shard types (including duplicates)
        // We need to bypass the repository's list method which now deduplicates, 
        // so we'll query the container directly or use a raw query if possible.
        // Actually, the repository list method deduplicates *in memory* after fetching a page.
        // But we want ALL of them.
        // Let's use a direct query to get all global types
        const client = new CosmosClient({ endpoint, key });
        const container = client.database(databaseId).container('shard-types');
        console.log('🔍 Fetching all global shard types...');
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.tenantId = @systemTenant AND c.isGlobal = true AND c.status != @deletedStatus',
            parameters: [
                { name: '@systemTenant', value: SYSTEM_TENANT_ID },
                { name: '@deletedStatus', value: ShardTypeStatus.DELETED },
            ],
        };
        const { resources: allGlobalTypes } = await container.items.query(querySpec).fetchAll();
        console.log(`   Found ${allGlobalTypes.length} global shard types.`);
        // 2. Group by name
        const groupedByName = new Map();
        for (const type of allGlobalTypes) {
            const existing = groupedByName.get(type.name) || [];
            existing.push(type);
            groupedByName.set(type.name, existing);
        }
        // 3. Identify duplicates
        let deletedCount = 0;
        let keptCount = 0;
        for (const [name, types] of groupedByName.entries()) {
            if (types.length <= 1) {
                keptCount++;
                continue;
            }
            console.log(`   Found ${types.length} versions of '${name}'`);
            // Sort by updatedAt desc (newest first)
            types.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            const toKeep = types[0];
            const toDelete = types.slice(1);
            console.log(`      Keeping: ${toKeep.id} (updated: ${toKeep.updatedAt})`);
            for (const type of toDelete) {
                console.log(`      Deleting: ${type.id} (updated: ${type.updatedAt})`);
                // Soft delete
                const deletedType = {
                    ...type,
                    status: ShardTypeStatus.DELETED,
                    deletedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await container.item(type.id, SYSTEM_TENANT_ID).replace(deletedType);
                deletedCount++;
            }
            keptCount++;
        }
        console.log('');
        console.log('📊 Summary:');
        console.log(`   ✅ Kept (Unique): ${keptCount}`);
        console.log(`   🗑️  Deleted (Duplicates): ${deletedCount}`);
        console.log('');
    }
    catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}
cleanupDuplicates().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
//# sourceMappingURL=cleanup-duplicate-shard-types.js.map