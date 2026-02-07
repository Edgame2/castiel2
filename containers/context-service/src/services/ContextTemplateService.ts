/**
 * Context Template Service
 * Handles template selection and management for context assembly
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '@coder/shared/utils/logger';
import {
  TemplateSelectionOptions,
  ContextTemplateStructuredData,
  TemplateCategory,
  SYSTEM_TEMPLATES,
} from '../types/context-template.types';

const CONTEXT_TEMPLATE_TYPE_NAME = 'c_contextTemplate';

export class ContextTemplateService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'context-service',
      serviceName: 'context-service',
      tenantId,
    });
  }

  /**
   * Select the appropriate template using hierarchy
   */
  async selectTemplate(
    tenantId: string,
    options: TemplateSelectionOptions
  ): Promise<any | null> {
    try {
      // 1. User-specified template
      if (options.preferredTemplateId) {
        const template = await this.getTemplateById(options.preferredTemplateId, tenantId);
        if (template) {
          return template;
        }
      }

      // 2. Assistant's linked template
      if (options.assistantId) {
        const assistantTemplates = await this.getAssistantTemplates(
          options.assistantId,
          tenantId
        );
        if (assistantTemplates.length > 0) {
          return assistantTemplates[0];
        }
      }

      // 3. Intent + scope-based template selection
      if (options.insightType && options.shardTypeName) {
        const intentBasedTemplate = await this.selectTemplateByIntent(
          tenantId,
          options.insightType,
          options.shardTypeName,
          options.scopeMode,
          options.query
        );
        if (intentBasedTemplate) {
          return intentBasedTemplate;
        }
      }

      // 4. System template for shard type
      if (options.shardTypeName) {
        return this.getSystemTemplateForType(options.shardTypeName, tenantId);
      }

      return null;
    } catch (error: any) {
      log.error('Failed to select template', error, {
        tenantId,
        options,
        service: 'context-service',
      });
      return null;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string, tenantId: string): Promise<any | null> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${templateId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (response && response.shardTypeId === CONTEXT_TEMPLATE_TYPE_NAME) {
        return response;
      }

      return null;
    } catch (error: any) {
      log.warn('Failed to get template by ID', {
        error: error.message,
        templateId,
        tenantId,
        service: 'context-service',
      });
      return null;
    }
  }

  /**
   * Get templates linked to assistant
   */
  private async getAssistantTemplates(
    assistantId: string,
    tenantId: string
  ): Promise<any[]> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${assistantId}/relationships?relationshipType=template_for`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const relationships = response.relationships || response.data || [];
      return relationships
        .filter((rel: any) => rel.shard?.shardTypeId === CONTEXT_TEMPLATE_TYPE_NAME)
        .map((rel: any) => rel.shard);
    } catch (error: any) {
      log.warn('Failed to get assistant templates', {
        error: error.message,
        assistantId,
        tenantId,
        service: 'context-service',
      });
      return [];
    }
  }

  /**
   * Select template based on intent type and shard type
   */
  private async selectTemplateByIntent(
    tenantId: string,
    insightType: string,
    shardTypeName: string,
    scopeMode?: 'global' | 'project',
    query?: string
  ): Promise<any | null> {
    try {
      // Map insight types to template categories
      const insightToCategory: Record<string, TemplateCategory> = {
        summary: 'summary',
        analysis: 'analysis',
        comparison: 'comparison',
        extraction: 'extraction',
        generation: 'generation',
        chat: 'summary',
        recommendation: 'analysis',
        prediction: 'analysis',
      };

      const targetCategory = insightToCategory[insightType] || 'summary';

      // Get all templates for tenant
      const token = this.getServiceToken(tenantId);
      const response = await this.shardManagerClient.get<any>(
        `/api/v1/shards?shardTypeId=${CONTEXT_TEMPLATE_TYPE_NAME}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const templates = response.shards || response.data || [];

      // Score templates by relevance
      const scoredTemplates: Array<{ template: any; score: number }> = [];

      for (const templateShard of templates) {
        const template = templateShard.structuredData as ContextTemplateStructuredData;

        if (!template.isActive) {
          continue;
        }

        let score = 0;

        // Category match
        if (template.category === targetCategory) {
          score += 10;
        }

        // Shard type match
        if (template.sources?.primary?.shardTypeId === shardTypeName) {
          score += 5;
        }

        // Scope match
        if (scopeMode === 'project' && template.category === 'summary') {
          score += 2;
        }

        // System templates get slight boost
        if (template.scope === 'system') {
          score += 1;
        }

        // Query-based matching
        if (query && template.description) {
          const queryLower = query.toLowerCase();
          const descLower = template.description.toLowerCase();
          const nameLower = template.name.toLowerCase();

          const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 3);
          let queryMatches = 0;
          for (const word of queryWords) {
            if (descLower.includes(word) || nameLower.includes(word)) {
              queryMatches++;
            }
          }
          if (queryMatches > 0) {
            score += queryMatches * 0.5;
          }
        }

        if (score > 0) {
          scoredTemplates.push({ template: templateShard, score });
        }
      }

      // Return highest scoring template
      if (scoredTemplates.length > 0) {
        scoredTemplates.sort((a, b) => b.score - a.score);
        return scoredTemplates[0].template;
      }

      return null;
    } catch (error: any) {
      log.warn('Failed to select template by intent', {
        error: error.message,
        tenantId,
        insightType,
        shardTypeName,
        service: 'context-service',
      });
      return null;
    }
  }

  /**
   * Get system template for shard type
   */
  private async getSystemTemplateForType(
    shardTypeName: string,
    tenantId: string
  ): Promise<any | null> {
    try {
      // Try to get default system template
      const systemTemplateIds = Object.values(SYSTEM_TEMPLATES);
      
      for (const templateId of systemTemplateIds) {
        const template = await this.getTemplateById(templateId, tenantId);
        if (template) {
          const templateData = template.structuredData as ContextTemplateStructuredData;
          if (
            templateData.sources?.primary?.shardTypeId === shardTypeName &&
            templateData.isDefault
          ) {
            return template;
          }
        }
      }

      // Fallback: get any active system template
      const token = this.getServiceToken(tenantId);
      const response = await this.shardManagerClient.get<any>(
        `/api/v1/shards?shardTypeId=${CONTEXT_TEMPLATE_TYPE_NAME}&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const templates = response.shards || response.data || [];
      const systemTemplates = templates.filter(
        (t: any) =>
          (t.structuredData as ContextTemplateStructuredData).scope === 'system' &&
          (t.structuredData as ContextTemplateStructuredData).isActive &&
          (t.structuredData as ContextTemplateStructuredData).sources?.primary?.shardTypeId ===
            shardTypeName
      );

      return systemTemplates.length > 0 ? systemTemplates[0] : null;
    } catch (error: any) {
      log.warn('Failed to get system template', {
        error: error.message,
        shardTypeName,
        tenantId,
        service: 'context-service',
      });
      return null;
    }
  }

  /**
   * List templates
   */
  async listTemplates(
    tenantId: string,
    options: {
      category?: TemplateCategory;
      scope?: 'system' | 'tenant' | 'user';
      search?: string;
      isActive?: boolean;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.shardManagerClient.get<any>(
        `/api/v1/shards?shardTypeId=${CONTEXT_TEMPLATE_TYPE_NAME}&limit=${options.limit || 100}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      let templates = response.shards || response.data || [];

      // Filter by category
      if (options.category) {
        templates = templates.filter(
          (t: any) =>
            (t.structuredData as ContextTemplateStructuredData).category === options.category
        );
      }

      // Filter by scope
      if (options.scope) {
        templates = templates.filter(
          (t: any) =>
            (t.structuredData as ContextTemplateStructuredData).scope === options.scope
        );
      }

      // Filter by active status
      if (options.isActive !== undefined) {
        templates = templates.filter(
          (t: any) =>
            (t.structuredData as ContextTemplateStructuredData).isActive === options.isActive
        );
      }

      // Search filter
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        templates = templates.filter((t: any) => {
          const template = t.structuredData as ContextTemplateStructuredData;
          return (
            template.name.toLowerCase().includes(searchLower) ||
            (template.description || '').toLowerCase().includes(searchLower)
          );
        });
      }

      return templates;
    } catch (error: any) {
      log.error('Failed to list templates', error, {
        tenantId,
        options,
        service: 'context-service',
      });
      return [];
    }
  }
}
