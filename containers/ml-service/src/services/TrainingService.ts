/**
 * Training Service
 * Handles training job management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { MLModelService } from './MLModelService';
import {
  TrainingJob,
  CreateTrainingJobInput,
  TrainingJobStatus,
  ModelType,
  ModelStatus,
} from '../types/ml.types';

export class TrainingService {
  private containerName = 'ml_training_jobs';
  private modelService: MLModelService;

  constructor(modelService: MLModelService) {
    this.modelService = modelService;
  }

  /**
   * Create training job
   */
  async create(input: CreateTrainingJobInput): Promise<TrainingJob> {
    if (!input.tenantId || !input.name || !input.algorithm || !input.features || input.features.length === 0) {
      throw new BadRequestError('tenantId, name, algorithm, and features are required');
    }

    // If modelId is provided, verify it exists
    if (input.modelId) {
      await this.modelService.getById(input.modelId, input.tenantId);
    }

    const job: TrainingJob = {
      id: uuidv4(),
      tenantId: input.tenantId,
      modelId: input.modelId,
      name: input.name,
      description: input.description,
      modelType: input.modelType,
      algorithm: input.algorithm,
      features: input.features,
      hyperparameters: input.hyperparameters,
      trainingDataPath: input.trainingDataPath,
      validationDataPath: input.validationDataPath,
      status: TrainingJobStatus.PENDING,
      progress: 0,
      createdAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(job, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create training job');
      }

      // Update model status if modelId is provided
      if (input.modelId) {
        await this.modelService.update(input.modelId, input.tenantId, {
          status: ModelStatus.TRAINING,
          trainingJobId: resource.id,
        });
      }

      return resource as TrainingJob;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Training job with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get training job by ID
   */
  async getById(jobId: string, tenantId: string): Promise<TrainingJob> {
    if (!jobId || !tenantId) {
      throw new BadRequestError('jobId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(jobId, tenantId).read<TrainingJob>();

      if (!resource) {
        throw new NotFoundError(`Training job ${jobId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Training job ${jobId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update training job status
   */
  async updateStatus(
    jobId: string,
    tenantId: string,
    input: {
      status: TrainingJobStatus;
      progress?: number;
      metrics?: TrainingJob['metrics'];
      error?: string;
    }
  ): Promise<TrainingJob> {
    const existing = await this.getById(jobId, tenantId);

    const updated: TrainingJob = {
      ...existing,
      ...input,
      startedAt: input.status === TrainingJobStatus.RUNNING && !existing.startedAt ? new Date() : existing.startedAt,
      completedAt: (input.status === TrainingJobStatus.COMPLETED || input.status === TrainingJobStatus.FAILED) && !existing.completedAt
        ? new Date()
        : existing.completedAt,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(jobId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update training job');
      }

      // Update model status if job completed
      if (existing.modelId) {
        if (input.status === TrainingJobStatus.COMPLETED) {
          await this.modelService.update(existing.modelId, tenantId, {
            status: ModelStatus.EVALUATING,
            metrics: input.metrics,
          });
        } else if (input.status === TrainingJobStatus.FAILED) {
          await this.modelService.update(existing.modelId, tenantId, {
            status: ModelStatus.FAILED,
          });
        }
      }

      return resource as TrainingJob;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Training job ${jobId} not found`);
      }
      throw error;
    }
  }

  /**
   * Cancel training job
   */
  async cancel(jobId: string, tenantId: string): Promise<TrainingJob> {
    return this.updateStatus(jobId, tenantId, {
      status: TrainingJobStatus.CANCELLED,
    });
  }

  /**
   * List training jobs
   */
  async list(
    tenantId: string,
    filters?: {
      modelId?: string;
      status?: TrainingJobStatus;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: TrainingJob[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.modelId) {
      query += ' AND c.modelId = @modelId';
      parameters.push({ name: '@modelId', value: filters.modelId });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<TrainingJob>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list training jobs: ${error.message}`);
    }
  }
}

