/**
 * Optimization Service
 * Handles optimization CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  PerformanceOptimization,
  CreateOptimizationInput,
  UpdateOptimizationInput,
  OptimizationType,
  OptimizationStatus,
  OptimizationPriority,
} from '../types/optimization.types';

export class OptimizationService {
  private containerName = 'performance_optimizations';

  /**
   * Create optimization
   */
  async create(input: CreateOptimizationInput): Promise<PerformanceOptimization> {
    if (!input.tenantId || !input.type || !input.target) {
      throw new BadRequestError('tenantId, type, and target are required');
    }

    const optimization: PerformanceOptimization = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: OptimizationStatus.PENDING,
      target: input.target,
      baseline: {
        metrics: {},
        measuredAt: new Date(),
      },
      priority: input.priority || OptimizationPriority.MEDIUM,
      createdAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(optimization, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create performance optimization');
      }

      return resource as PerformanceOptimization;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Performance optimization with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get optimization by ID
   */
  async getById(optimizationId: string, tenantId: string): Promise<PerformanceOptimization> {
    if (!optimizationId || !tenantId) {
      throw new BadRequestError('optimizationId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(optimizationId, tenantId).read<PerformanceOptimization>();

      if (!resource) {
        throw new NotFoundError(`Performance optimization ${optimizationId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Performance optimization ${optimizationId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update optimization
   */
  async update(
    optimizationId: string,
    tenantId: string,
    input: UpdateOptimizationInput
  ): Promise<PerformanceOptimization> {
    const existing = await this.getById(optimizationId, tenantId);

    const updated: PerformanceOptimization = {
      ...existing,
      ...input,
      optimized: input.optimized || existing.optimized,
      recommendations: input.recommendations || existing.recommendations,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(optimizationId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update performance optimization');
      }

      return resource as PerformanceOptimization;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Performance optimization ${optimizationId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete optimization
   */
  async delete(optimizationId: string, tenantId: string): Promise<void> {
    const optimization = await this.getById(optimizationId, tenantId);

    // Don't allow deletion of running optimizations
    if (optimization.status === OptimizationStatus.OPTIMIZING || optimization.status === OptimizationStatus.ANALYZING) {
      throw new BadRequestError('Cannot delete an optimization that is currently running');
    }

    const container = getContainer(this.containerName);
    await container.item(optimizationId, tenantId).delete();
  }

  /**
   * List optimizations
   */
  async list(
    tenantId: string,
    filters?: {
      type?: OptimizationType;
      status?: OptimizationStatus;
      priority?: OptimizationPriority;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: PerformanceOptimization[]; continuationToken?: string }> {
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

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.priority) {
      query += ' AND c.priority = @priority';
      parameters.push({ name: '@priority', value: filters.priority });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<PerformanceOptimization>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list performance optimizations: ${error.message}`);
    }
  }
}

