#!/usr/bin/env tsx
/**
 * Container Verification Script
 *
 * Verifies that all containers defined in config/env.ts are present in init-cosmos-db.ts
 * and checks for any missing or misconfigured containers.
 *
 * Usage:
 *   pnpm --filter @castiel/api run verify:containers
 *   or
 *   npx tsx apps/api/src/scripts/verify-containers.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
// Extract container IDs from init-cosmos-db.ts
function extractContainersFromInitScript(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const containers = new Set();
    // Match: id: 'container-name',
    const idRegex = /id:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = idRegex.exec(content)) !== null) {
        containers.add(match[1]);
    }
    return containers;
}
// Extract container names from config/env.ts
function extractContainersFromConfig(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const containers = new Set();
    // Match container names in config (e.g., shards: process.env.COSMOS_DB_SHARDS_CONTAINER || 'shards')
    const containerRegex = /(\w+):\s*process\.env\.COSMOS_DB_\w+_CONTAINER\s*\|\|\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = containerRegex.exec(content)) !== null) {
        const containerName = match[2];
        containers.add(containerName);
    }
    return containers;
}
function main() {
    console.log('🔍 Container Verification Script');
    console.log('==================================\n');
    const projectRoot = process.cwd();
    const initScriptPath = join(projectRoot, 'apps/api/src/scripts/init-cosmos-db.ts');
    const configPath = join(projectRoot, 'apps/api/src/config/env.ts');
    try {
        // Extract containers from both files
        const initContainers = extractContainersFromInitScript(initScriptPath);
        const configContainers = extractContainersFromConfig(configPath);
        console.log(`📦 Containers in init script: ${initContainers.size}`);
        console.log(`📋 Containers in config: ${configContainers.size}\n`);
        // Find missing containers
        const missingInInit = Array.from(configContainers).filter((c) => !initContainers.has(c));
        const extraInInit = Array.from(initContainers).filter((c) => !configContainers.has(c));
        // Report results
        if (missingInInit.length === 0 && extraInInit.length === 0) {
            console.log('✅ All containers are properly aligned!\n');
            console.log('📊 Summary:');
            console.log(`   ✅ ${initContainers.size} containers defined in init script`);
            console.log(`   ✅ ${configContainers.size} containers referenced in config`);
            console.log(`   ✅ All containers match\n`);
            process.exit(0);
        }
        else {
            console.log('⚠️  Container misalignment detected:\n');
            if (missingInInit.length > 0) {
                console.log('❌ Containers in config but missing from init script:');
                missingInInit.forEach((c) => console.log(`   - ${c}`));
                console.log('');
            }
            if (extraInInit.length > 0) {
                console.log('ℹ️  Containers in init script but not in config (may be intentional):');
                extraInInit.forEach((c) => console.log(`   - ${c}`));
                console.log('');
            }
            console.log('📊 Summary:');
            console.log(`   ⚠️  ${missingInInit.length} missing from init script`);
            console.log(`   ℹ️  ${extraInInit.length} extra in init script\n`);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Error during verification:', error.message);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=verify-containers.js.map