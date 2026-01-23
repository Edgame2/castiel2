/**
 * Feature Service
 * Handles feature store management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Feature,
} from '../types/ml.types';

export class FeatureService {
  private containerName = 'ml_features';

  /**
   * Create feature
   */
  async create(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      type: 'numeric' | 'categorical' | 'text' | 'datetime' | 'boolean';
      source?: string;
      transformation?: string;
      statistics?: Feature['statistics'];
    }
  ): Promise<Feature> {
    if (!tenantId || !input.name || !input.type) {
      throw new BadRequestError('tenantId, name, and type are required');
    }

    const feature: Feature = {
      id: uuidv4(),
      tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      source: input.source,
      transformation: input.transformation,
      statistics: input.statistics,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(feature, {
        partitionKey: tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create feature');
      }

      return resource as Feature;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Feature with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get feature by ID
   */
  async getById(featureId: string, tenantId: string): Promise<Feature> {
    if (!featureId || !tenantId) {
      throw new BadRequestError('featureId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(featureId, tenantId).read<Feature>();

      if (!resource) {
        throw new NotFoundError(`Feature ${featureId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Feature ${featureId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update feature
   */
  async update(
    featureId: string,
    tenantId: string,
    input: Partial<Omit<Feature, 'id' | 'tenantId' | 'createdAt' | 'createdBy' | '_rid' | '_self' | '_etag' | '_ts'>>
  ): Promise<Feature> {
    const existing = await this.getById(featureId, tenantId);

    const updated: Feature = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(featureId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update feature');
      }

      return resource as Feature;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Feature ${featureId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete feature
   */
  async delete(featureId: string, tenantId: string): Promise<void> {
    await this.getById(featureId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(featureId, tenantId).delete();
  }

  /**
   * List features
   */
  async list(
    tenantId: string,
    filters?: {
      type?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Feature[]; continuationToken?: string }> {
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

    query += ' ORDER BY c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Feature>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list features: ${error.message}`);
    }
  }
}

