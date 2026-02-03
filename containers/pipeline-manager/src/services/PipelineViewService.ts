/**
 * Pipeline View Service
 * Handles pipeline view management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  PipelineView,
  CreatePipelineViewInput,
  UpdatePipelineViewInput,
} from '../types/pipeline.types';

export class PipelineViewService {
  private containerName = 'pipeline_views';

  /**
   * Create a new pipeline view
   */
  async create(input: CreatePipelineViewInput): Promise<PipelineView> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.name) {
      throw new BadRequestError('name is required');
    }
    if (!input.stages || input.stages.length === 0) {
      throw new BadRequestError('stages are required');
    }

    // If this is set as default, unset other defaults
    if (input.isDefault) {
      await this.unsetDefaultViews(input.tenantId);
    }

    const view: PipelineView = {
      id: uuidv4(),
      tenantId: input.tenantId,
      userId: input.userId,
      name: input.name,
      description: input.description,
      stages: input.stages,
      filters: input.filters,
      isDefault: input.isDefault || false,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await (container.items as any).create(view, {
        partitionKey: input.tenantId,
      } as any);

      if (!resource) {
        throw new Error('Failed to create pipeline view');
      }

      return resource as PipelineView;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Pipeline view with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Get pipeline view by ID
   */
  async getById(viewId: string, tenantId: string): Promise<PipelineView> {
    if (!viewId || !tenantId) {
      throw new BadRequestError('viewId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(viewId, tenantId).read<PipelineView>();

      if (!resource) {
        throw new NotFoundError('Pipeline view', viewId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Pipeline view', viewId);
      }
      throw error;
    }
  }

  /**
   * Update pipeline view
   */
  async update(
    viewId: string,
    tenantId: string,
    input: UpdatePipelineViewInput
  ): Promise<PipelineView> {
    const existing = await this.getById(viewId, tenantId);

    if (existing.isSystem) {
      throw new BadRequestError('Cannot update system pipeline view');
    }

    // If setting as default, unset other defaults
    if (input.isDefault && !existing.isDefault) {
      await this.unsetDefaultViews(tenantId);
    }

    const updated: PipelineView = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(viewId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update pipeline view');
      }

      return resource as PipelineView;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Pipeline view', viewId);
      }
      throw error;
    }
  }

  /**
   * Delete pipeline view
   */
  async delete(viewId: string, tenantId: string): Promise<void> {
    const existing = await this.getById(viewId, tenantId);

    if (existing.isSystem) {
      throw new BadRequestError('Cannot delete system pipeline view');
    }

    const container = getContainer(this.containerName);
    await container.item(viewId, tenantId).delete();
  }

  /**
   * List pipeline views
   */
  async list(tenantId: string, filters?: { isDefault?: boolean; limit?: number }): Promise<PipelineView[]> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.isDefault !== undefined) {
      query += ' AND c.isDefault = @isDefault';
      parameters.push({ name: '@isDefault', value: filters.isDefault });
    }

    query += ' ORDER BY c.isDefault DESC, c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources } = await container.items
        .query<PipelineView>({
          query,
          parameters,
        })
        .fetchNext();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to list pipeline views: ${error.message}`);
    }
  }

  /**
   * Unset default views (helper method)
   */
  private async unsetDefaultViews(tenantId: string): Promise<void> {
    const container = getContainer(this.containerName);
    const { resources } = await container.items
      .query<PipelineView>({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.isDefault = true',
        parameters: [{ name: '@tenantId', value: tenantId }],
      })
      .fetchAll();

    for (const view of resources) {
      const updated: PipelineView = {
        ...view,
        isDefault: false,
        updatedAt: new Date(),
      };
      await container.item(view.id, tenantId).replace(updated);
    }
  }
}

