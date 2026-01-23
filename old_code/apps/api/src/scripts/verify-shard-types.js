#!/usr/bin/env tsx
/**
 * Verify Shard Types Script
 *
 * Verifies that all core shard types exist in the database.
 * This is useful for checking if seeding was successful.
 *
 * Usage:
 *   npx tsx apps/api/src/scripts/verify-shard-types.ts
 *
 * Or with pnpm:
 *   pnpm --filter @castiel/api run verify:shard-types
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { MonitoringService } from '@castiel/monitoring';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { CORE_SHARD_TYPE_NAMES, CORE_SHARD_TYPES } from '../types/core-shard-types.js';
// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const SYSTEM_TENANT_ID = 'system';
async function verifyShardTypes() {
    // Get configuration from environment
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel';
    // Validate configuration
    if (!endpoint || !key) {
        console.error('❌ Missing Cosmos DB configuration:');
        if (!endpoint) {
            console.error('   - COSMOS_DB_ENDPOINT is not set');
        }
        if (!key) {
            console.error('   - COSMOS_DB_KEY is not set');
        }
        console.error('\nPlease set these environment variables in your .env or .env.local file.');
        process.exit(1);
    }
    console.log('🔍 Shard Types Verification');
    console.log('===========================');
    console.log(`📍 Endpoint: ${endpoint.substring(0, 50)}...`);
    console.log(`📁 Database: ${databaseId}`);
    console.log('');
    // Initialize monitoring (disabled for script)
    const monitoring = MonitoringService.initialize({
        enabled: false,
        provider: 'mock',
    });
    try {
        // Initialize repository
        console.log('📦 Initializing repository...');
        const shardTypeRepo = new ShardTypeRepository(monitoring);
        await shardTypeRepo.ensureContainer();
        console.log('   ✅ ShardType repository initialized');
        console.log('');
        // Check each core shard type
        console.log('🔍 Checking core shard types...');
        console.log('');
        const results = {
            found: [],
            missing: [],
            withEmbeddingTemplate: [],
            withoutEmbeddingTemplate: [],
        };
        for (const typeName of Object.values(CORE_SHARD_TYPE_NAMES)) {
            try {
                const shardType = await shardTypeRepo.findByName(typeName, SYSTEM_TENANT_ID);
                if (shardType) {
                    results.found.push(typeName);
                    // Check if embedding template exists
                    if (shardType.embeddingTemplate) {
                        results.withEmbeddingTemplate.push(typeName);
                    }
                    else {
                        results.withoutEmbeddingTemplate.push(typeName);
                    }
                }
                else {
                    results.missing.push(typeName);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`   ❌ Error checking ${typeName}: ${errorMessage}`);
                results.missing.push(typeName);
            }
        }
        // Display results
        console.log('📊 Verification Results:');
        console.log('');
        console.log(`   ✅ Found:           ${results.found.length}/${CORE_SHARD_TYPES.length}`);
        console.log(`   ❌ Missing:         ${results.missing.length}`);
        console.log(`   📄 With Template:   ${results.withEmbeddingTemplate.length}`);
        console.log(`   ⚠️  No Template:     ${results.withoutEmbeddingTemplate.length}`);
        console.log('');
        if (results.missing.length > 0) {
            console.log('❌ Missing Shard Types:');
            results.missing.forEach(name => {
                console.log(`   - ${name}`);
            });
            console.log('');
            console.log('💡 Run the seeder to create missing types:');
            console.log('   pnpm --filter @castiel/api run seed-types');
            console.log('');
        }
        if (results.withoutEmbeddingTemplate.length > 0) {
            console.log('⚠️  Shard Types Without Embedding Templates:');
            results.withoutEmbeddingTemplate.forEach(name => {
                console.log(`   - ${name}`);
            });
            console.log('');
        }
        // Show some found types
        if (results.found.length > 0) {
            console.log('✅ Sample of Found Types (first 10):');
            results.found.slice(0, 10).forEach(name => {
                const hasTemplate = results.withEmbeddingTemplate.includes(name) ? '📄' : '⚠️';
                console.log(`   ${hasTemplate} ${name}`);
            });
            if (results.found.length > 10) {
                console.log(`   ... and ${results.found.length - 10} more`);
            }
            console.log('');
        }
        console.log('===========================');
        if (results.missing.length > 0) {
            console.log('❌ Verification FAILED - Some shard types are missing.');
            process.exit(1);
        }
        else if (results.withoutEmbeddingTemplate.length > 0) {
            console.log('⚠️  Verification PASSED with warnings - Some types lack embedding templates.');
            process.exit(0);
        }
        else {
            console.log('✅ Verification PASSED - All shard types exist with embedding templates.');
            process.exit(0);
        }
    }
    catch (error) {
        console.error('');
        console.error('❌ Fatal error during verification:');
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`   ${errorMessage}`);
        const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
        if (errorCode === 404) {
            console.error('');
            console.error('   Container not found. Have you run the init-db script?');
            console.error('   Run: pnpm --filter @castiel/api run init-db');
        }
        process.exit(1);
    }
}
// ============================================================================
// Run Script
// ============================================================================
verifyShardTypes().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
//# sourceMappingURL=verify-shard-types.js.map