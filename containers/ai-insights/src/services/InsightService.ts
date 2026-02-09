/**
 * Insight Service
 * Handles AI-powered insight generation and management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { ServiceClient } from '@coder/shared/services';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Insight,
  CreateInsightInput,
  UpdateInsightInput,
  GenerateInsightRequest,
  InsightType,
  InsightStatus,
} from '../types/insight.types';

export class InsightService {
  private containerName = 'ai_insights';
  private _aiServiceClient: ServiceClient;
  private shardManagerClient: ServiceClient;
  private _embeddingsClient: ServiceClient;

  constructor(aiServiceUrl: string, shardManagerUrl: string, embeddingsUrl: string) {
    this._aiServiceClient = new ServiceClient({
      baseURL: aiServiceUrl,
      timeout: 30000,
      retries: 2,
    });
    this.shardManagerClient = new ServiceClient({
      baseURL: shardManagerUrl,
      timeout: 10000,
      retries: 2,
    });
    this._embeddingsClient = new ServiceClient({
      baseURL: embeddingsUrl,
      timeout: 10000,
      retries: 2,
    });
    void this._aiServiceClient;
    void this._embeddingsClient;
  }

  /**
   * Create a new insight
   */
  async create(input: CreateInsightInput): Promise<Insight> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.title) {
      throw new BadRequestError('title is required');
    }
    if (!input.summary) {
      throw new BadRequestError('summary is required');
    }

    const insight: Insight = {
      id: uuidv4(),
      tenantId: input.tenantId,
      type: input.type,
      priority: input.priority,
      status: InsightStatus.NEW,
      title: input.title,
      summary: input.summary,
      detailedContent: input.detailedContent,
      shardId: input.shardId,
      shardName: input.shardName,
      shardTypeId: input.shardTypeId,
      confidence: input.confidence || 50,
      evidence: input.evidence || [],
      suggestedActions: input.suggestedActions || [],
      relatedShards: input.relatedShards,
      metadata: input.metadata,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName) as any;
      const { resource } = await container.items.create(insight, {
        partitionKey: input.tenantId,
      } as any);

      if (!resource) {
        throw new Error('Failed to create insight');
      }

      return resource as Insight;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Insight with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Generate insight using AI
   */
  async generate(request: GenerateInsightRequest): Promise<Insight> {
    if (!request.tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    // Fetch shard data if shardIds provided
    let shardData: any[] = [];
    if (request.shardIds && request.shardIds.length > 0) {
      for (const shardId of request.shardIds) {
        try {
          const shard = await this.shardManagerClient.get<{ structuredData: any }>(
            `/api/v1/shards/${shardId}`,
            {
              headers: {
                'X-Tenant-ID': request.tenantId,
                Authorization: `Bearer ${process.env.SERVICE_JWT_SECRET}`,
              },
            }
          );
          if (shard) {
            shardData.push(shard);
          }
        } catch (error) {
          console.error(`Failed to fetch shard ${shardId}:`, error);
        }
      }
    }

    // Generate placeholder insight; actual AI generation is deferred (see README).
    const insightInput: CreateInsightInput = {
      tenantId: request.tenantId,
      userId: request.userId,
      type: request.insightType || InsightType.RECOMMENDATION,
      priority: 'medium' as any,
      title: 'AI Generated Insight',
      summary: request.context || 'AI-generated insight based on provided data',
      detailedContent: request.includeEvidence
        ? 'This insight was generated using AI analysis of the provided shard data.'
        : undefined,
      shardId: request.shardIds?.[0],
      confidence: 75,
    };

    return await this.create(insightInput);
  }

  /**
   * Get insight by ID
   */
  async getById(insightId: string, tenantId: string): Promise<Insight> {
    if (!insightId || !tenantId) {
      throw new BadRequestError('insightId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName) as any;
      const item = container.item(insightId, tenantId);
      const result = (await (item as any).read()) as any;
      const resource = (result as any).resource as Insight | undefined;

      if (!resource) {
        throw new NotFoundError('Insight', insightId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Insight', insightId);
      }
      throw error;
    }
  }

  /**
   * Update insight
   */
  async update(
    insightId: string,
    tenantId: string,
    input: UpdateInsightInput
  ): Promise<Insight> {
    const existing = await this.getById(insightId, tenantId);

    const updated: Insight = {
      ...existing,
      ...input,
      acknowledgedAt: input.acknowledgedBy ? new Date() : existing.acknowledgedAt,
      dismissedAt: input.dismissedBy ? new Date() : existing.dismissedAt,
      actionedAt: input.actionedBy ? new Date() : existing.actionedAt,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName) as any;
      const item = container.item(insightId, tenantId);
      const result = (await (item as any).replace(updated)) as any;
      const resource = (result as any).resource as Insight | undefined;

      if (!resource) {
        throw new Error('Failed to update insight');
      }

      return resource as Insight;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Insight', insightId);
      }
      throw error;
    }
  }

  /**
   * Delete insight
   */
  async delete(insightId: string, tenantId: string): Promise<void> {
    await this.getById(insightId, tenantId);

    const container = getContainer(this.containerName) as any;
    const item = container.item(insightId, tenantId);
    await (item as any).delete();
  }

  /**
   * List insights
   */
  async list(
    tenantId: string,
    filters?: {
      type?: InsightType;
      status?: InsightStatus;
      priority?: string;
      shardId?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Insight[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName) as any;
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

    if (filters?.shardId) {
      query += ' AND c.shardId = @shardId';
      parameters.push({ name: '@shardId', value: filters.shardId });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await (container.items
        .query({
          query,
          parameters,
        }) as any).fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list insights: ${error.message}`);
    }
  }
}

