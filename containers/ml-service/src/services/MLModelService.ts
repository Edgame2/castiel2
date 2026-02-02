/**
 * ML Model Service
 * Handles ML model management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  MLModel,
  ModelCard,
  CreateMLModelInput,
  UpdateMLModelInput,
  ModelStatus,
  ModelType,
} from '../types/ml.types';

export class MLModelService {
  private containerName = 'ml_models';

  /**
   * Create ML model
   */
  async create(input: CreateMLModelInput): Promise<MLModel> {
    if (!input.tenantId || !input.name || !input.type) {
      throw new BadRequestError('tenantId, name, and type are required');
    }

    if (!input.features || input.features.length === 0) {
      throw new BadRequestError('At least one feature is required');
    }

    const model: MLModel = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      version: 1,
      status: ModelStatus.DRAFT,
      algorithm: input.algorithm,
      features: input.features,
      hyperparameters: input.hyperparameters || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(model, {
        partitionKey: input.tenantId,
      } as Parameters<typeof container.items.create>[1]);

      if (!resource) {
        throw new Error('Failed to create ML model');
      }

      return resource as MLModel;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('ML model with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get model card (Plan §11.9, §946): purpose, input, output, limitations for GET /api/v1/ml/models/:id/card
   */
  async getModelCard(modelId: string, tenantId: string): Promise<ModelCard> {
    const model = await this.getById(modelId, tenantId);
    const purpose = model.description || `Model for ${model.type}`;
    const input = model.features ?? [];
    const outputByType: Record<ModelType, string> = {
      [ModelType.CLASSIFICATION]: 'Class label or probability (0-1)',
      [ModelType.REGRESSION]: 'Numeric value',
      [ModelType.CLUSTERING]: 'Cluster assignment',
      [ModelType.RECOMMENDATION]: 'Ranked recommendations',
      [ModelType.FORECASTING]: 'Forecast values (point and/or quantiles)',
      [ModelType.ANOMALY_DETECTION]: 'Anomaly score (0-1) or binary',
      [ModelType.RISK_SCORING]: 'Risk score (0-1)',
      [ModelType.WIN_PROBABILITY]: 'Win probability (0-1)',
    };
    const output = outputByType[model.type] || 'See model type and metrics';
    const limitations = model.limitations ?? [];
    return {
      modelId: model.id,
      name: model.name,
      type: model.type,
      version: model.version,
      purpose,
      input,
      output,
      limitations,
    };
  }

  /**
   * Get model by ID
   */
  async getById(modelId: string, tenantId: string): Promise<MLModel> {
    if (!modelId || !tenantId) {
      throw new BadRequestError('modelId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(modelId, tenantId).read<MLModel>();

      if (!resource) {
        throw new NotFoundError('ML model', modelId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('ML model', modelId);
      }
      throw error;
    }
  }

  /**
   * Update model
   */
  async update(
    modelId: string,
    tenantId: string,
    input: UpdateMLModelInput
  ): Promise<MLModel> {
    const existing = await this.getById(modelId, tenantId);

    const updated: MLModel = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(modelId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update ML model');
      }

      return resource as MLModel;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('ML model', modelId);
      }
      throw error;
    }
  }

  /**
   * Deploy model
   */
  async deploy(modelId: string, tenantId: string): Promise<MLModel> {
    const model = await this.getById(modelId, tenantId);

    if (model.status !== ModelStatus.READY) {
      throw new BadRequestError('Model must be in READY status to deploy');
    }

    if (!model.modelPath) {
      throw new BadRequestError('Model path is required for deployment');
    }

    return this.update(modelId, tenantId, {
      status: ModelStatus.DEPLOYED,
      deployedAt: new Date(),
    });
  }

  /**
   * Delete model
   */
  async delete(modelId: string, tenantId: string): Promise<void> {
    await this.getById(modelId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(modelId, tenantId).delete();
  }

  /**
   * List models
   */
  async list(
    tenantId: string,
    filters?: {
      type?: ModelType;
      status?: ModelStatus;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: MLModel[]; continuationToken?: string }> {
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

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<MLModel>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list ML models: ${error.message}`);
    }
  }
}

