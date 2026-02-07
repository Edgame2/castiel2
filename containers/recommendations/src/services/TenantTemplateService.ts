/**
 * TenantTemplateService - List, create, apply tenant templates (Super Admin §7.2)
 * Stores templates in recommendation_config with partitionKey '_global', id prefix 'tenant_template_'.
 */

import { getContainer } from '@coder/shared';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { TenantTemplate, TenantTemplateFeedbackSnapshot } from '../types/feedback.types';
import { FeedbackService } from './FeedbackService.js';

const GLOBAL_PARTITION = '_global';
const ID_PREFIX = 'tenant_template_';

export class TenantTemplateService {
  private config = loadConfig();
  private configContainerName: string;
  private feedbackService: FeedbackService;

  constructor() {
    this.configContainerName =
      this.config.cosmos_db.containers.recommendation_config ?? 'recommendation_config';
    this.feedbackService = new FeedbackService();
  }

  /**
   * List all tenant templates (global partition).
   */
  async listTemplates(): Promise<TenantTemplate[]> {
    const container = getContainer(this.configContainerName);
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.partitionKey = @pk AND STARTSWITH(c.id, @prefix)',
        parameters: [
          { name: '@pk', value: GLOBAL_PARTITION },
          { name: '@prefix', value: ID_PREFIX },
        ],
      })
      .fetchAll();
    return (resources as TenantTemplate[]).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get a single template by id.
   */
  async getTemplate(templateId: string): Promise<TenantTemplate | null> {
    const container = getContainer(this.configContainerName);
    const id = templateId.startsWith(ID_PREFIX) ? templateId : `${ID_PREFIX}${templateId}`;
    const { resource } = await container.item(id, GLOBAL_PARTITION).read();
    return resource as TenantTemplate | null;
  }

  /**
   * Create a new tenant template.
   */
  async createTemplate(
    input: {
      name: string;
      description?: string;
      feedbackConfig: TenantTemplateFeedbackSnapshot;
      methodology?: string;
      defaultLimits?: { maxUsers?: number; maxOpportunities?: number; maxPredictionsPerDay?: number; maxFeedbackPerDay?: number };
    },
    createdBy: string
  ): Promise<TenantTemplate> {
    const container = getContainer(this.configContainerName);
    const now = new Date().toISOString();
    const id = `${ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const doc: TenantTemplate = {
      id,
      partitionKey: GLOBAL_PARTITION,
      name: input.name,
      description: input.description,
      feedbackConfig: input.feedbackConfig,
      methodology: input.methodology,
      defaultLimits: input.defaultLimits,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };
    await container.items.create(doc, { partitionKey: GLOBAL_PARTITION } as Parameters<typeof container.items.create>[1]);
    log.info('Tenant template created', { service: 'recommendations', templateId: id, createdBy });
    return doc;
  }

  /**
   * Update a tenant template (Super Admin).
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<Pick<TenantTemplate, 'name' | 'description' | 'feedbackConfig' | 'methodology' | 'defaultLimits'>>,
    _updatedBy: string
  ): Promise<TenantTemplate | null> {
    const existing = await this.getTemplate(templateId);
    if (!existing) return null;
    const container = getContainer(this.configContainerName);
    const now = new Date().toISOString();
    const doc: TenantTemplate = {
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description !== undefined ? updates.description : existing.description,
      feedbackConfig: updates.feedbackConfig ?? existing.feedbackConfig,
      methodology: updates.methodology !== undefined ? updates.methodology : existing.methodology,
      defaultLimits: updates.defaultLimits !== undefined ? updates.defaultLimits : existing.defaultLimits,
      updatedAt: now,
    };
    await container.item(existing.id, GLOBAL_PARTITION).replace(doc);
    log.info('Tenant template updated', { service: 'recommendations', templateId: existing.id });
    return doc;
  }

  /**
   * Delete a tenant template (Super Admin).
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    const existing = await this.getTemplate(templateId);
    if (!existing) return false;
    const container = getContainer(this.configContainerName);
    await container.item(existing.id, GLOBAL_PARTITION).delete();
    log.info('Tenant template deleted', { service: 'recommendations', templateId: existing.id });
    return true;
  }

  /**
   * Apply a template to one or more tenants (writes feedback config for each tenant).
   */
  async applyTemplate(templateId: string, tenantIds: string[], appliedBy: string): Promise<{ applied: string[]; failed: { tenantId: string; error: string }[] }> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }
    const applied: string[] = [];
    const failed: { tenantId: string; error: string }[] = [];
    for (const tenantId of tenantIds) {
      try {
        await this.feedbackService.updateTenantFeedbackConfig(tenantId, {
          activeLimit: template.feedbackConfig.activeLimit,
          activeTypes: template.feedbackConfig.activeTypes,
          requireFeedback: template.feedbackConfig.requireFeedback,
          allowComments: template.feedbackConfig.allowComments,
          commentRequired: template.feedbackConfig.commentRequired,
          allowMultipleSelection: template.feedbackConfig.allowMultipleSelection,
          patternDetection: template.feedbackConfig.patternDetection,
        }, appliedBy);
        applied.push(tenantId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push({ tenantId, error: msg });
        log.warn('Apply template failed for tenant', { service: 'recommendations', templateId, tenantId, error: msg });
      }
    }
    if (applied.length > 0) {
      log.info('Template applied to tenants', { service: 'recommendations', templateId, applied, appliedBy });
    }
    return { applied, failed };
  }
}
