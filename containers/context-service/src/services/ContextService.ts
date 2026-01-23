/**
 * Context Service
 * Handles context CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Context,
  CreateContextInput,
  UpdateContextInput,
  ContextType,
  ContextScope,
} from '../types/context.types';

export class ContextService {
  private containerName = 'context_contexts';

  /**
   * Create context
   */
  async create(input: CreateContextInput): Promise<Context> {
    if (!input.tenantId || !input.type || !input.path || !input.name) {
      throw new BadRequestError('tenantId, type, path, and name are required');
    }

    const context: Context = {
      id: uuidv4(),
      tenantId: input.tenantId,
      type: input.type,
      scope: input.scope,
      path: input.path,
      name: input.name,
      content: input.content,
      metadata: input.metadata,
      ast: input.ast,
      dependencies: input.dependencies || [],
      dependents: input.dependents || [],
      callers: input.callers || [],
      callees: input.callees || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Calculate token count if content is provided
    if (input.content) {
      context.tokenCount = this.estimateTokenCount(input.content);
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(context, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create context');
      }

      return resource as Context;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Context with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get context by ID
   */
  async getById(contextId: string, tenantId: string): Promise<Context> {
    if (!contextId || !tenantId) {
      throw new BadRequestError('contextId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(contextId, tenantId).read<Context>();

      if (!resource) {
        throw new NotFoundError(`Context ${contextId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Context ${contextId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get context by path
   */
  async getByPath(path: string, tenantId: string): Promise<Context | undefined> {
    if (!path || !tenantId) {
      throw new BadRequestError('path and tenantId are required');
    }

    const container = getContainer(this.containerName);
    const { resources } = await container.items
      .query<Context>({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.path = @path',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@path', value: path },
        ],
      })
      .fetchAll();

    return resources[0];
  }

  /**
   * Update context
   */
  async update(
    contextId: string,
    tenantId: string,
    input: UpdateContextInput
  ): Promise<Context> {
    const existing = await this.getById(contextId, tenantId);

    const updated: Context = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    // Recalculate token count if content changed
    if (input.content !== undefined) {
      updated.tokenCount = this.estimateTokenCount(input.content);
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(contextId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update context');
      }

      return resource as Context;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Context ${contextId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete context
   */
  async delete(contextId: string, tenantId: string): Promise<void> {
    await this.getById(contextId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(contextId, tenantId).delete();
  }

  /**
   * List contexts
   */
  async list(
    tenantId: string,
    filters?: {
      type?: ContextType;
      scope?: ContextScope;
      path?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Context[]; continuationToken?: string }> {
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

    if (filters?.scope) {
      query += ' AND c.scope = @scope';
      parameters.push({ name: '@scope', value: filters.scope });
    }

    if (filters?.path) {
      query += ' AND c.path = @path';
      parameters.push({ name: '@path', value: filters.path });
    }

    query += ' ORDER BY c.updatedAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Context>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list contexts: ${error.message}`);
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

