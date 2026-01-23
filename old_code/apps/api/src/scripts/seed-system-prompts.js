#!/usr/bin/env tsx
/**
 * Seed System Prompts
 *
 * Production-ready script to load system prompt definitions from
 * data/prompts/system-prompts.json and upsert them into the AI Insights
 * prompts container with tenantId "SYSTEM".
 *
 * Features:
 * - Validates prompt definitions before seeding
 * - Handles versioning automatically
 * - Provides detailed error reporting
 * - Verifies container exists
 * - Idempotent (safe to run multiple times)
 *
 * Usage:
 *   pnpm --filter @castiel/api run seed:prompts
 *
 * Prerequisites:
 *   - COSMOS_DB_ENDPOINT
 *   - COSMOS_DB_KEY
 *   - COSMOS_DB_DATABASE_ID (optional, defaults to castiel)
 *   - Prompts container must exist (run init-db first)
 */
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { MonitoringService } from '@castiel/monitoring';
import { AIInsightsCosmosService } from '../services/ai-insights/cosmos.service.js';
import { PromptRepository } from '../services/ai-insights/prompt.repository.js';
import { PromptScope, PromptStatus } from '../types/ai-insights/prompt.types.js';
// Load env
const rootEnv = path.resolve(process.cwd(), '.env');
const localEnv = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv });
function validatePromptDefinition(def) {
    if (!def.slug || typeof def.slug !== 'string') {
        throw new Error(`Invalid prompt: missing or invalid 'slug' field`);
    }
    if (!def.name || typeof def.name !== 'string') {
        throw new Error(`Invalid prompt '${def.slug}': missing or invalid 'name' field`);
    }
    if (!def.template || typeof def.template !== 'object') {
        throw new Error(`Invalid prompt '${def.slug}': missing or invalid 'template' field`);
    }
    if (!def.template.systemPrompt && !def.template.userPrompt) {
        throw new Error(`Invalid prompt '${def.slug}': template must have at least one of 'systemPrompt' or 'userPrompt'`);
    }
    if (def.scope !== 'system') {
        throw new Error(`Invalid prompt '${def.slug}': scope must be 'system' for system prompts`);
    }
    if (def.status && !['active', 'draft', 'archived'].includes(def.status)) {
        throw new Error(`Invalid prompt '${def.slug}': status must be 'active', 'draft', or 'archived'`);
    }
    return true;
}
async function verifyContainer(cosmos) {
    try {
        const container = cosmos.getPromptsContainer();
        await container.read();
        return true;
    }
    catch (error) {
        if (error.code === 404) {
            return false;
        }
        throw error;
    }
}
async function main() {
    console.log('========================================');
    console.log('🌱 System Prompts Seeding Script');
    console.log('========================================');
    console.log('');
    // Validate environment
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel';
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
    // Initialize services
    const monitoring = MonitoringService.initialize({ enabled: false, provider: 'mock' });
    const cosmos = new AIInsightsCosmosService(monitoring);
    const repo = new PromptRepository(cosmos);
    // Verify container exists
    console.log('🔍 Verifying prompts container exists...');
    const containerExists = await verifyContainer(cosmos);
    if (!containerExists) {
        console.error('❌ Prompts container does not exist.');
        console.error('   Please run: pnpm --filter @castiel/api run init-db');
        console.error('   This will create all required containers including the prompts container.');
        process.exit(1);
    }
    console.log('✅ Prompts container verified');
    console.log('');
    // Load and validate prompts file
    const dataPath = path.resolve(process.cwd(), 'data/prompts/system-prompts.json');
    if (!fs.existsSync(dataPath)) {
        console.error(`❌ Prompts file not found at ${dataPath}`);
        console.error('   Please ensure the file exists and contains valid JSON prompt definitions.');
        process.exit(1);
    }
    let prompts;
    try {
        const raw = fs.readFileSync(dataPath, 'utf-8');
        prompts = JSON.parse(raw);
        if (!Array.isArray(prompts)) {
            throw new Error('Prompts file must contain a JSON array');
        }
        if (prompts.length === 0) {
            console.warn('⚠️  Prompts file is empty. No prompts to seed.');
            process.exit(0);
        }
    }
    catch (error) {
        console.error(`❌ Failed to parse prompts file: ${error.message}`);
        process.exit(1);
    }
    // Validate all prompts
    console.log(`📄 Validating ${prompts.length} prompt definition(s)...`);
    const validationErrors = [];
    for (const def of prompts) {
        try {
            validatePromptDefinition(def);
        }
        catch (error) {
            validationErrors.push(error.message);
        }
    }
    if (validationErrors.length > 0) {
        console.error('❌ Validation errors found:');
        validationErrors.forEach((error, index) => {
            console.error(`   ${index + 1}. ${error}`);
        });
        process.exit(1);
    }
    console.log('✅ All prompts validated');
    console.log('');
    // Seed prompts
    console.log('🌱 Seeding system prompts...');
    console.log(`📁 Database: ${databaseId}`);
    console.log('');
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];
    for (const def of prompts) {
        try {
            const existing = await repo.findActiveBySlug('SYSTEM', def.slug);
            if (existing) {
                // Check if update is needed
                const needsUpdate = existing.name !== def.name ||
                    JSON.stringify(existing.template) !== JSON.stringify(def.template) ||
                    JSON.stringify(existing.ragConfig) !== JSON.stringify(def.ragConfig) ||
                    existing.insightType !== def.insightType ||
                    JSON.stringify(existing.tags) !== JSON.stringify(def.tags) ||
                    existing.status !== def.status ||
                    JSON.stringify(existing.metadata) !== JSON.stringify(def.metadata);
                if (needsUpdate) {
                    const nextVersion = (existing.version || 1) + 1;
                    await repo.update('SYSTEM', existing.id, {
                        name: def.name,
                        template: def.template,
                        ragConfig: def.ragConfig,
                        insightType: def.insightType,
                        tags: def.tags,
                        status: def.status,
                        version: nextVersion,
                        updatedAt: new Date(),
                        updatedBy: { userId: 'system', at: new Date() },
                        metadata: def.metadata,
                    });
                    updated += 1;
                    console.log(`♻️  Updated ${def.slug} -> v${nextVersion}`);
                }
                else {
                    skipped += 1;
                    console.log(`⊘ Skipped ${def.slug} (no changes)`);
                }
            }
            else {
                const now = new Date();
                const prompt = {
                    id: uuidv4(),
                    tenantId: 'SYSTEM',
                    partitionKey: 'SYSTEM',
                    type: 'prompt',
                    slug: def.slug,
                    name: def.name,
                    scope: PromptScope.System,
                    insightType: def.insightType,
                    tags: def.tags,
                    template: def.template,
                    ragConfig: def.ragConfig,
                    status: def.status || PromptStatus.Active,
                    version: def.version || 1,
                    createdAt: now,
                    updatedAt: now,
                    createdBy: { userId: 'system', at: now },
                    updatedBy: { userId: 'system', at: now },
                    metadata: def.metadata,
                };
                await repo.create(prompt);
                created += 1;
                console.log(`✅ Created ${def.slug} v${prompt.version}`);
            }
        }
        catch (error) {
            const errorMsg = `Failed to process ${def.slug}: ${error.message}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
        }
    }
    // Summary
    console.log('');
    console.log('========================================');
    console.log('📊 Seeding Summary');
    console.log('========================================');
    console.log(`✅ Created:  ${created}`);
    console.log(`♻️  Updated:  ${updated}`);
    console.log(`⊘ Skipped:  ${skipped}`);
    if (errors.length > 0) {
        console.log(`❌ Errors:   ${errors.length}`);
        console.log('');
        console.log('Errors encountered:');
        errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
        process.exit(1);
    }
    console.log('');
    console.log('✅ Seeding completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  - Verify prompts are accessible via API');
    console.log('  - Test prompt resolution in AI Insights');
}
main().catch((err) => {
    console.error('');
    console.error('❌ Fatal error during seeding:');
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=seed-system-prompts.js.map