#!/usr/bin/env node
/**
 * Validation Script for Core Shard Types
 *
 * Verifies that:
 * 1. All shard types are properly defined and exported
 * 2. All embedding templates are mapped correctly
 * 3. All relationship types have inverse mappings
 * 4. Seeder service can access all templates
 *
 * Usage: pnpm --filter @castiel/api run validate-shard-types
 */
interface ValidationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
    stats: {
        shardTypes: number;
        embeddingTemplates: number;
        relationshipTypes: number;
        mappedTemplates: number;
    };
}
/**
 * Validate core shard types implementation
 */
export declare function validateCoreShardTypes(): ValidationResult;
/**
 * Main validation function
 */
export declare function runValidation(): void;
export {};
//# sourceMappingURL=validate-core-shard-types.d.ts.map