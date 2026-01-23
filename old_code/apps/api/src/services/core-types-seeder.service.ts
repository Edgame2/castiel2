import { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardTypeRepository,
  ShardRepository,
} from '@castiel/api-core';
import { ShardTypeStatus, CreateShardTypeInput } from '../types/shard-type.types.js';
import {
  CORE_SHARD_TYPES,
  CoreShardTypeDefinition,
  CORE_SHARD_TYPE_NAMES,
  EMBEDDING_TEMPLATE_MAP,
} from '../types/core-shard-types.js';
import { v4 as uuidv4 } from 'uuid';
import {
  SYSTEM_TEMPLATES,
  ContextTemplateStructuredData,
} from '../types/context-template.types.js';
import { CreateShardInput, ShardStatus, ShardSource, PermissionLevel } from '../types/shard.types.js';

// System tenant ID for global types
const SYSTEM_TENANT_ID = 'system';
const SYSTEM_USER_ID = 'system';

/**
 * Core Types Seeder Service
 * Seeds system ShardTypes and templates on application startup
 */
export class CoreTypesSeederService {
  private shardTypeRepository: ShardTypeRepository;
  private shardRepository: ShardRepository;
  private monitoring: IMonitoringProvider;

  constructor(
    monitoring: IMonitoringProvider,
    shardTypeRepository: ShardTypeRepository,
    shardRepository: ShardRepository
  ) {
    this.monitoring = monitoring;
    this.shardTypeRepository = shardTypeRepository;
    this.shardRepository = shardRepository;
  }

  /**
   * Seed all core types
   */
  async seedAll(): Promise<{
    shardTypes: { seeded: number; skipped: number; errors: number };
    templates: { seeded: number; skipped: number; errors: number };
  }> {
    const shardTypeResults = await this.seedCoreShardTypes();
    const templateResults = await this.seedSystemTemplates();

    this.monitoring.trackEvent('coreTypes.seeded', {
      shardTypesSeeded: shardTypeResults.seeded,
      shardTypesSkipped: shardTypeResults.skipped,
      templatesSeeded: templateResults.seeded,
      templatesSkipped: templateResults.skipped,
    });

    return {
      shardTypes: shardTypeResults,
      templates: templateResults,
    };
  }

  /**
   * Seed core ShardTypes
   */
  async seedCoreShardTypes(): Promise<{
    seeded: number;
    skipped: number;
    errors: number;
    details: Array<{ name: string; status: 'seeded' | 'skipped' | 'error'; error?: string }>;
  }> {
    const results = {
      seeded: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{ name: string; status: 'seeded' | 'skipped' | 'error'; error?: string }>,
    };

    for (const typeDef of CORE_SHARD_TYPES) {
      try {
        // Check if already exists
        const existing = await this.shardTypeRepository.findByName(typeDef.name, SYSTEM_TENANT_ID);

        // Get embedding template if available
        const embeddingTemplateData = EMBEDDING_TEMPLATE_MAP[typeDef.name];
        let embeddingTemplate = undefined;
        
        if (embeddingTemplateData) {
          // Add required fields (id, createdAt, createdBy, updatedAt) to embedding template
          embeddingTemplate = {
            ...embeddingTemplateData,
            id: uuidv4(),
            createdAt: new Date(),
            createdBy: SYSTEM_USER_ID,
            updatedAt: new Date(),
          };
        }

        if (existing) {
          // Check if existing type needs embedding template update
          if (embeddingTemplate && !existing.embeddingTemplate) {
            // Update existing type with embedding template
            await this.shardTypeRepository.update(existing.id, SYSTEM_TENANT_ID, {
              embeddingTemplate,
            });
            results.seeded++;
            results.details.push({ name: typeDef.name, status: 'seeded' });
            
            this.monitoring.trackEvent('coreTypes.shardType.updated', {
              name: typeDef.name,
              reason: 'added-embedding-template',
            });
          } else {
            results.skipped++;
            results.details.push({ name: typeDef.name, status: 'skipped' });
          }
          continue;
        }

        // Create the ShardType
        const input: CreateShardTypeInput = {
          tenantId: SYSTEM_TENANT_ID,
          name: typeDef.name,
          displayName: typeDef.displayName,
          description: typeDef.description,
          category: typeDef.category,
          schema: typeDef.schema,
          schemaFormat: 'rich',
          isCustom: false,
          isGlobal: true,
          icon: typeDef.icon,
          color: typeDef.color,
          tags: typeDef.tags,
          embeddingTemplate,
          createdBy: SYSTEM_USER_ID,
        };

        await this.shardTypeRepository.create(input);

        results.seeded++;
        results.details.push({ name: typeDef.name, status: 'seeded' });

        this.monitoring.trackEvent('coreTypes.shardType.seeded', {
          name: typeDef.name,
        });
      } catch (error: unknown) {
        results.errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.details.push({ name: typeDef.name, status: 'error', error: errorMessage });

        this.monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          {
            operation: 'coreTypes.seedShardType',
            shardTypeName: typeDef.name,
          }
        );
      }
    }

    return results;
  }

  /**
   * Seed system context templates
   */
  async seedSystemTemplates(): Promise<{
    seeded: number;
    skipped: number;
    errors: number;
    details: Array<{ name: string; status: 'seeded' | 'skipped' | 'error'; error?: string }>;
  }> {
    const results = {
      seeded: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{ name: string; status: 'seeded' | 'skipped' | 'error'; error?: string }>,
    };

    // First, ensure c_contextTemplate ShardType exists
    let contextTemplateType = await this.shardTypeRepository.findByName(
      CORE_SHARD_TYPE_NAMES.CONTEXT_TEMPLATE,
      SYSTEM_TENANT_ID
    );

    if (!contextTemplateType) {
      // Create the c_contextTemplate ShardType first
      try {
        contextTemplateType = await this.createContextTemplateShardType();
      } catch (error: unknown) {
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'coreTypes.createContextTemplateShardType',
          }
        );
        return results;
      }
    }

    // Seed each system template
    // Note: SYSTEM_TEMPLATES is currently just an enum of IDs, not template definitions
    // Template seeding is disabled until template definitions are provided
    this.monitoring.trackEvent('core-types-seeder.template-seeding-skipped', {
      reason: 'no-template-definitions-available',
    });

    return results;
  }

  /**
   * Create the c_contextTemplate ShardType
   */
  private async createContextTemplateShardType() {
    const input: CreateShardTypeInput = {
      tenantId: SYSTEM_TENANT_ID,
      name: CORE_SHARD_TYPE_NAMES.CONTEXT_TEMPLATE,
      displayName: 'Context Template',
      description: 'AI context assembly template for defining what data to include in AI conversations',
      category: 'configuration' as any,
      schema: {
        format: 'rich',
        fields: [
          { name: 'name', label: 'Template Name', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'applicableShardTypes', label: 'Applicable Types', type: 'multiselect', required: true },
          { name: 'includeSelf', label: 'Include Self', type: 'boolean', required: true },
          { name: 'selfFields', label: 'Self Fields', type: 'multiselect' },
          { name: 'relationships', label: 'Relationships (JSON)', type: 'textarea', required: true },
          {
            name: 'format', label: 'Output Format', type: 'select', required: true, config: {
              options: [
                { value: 'prose', label: 'Prose' },
                { value: 'structured', label: 'Structured' },
                { value: 'minimal', label: 'Minimal' },
                { value: 'json', label: 'JSON' },
              ],
            }
          },
          { name: 'maxTokens', label: 'Max Tokens', type: 'integer', required: true, config: { min: 500, max: 128000 } },
          { name: 'fieldSelection', label: 'Field Selection (JSON)', type: 'textarea' },
          { name: 'cacheTTLSeconds', label: 'Cache TTL (seconds)', type: 'integer', config: { min: 0, max: 86400 } },
          {
            name: 'category', label: 'Category', type: 'select', config: {
              options: [
                { value: 'general', label: 'General' },
                { value: 'sales', label: 'Sales' },
                { value: 'support', label: 'Support' },
                { value: 'technical', label: 'Technical' },
                { value: 'legal', label: 'Legal' },
                { value: 'financial', label: 'Financial' },
                { value: 'custom', label: 'Custom' },
              ],
            }
          },
          { name: 'tags', label: 'Tags', type: 'multiselect', config: { allowCustom: true } },
          { name: 'isSystemTemplate', label: 'System Template', type: 'boolean', required: true },
        ],
      } as any,
      schemaFormat: 'rich',
      isCustom: false,
      isGlobal: true,
      icon: 'file-text',
      color: '#9333ea',
      tags: ['ai', 'context', 'template'],
      createdBy: SYSTEM_USER_ID,
    };

    return this.shardTypeRepository.create(input);
  }

  /**
   * Seed core types for a specific tenant (copies system types)
   */
  async seedForTenant(tenantId: string): Promise<{
    seeded: number;
    skipped: number;
    errors: number;
  }> {
    const results = { seeded: 0, skipped: 0, errors: 0 };

    // Get all system ShardTypes
    const systemTypes = await this.shardTypeRepository.list({
      filter: {
        tenantId: SYSTEM_TENANT_ID,
        isGlobal: true,
        status: ShardTypeStatus.ACTIVE,
      },
      limit: 100,
    });

    for (const systemType of systemTypes.shardTypes) {
      try {
        // Check if tenant already has this type
        const existing = await this.shardTypeRepository.findByName(systemType.name, tenantId);
        if (existing) {
          results.skipped++;
          continue;
        }

        // Clone for tenant (include embedding template if present)
        const input: CreateShardTypeInput = {
          tenantId,
          name: systemType.name,
          displayName: systemType.displayName,
          description: systemType.description,
          category: systemType.category,
          schema: systemType.schema,
          schemaFormat: systemType.schemaFormat,
          isCustom: false,
          isGlobal: false,
          icon: systemType.icon,
          color: systemType.color,
          tags: systemType.tags,
          embeddingTemplate: systemType.embeddingTemplate, // Include embedding template when cloning
          createdBy: SYSTEM_USER_ID,
        };

        await this.shardTypeRepository.create(input);
        results.seeded++;
      } catch (error) {
        results.errors++;
      }
    }

    return results;
  }

  /**
   * Check if core types are seeded
   */
  async checkSeeded(): Promise<{
    allSeeded: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];

    for (const typeDef of CORE_SHARD_TYPES) {
      const existing = await this.shardTypeRepository.findByName(typeDef.name, SYSTEM_TENANT_ID);
      if (!existing) {
        missing.push(typeDef.name);
      }
    }

    return {
      allSeeded: missing.length === 0,
      missing,
    };
  }
}








