/**
 * Content Generation Service
 * Handles AI-powered content generation
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { ServiceClient } from '@coder/shared/services';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  ContentGenerationJob,
  CreateContentJobInput,
  GenerateContentRequest,
  GenerationJobStatus,
} from '../types/content.types';
import { loadConfig } from '../config';

export class ContentGenerationService {
  private containerName = 'content_generation_jobs';
  private aiServiceClient: ServiceClient;
  private shardManagerClient: ServiceClient;
  private config: ReturnType<typeof loadConfig>;

  constructor(aiServiceUrl?: string, shardManagerUrl?: string) {
    this.config = loadConfig();
    this.aiServiceClient = new ServiceClient({
      baseURL: aiServiceUrl || this.config.services.ai_service?.url || '',
      timeout: 60000, // Longer timeout for AI generation
      retries: 2,
      circuitBreaker: { enabled: true },
    });
    this.shardManagerClient = new ServiceClient({
      baseURL: shardManagerUrl || this.config.services.shard_manager?.url || '',
      timeout: 10000,
      retries: 2,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Create a new content generation job
   */
  async create(input: CreateContentJobInput): Promise<ContentGenerationJob> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.prompt || input.prompt.trim().length === 0) {
      throw new BadRequestError('prompt is required');
    }

    const job: ContentGenerationJob = {
      id: uuidv4(),
      tenantId: input.tenantId,
      userId: input.userId,
      templateId: input.templateId,
      status: GenerationJobStatus.PENDING,
      prompt: input.prompt,
      context: input.context,
      options: input.options,
      retryCount: 0,
      maxRetries: input.options?.connectionId ? 3 : 2,
      requestId: input.requestId,
      createdAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(job, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create content generation job');
      }

      // Start generation asynchronously
      this.generateContent(job.id, input.tenantId).catch((error) => {
        console.error(`Failed to generate content for job ${job.id}:`, error);
      });

      return resource as ContentGenerationJob;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Content generation job with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Generate content (internal method)
   */
  private async generateContent(jobId: string, tenantId: string): Promise<void> {
    const job = await this.getById(jobId, tenantId);

    // Update status to running
    await this.updateStatus(jobId, tenantId, GenerationJobStatus.RUNNING);

    try {
      // Prepare AI request
      const aiRequest = {
        messages: [
          {
            role: 'system',
            content: job.templateId
              ? `Generate content based on the template and user prompt.`
              : `Generate content based on the user prompt.`,
          },
          {
            role: 'user',
            content: job.prompt,
          },
        ],
        temperature: job.options?.temperature || 0.7,
        max_tokens: 4000,
      };

      // Call AI Service
      const aiResponse = await this.aiServiceClient.post<{ content: string; model?: string; tokensUsed?: number }>(
        '/api/v1/completions',
        aiRequest,
        {
          headers: {
            'X-Tenant-ID': tenantId,
            Authorization: `Bearer ${process.env.SERVICE_JWT_SECRET}`,
          },
        }
      );

      // Update job with result
      const updatedJob: ContentGenerationJob = {
        ...job,
        status: GenerationJobStatus.COMPLETED,
        result: {
          content: aiResponse.content || '',
          metadata: {
            model: aiResponse.model,
            tokensUsed: aiResponse.tokensUsed,
            duration: Date.now() - job.createdAt.getTime(),
          },
        },
        completedAt: new Date(),
      };

      const container = getContainer(this.containerName);
      await container.item(jobId, tenantId).replace(updatedJob);
    } catch (error: any) {
      // Update job with error
      const updatedJob: ContentGenerationJob = {
        ...job,
        status: GenerationJobStatus.FAILED,
        error: {
          message: error.message || 'Content generation failed',
          code: error.code,
          details: error.details,
        },
        completedAt: new Date(),
      };

      const container = getContainer(this.containerName);
      await container.item(jobId, tenantId).replace(updatedJob);
    }
  }

  /**
   * Generate content synchronously
   */
  async generate(request: GenerateContentRequest): Promise<ContentGenerationJob> {
    const job = await this.create({
      tenantId: request.tenantId,
      userId: request.userId,
      prompt: request.prompt,
      templateId: request.templateId,
      context: request.context,
      options: request.options,
    });

    // Wait for completion (with timeout)
    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();
    let currentJob = job;

    while (
      currentJob.status === GenerationJobStatus.PENDING ||
      currentJob.status === GenerationJobStatus.RUNNING
    ) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Content generation timeout');
      }

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      currentJob = await this.getById(job.id, request.tenantId);

      if (currentJob.status === GenerationJobStatus.FAILED) {
        throw new Error(currentJob.error?.message || 'Content generation failed');
      }
    }

    return currentJob;
  }

  /**
   * Get job by ID
   */
  async getById(jobId: string, tenantId: string): Promise<ContentGenerationJob> {
    if (!jobId || !tenantId) {
      throw new BadRequestError('jobId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(jobId, tenantId).read<ContentGenerationJob>();

      if (!resource) {
        throw new NotFoundError(`Content generation job ${jobId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Content generation job ${jobId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update job status
   */
  private async updateStatus(
    jobId: string,
    tenantId: string,
    status: GenerationJobStatus
  ): Promise<ContentGenerationJob> {
    const existing = await this.getById(jobId, tenantId);

    const updated: ContentGenerationJob = {
      ...existing,
      status,
      startedAt: status === GenerationJobStatus.RUNNING ? new Date() : existing.startedAt,
      completedAt:
        status === GenerationJobStatus.COMPLETED || status === GenerationJobStatus.FAILED
          ? new Date()
          : existing.completedAt,
    };

    const container = getContainer(this.containerName);
    const { resource } = await container.item(jobId, tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to update job status');
    }

    return resource as ContentGenerationJob;
  }

  /**
   * Cancel job
   */
  async cancel(jobId: string, tenantId: string): Promise<ContentGenerationJob> {
    const existing = await this.getById(jobId, tenantId);

    if (
      existing.status === GenerationJobStatus.COMPLETED ||
      existing.status === GenerationJobStatus.FAILED ||
      existing.status === GenerationJobStatus.CANCELLED
    ) {
      throw new BadRequestError('Cannot cancel a job that is already completed, failed, or cancelled');
    }

    return await this.updateStatus(jobId, tenantId, GenerationJobStatus.CANCELLED);
  }

  /**
   * List jobs
   */
  async list(
    tenantId: string,
    filters?: {
      status?: GenerationJobStatus;
      userId?: string;
      templateId?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: ContentGenerationJob[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.userId) {
      query += ' AND c.userId = @userId';
      parameters.push({ name: '@userId', value: filters.userId });
    }

    if (filters?.templateId) {
      query += ' AND c.templateId = @templateId';
      parameters.push({ name: '@templateId', value: filters.templateId });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<ContentGenerationJob>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list content generation jobs: ${error.message}`);
    }
  }
}

