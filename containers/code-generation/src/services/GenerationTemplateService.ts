/**
 * Generation Template Service
 * Handles generation template CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  GenerationTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  GenerationType,
} from '../types/generation.types';

export class GenerationTemplateService {
  private containerName = 'codegen_templates';

  /**
   * Create template
   */
  async create(input: CreateTemplateInput): Promise<GenerationTemplate> {
    if (!input.tenantId || !input.name || !input.type || !input.template) {
      throw new BadRequestError('tenantId, name, type, and template are required');
    }

    const template: GenerationTemplate = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      template: input.template,
      examples: input.examples,
      metadata: {
        ...input.metadata,
        version: input.metadata?.version || '1.0.0',
      },
      enabled: input.enabled !== false, // Default to true
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(template, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create generation template');
      }

      return resource as GenerationTemplate;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Generation template with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getById(templateId: string, tenantId: string): Promise<GenerationTemplate> {
    if (!templateId || !tenantId) {
      throw new BadRequestError('templateId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(templateId, tenantId).read<GenerationTemplate>();

      if (!resource) {
        throw new NotFoundError(`Generation template ${templateId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Generation template ${templateId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update template
   */
  async update(
    templateId: string,
    tenantId: string,
    input: UpdateTemplateInput
  ): Promise<GenerationTemplate> {
    const existing = await this.getById(templateId, tenantId);

    const updated: GenerationTemplate = {
      ...existing,
      ...input,
      template: input.template
        ? { ...existing.template, ...input.template }
        : existing.template,
      examples: input.examples || existing.examples,
      metadata: {
        ...existing.metadata,
        ...input.metadata,
      },
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(templateId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update generation template');
      }

      return resource as GenerationTemplate;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Generation template ${templateId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete template
   */
  async delete(templateId: string, tenantId: string): Promise<void> {
    await this.getById(templateId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(templateId, tenantId).delete();
  }

  /**
   * List templates
   */
  async list(
    tenantId: string,
    filters?: {
      type?: GenerationType;
      enabled?: boolean;
      language?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: GenerationTemplate[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    if (filters?.enabled !== undefined) {
      query += ' AND c.enabled = @enabled';
      parameters.push({ name: '@enabled', value: filters.enabled });
    }

    if (filters?.language) {
      query += ' AND c.metadata.language = @language';
      parameters.push({ name: '@language', value: filters.language });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<GenerationTemplate>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list generation templates: ${error.message}`);
    }
  }
}

