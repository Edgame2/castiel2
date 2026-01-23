/**
 * Content Template Service
 * Handles content template management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  ContentTemplate,
  CreateContentTemplateInput,
  UpdateContentTemplateInput,
} from '../types/content.types';

export class ContentTemplateService {
  private containerName = 'content_templates';

  /**
   * Create a new content template
   */
  async create(input: CreateContentTemplateInput): Promise<ContentTemplate> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.name) {
      throw new BadRequestError('name is required');
    }
    if (!input.templateContent) {
      throw new BadRequestError('templateContent is required');
    }

    const template: ContentTemplate = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      category: input.category,
      documentType: input.documentType,
      tags: input.tags || [],
      templateContent: input.templateContent,
      defaultTheme: input.defaultTheme,
      requiredFields: input.requiredFields || [],
      aiConfig: input.aiConfig,
      isSystemTemplate: input.isSystemTemplate || false,
      isActive: true,
      version: '1.0.0',
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
        throw new Error('Failed to create content template');
      }

      return resource as ContentTemplate;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Content template with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getById(templateId: string, tenantId: string): Promise<ContentTemplate> {
    if (!templateId || !tenantId) {
      throw new BadRequestError('templateId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(templateId, tenantId).read<ContentTemplate>();

      if (!resource) {
        throw new NotFoundError(`Content template ${templateId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Content template ${templateId} not found`);
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
    input: UpdateContentTemplateInput
  ): Promise<ContentTemplate> {
    const existing = await this.getById(templateId, tenantId);

    if (existing.isSystemTemplate) {
      throw new BadRequestError('Cannot update system template');
    }

    // Increment version if content changed
    let version = existing.version;
    if (input.templateContent && input.templateContent !== existing.templateContent) {
      const [major, minor, patch] = version.split('.').map(Number);
      version = `${major}.${minor + 1}.${patch}`;
    }

    const updated: ContentTemplate = {
      ...existing,
      ...input,
      version,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(templateId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update content template');
      }

      return resource as ContentTemplate;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Content template ${templateId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete template
   */
  async delete(templateId: string, tenantId: string): Promise<void> {
    const existing = await this.getById(templateId, tenantId);

    if (existing.isSystemTemplate) {
      throw new BadRequestError('Cannot delete system template');
    }

    const container = getContainer(this.containerName);
    await container.item(templateId, tenantId).delete();
  }

  /**
   * List templates
   */
  async list(
    tenantId: string,
    filters?: {
      category?: string;
      documentType?: string;
      isActive?: boolean;
      limit?: number;
    }
  ): Promise<ContentTemplate[]> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    if (filters?.documentType) {
      query += ' AND c.documentType = @documentType';
      parameters.push({ name: '@documentType', value: filters.documentType });
    }

    if (filters?.isActive !== undefined) {
      query += ' AND c.isActive = @isActive';
      parameters.push({ name: '@isActive', value: filters.isActive });
    } else {
      query += ' AND c.isActive = true';
    }

    query += ' ORDER BY c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources } = await container.items
        .query<ContentTemplate>({
          query,
          parameters,
        })
        .fetchNext();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to list content templates: ${error.message}`);
    }
  }
}

