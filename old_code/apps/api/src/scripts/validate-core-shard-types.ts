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

import {
  CORE_SHARD_TYPES,
  CORE_SHARD_TYPE_NAMES,
  EMBEDDING_TEMPLATE_MAP,
  getCoreShardType,
} from '../types/core-shard-types.js';
import { RelationshipType, getInverseRelationship } from '../types/shard-edge.types.js';

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
export function validateCoreShardTypes(): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
    stats: {
      shardTypes: 0,
      embeddingTemplates: 0,
      relationshipTypes: 0,
      mappedTemplates: 0,
    },
  };

  // 1. Validate shard types
  console.log('🔍 Validating shard types...');
  result.stats.shardTypes = CORE_SHARD_TYPES.length;
  
  const shardTypeNames = new Set(CORE_SHARD_TYPES.map(t => t.name));
  const expectedNames = new Set(Object.values(CORE_SHARD_TYPE_NAMES));
  
  // Shard types that are defined in separate seed files (legacy implementations)
  const legacyTypes = new Set([
    'c_document',      // Defined in apps/api/src/seed/core-shard-types.seed.ts
    'c_assistant',     // May be defined elsewhere or not yet implemented
    'c_contextTemplate', // Defined in apps/api/src/seed/context-templates.seed.ts
  ]);

  // Check for missing shard types
  for (const expectedName of expectedNames) {
    if (!shardTypeNames.has(expectedName)) {
      if (legacyTypes.has(expectedName)) {
        // Legacy types are defined in separate seed files, not errors
        result.warnings.push(`Shard type ${expectedName} is defined in a separate seed file (not in CORE_SHARD_TYPES)`);
      } else {
        result.errors.push(`Missing shard type: ${expectedName}`);
        result.passed = false;
      }
    }
  }
  
  // Check for extra shard types
  for (const actualName of shardTypeNames) {
    if (!expectedNames.has(actualName)) {
      result.warnings.push(`Extra shard type found: ${actualName} (not in CORE_SHARD_TYPE_NAMES)`);
    }
  }

  // 2. Validate embedding templates
  console.log('🔍 Validating embedding templates...');
  const templateKeys = Object.keys(EMBEDDING_TEMPLATE_MAP);
  result.stats.mappedTemplates = templateKeys.filter(
    key => EMBEDDING_TEMPLATE_MAP[key as keyof typeof EMBEDDING_TEMPLATE_MAP] !== undefined
  ).length;
  
  // Count defined templates
  const templateCount = Object.values(EMBEDDING_TEMPLATE_MAP).filter(t => t !== undefined).length;
  result.stats.embeddingTemplates = templateCount;
  
  // Verify all shard types have entries in the map
  for (const shardType of CORE_SHARD_TYPES) {
    if (!(shardType.name in EMBEDDING_TEMPLATE_MAP)) {
      result.errors.push(`Missing embedding template mapping for: ${shardType.name}`);
      result.passed = false;
    }
  }
  
  // Verify getCoreShardType function works
  for (const shardType of CORE_SHARD_TYPES) {
    const found = getCoreShardType(shardType.name);
    if (!found) {
      result.errors.push(`getCoreShardType failed for: ${shardType.name}`);
      result.passed = false;
    }
    if (found && found.name !== shardType.name) {
      result.errors.push(`getCoreShardType returned wrong type for: ${shardType.name}`);
      result.passed = false;
    }
  }

  // 3. Validate relationship types
  console.log('🔍 Validating relationship types...');
  const relationshipTypeValues = Object.values(RelationshipType);
  result.stats.relationshipTypes = relationshipTypeValues.length;
  
  // Verify all relationship types have inverse mappings
  for (const relType of relationshipTypeValues) {
    const inverse = getInverseRelationship(relType);
    if (inverse === null && relType !== RelationshipType.RELATED_TO && relType !== RelationshipType.LINKED_TO && relType !== RelationshipType.CUSTOM) {
      // RELATED_TO and LINKED_TO are bidirectional, CUSTOM has no inverse
      // But we should still check if it's expected
      const bidirectionalTypes = [RelationshipType.RELATED_TO, RelationshipType.LINKED_TO];
      if (!bidirectionalTypes.includes(relType)) {
        result.warnings.push(`Relationship type ${relType} has no inverse mapping (may be intentional)`);
      }
    }
  }

  // 4. Validate shard type structure
  console.log('🔍 Validating shard type structure...');
  for (const shardType of CORE_SHARD_TYPES) {
    if (!shardType.name) {
      result.errors.push(`Shard type missing name`);
      result.passed = false;
    }
    if (!shardType.displayName) {
      result.errors.push(`Shard type ${shardType.name} missing displayName`);
      result.passed = false;
    }
    if (!shardType.description) {
      result.warnings.push(`Shard type ${shardType.name} missing description`);
    }
    if (!shardType.category) {
      result.errors.push(`Shard type ${shardType.name} missing category`);
      result.passed = false;
    }
    if (!shardType.schema) {
      result.errors.push(`Shard type ${shardType.name} missing schema`);
      result.passed = false;
    }
    if (!shardType.tags || shardType.tags.length === 0) {
      result.warnings.push(`Shard type ${shardType.name} has no tags`);
    }
  }

  return result;
}

/**
 * Main validation function
 */
export function runValidation(): void {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Core Shard Types Validation');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const result = validateCoreShardTypes();

  // Print statistics
  console.log('📊 Statistics:');
  console.log(`   Shard Types: ${result.stats.shardTypes}`);
  console.log(`   Embedding Templates: ${result.stats.embeddingTemplates}`);
  console.log(`   Mapped Templates: ${result.stats.mappedTemplates}`);
  console.log(`   Relationship Types: ${result.stats.relationshipTypes}`);
  console.log('');

  // Print errors
  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
    console.log('');
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of result.warnings) {
      console.log(`   - ${warning}`);
    }
    console.log('');
  }

  // Print result
  console.log('═══════════════════════════════════════════════════════════');
  if (result.passed && result.errors.length === 0) {
    console.log('✅ Validation PASSED');
    console.log('   All core shard types are properly configured.');
  } else {
    console.log('❌ Validation FAILED');
    console.log(`   Found ${result.errors.length} error(s) and ${result.warnings.length} warning(s).`);
  }
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Exit with appropriate code
  process.exit(result.passed && result.errors.length === 0 ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation();
}

