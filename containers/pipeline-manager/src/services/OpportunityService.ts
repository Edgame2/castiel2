/**
 * Opportunity Service
 * Handles opportunity CRUD operations using Shard Manager
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { ServiceClient } from '@coder/shared/services';
import { BadRequestError, NotFoundError, ForbiddenError } from '@coder/shared/utils/errors';
import {
  Opportunity,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  OpportunityStructuredData,
  SalesStage,
  OpportunityStatus,
} from '../types/pipeline.types';

export class OpportunityService {
  private containerName = 'pipeline_opportunities';
  private shardManagerClient: ServiceClient;

  constructor(shardManagerUrl: string) {
    this.shardManagerClient = new ServiceClient({
      baseURL: shardManagerUrl,
      timeout: 10000,
      retries: 2,
    });
  }

  /**
   * Calculate expected revenue
   */
  private calculateExpectedRevenue(amount: number, probability: number): number {
    return amount * (probability / 100);
  }

  /**
   * Get default probability for stage
   */
  private getDefaultProbability(stage: SalesStage): number {
    const probabilities: Record<SalesStage, number> = {
      [SalesStage.PROSPECTING]: 10,
      [SalesStage.QUALIFICATION]: 25,
      [SalesStage.NEEDS_ANALYSIS]: 40,
      [SalesStage.VALUE_PROPOSITION]: 50,
      [SalesStage.ID_DECISION_MAKERS]: 55,
      [SalesStage.PERCEPTION_ANALYSIS]: 60,
      [SalesStage.PROPOSAL_PRICE_QUOTE]: 65,
      [SalesStage.NEGOTIATION_REVIEW]: 75,
      [SalesStage.CLOSED_WON]: 100,
      [SalesStage.CLOSED_LOST]: 0,
    };
    return probabilities[stage] || 50;
  }

  /**
   * Create a new opportunity
   */
  async create(input: CreateOpportunityInput): Promise<Opportunity> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.name) {
      throw new BadRequestError('name is required');
    }
    if (!input.stage) {
      throw new BadRequestError('stage is required');
    }
    if (!input.ownerId) {
      throw new BadRequestError('ownerId is required');
    }

    // Calculate probability if not provided
    const probability = input.probability ?? this.getDefaultProbability(input.stage);

    // Calculate expected revenue
    const amount = input.amount || 0;
    const expectedRevenue = this.calculateExpectedRevenue(amount, probability);

    // Determine status from stage
    const status =
      input.status ||
      (input.stage === SalesStage.CLOSED_WON
        ? OpportunityStatus.WON
        : input.stage === SalesStage.CLOSED_LOST
        ? OpportunityStatus.LOST
        : OpportunityStatus.OPEN);

    // Create shard via Shard Manager
    const structuredData: OpportunityStructuredData = {
      name: input.name,
      opportunityNumber: input.opportunityNumber,
      type: input.type,
      stage: input.stage,
      status,
      isWon: status === OpportunityStatus.WON,
      isClosed: status === OpportunityStatus.WON || status === OpportunityStatus.LOST,
      amount,
      expectedRevenue,
      currency: input.currency || 'USD',
      probability,
      closeDate: input.closeDate,
      nextStepDate: input.nextStepDate,
      accountId: input.accountId,
      accountName: input.accountName,
      contactId: input.contactId,
      contactName: input.contactName,
      leadId: input.leadId,
      leadName: input.leadName,
      campaignId: input.campaignId,
      campaignName: input.campaignName,
      ownerId: input.ownerId,
      ownerName: input.ownerName,
      description: input.description,
      nextStep: input.nextStep,
      tags: input.tags || [],
      rating: input.rating,
      createdDate: new Date(),
      lastModifiedDate: new Date(),
      lastActivityDate: new Date(),
    };

    // Shard type id: use c_opportunity (resolve from Shard Manager when dynamic lookup is needed).
    const shardTypeId = 'c_opportunity';

    try {
      // Create shard via Shard Manager API
      const shardResponse = await this.shardManagerClient.post<{ id: string }>(
        '/api/v1/shards',
        {
          shardTypeId,
          shardTypeName: 'c_opportunity',
          structuredData,
          tenantId: input.tenantId,
        },
        {
          headers: {
            'X-Tenant-ID': input.tenantId,
            Authorization: `Bearer ${process.env.SERVICE_JWT_SECRET}`, // Service-to-service token
          },
        }
      );

      const shardId = shardResponse.id;

      // Create opportunity record in pipeline_opportunities container
      const opportunity: Opportunity = {
        id: uuidv4(),
        tenantId: input.tenantId,
        shardId,
        structuredData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const container = getContainer(this.containerName);
      const { resource } = await (container.items as any).create(opportunity, {
        partitionKey: input.tenantId,
      } as any);

      if (!resource) {
        throw new Error('Failed to create opportunity');
      }

      return resource as Opportunity;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Opportunity with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get opportunity by ID
   */
  async getById(opportunityId: string, tenantId: string): Promise<Opportunity> {
    if (!opportunityId || !tenantId) {
      throw new BadRequestError('opportunityId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(opportunityId, tenantId).read<Opportunity>();

      if (!resource) {
        throw new NotFoundError('Opportunity', opportunityId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Opportunity', opportunityId);
      }
      throw error;
    }
  }

  /**
   * Update opportunity
   */
  async update(
    opportunityId: string,
    tenantId: string,
    input: UpdateOpportunityInput
  ): Promise<Opportunity> {
    const existing = await this.getById(opportunityId, tenantId);

    // Recalculate expected revenue if amount or probability changed
    let expectedRevenue = existing.structuredData.expectedRevenue;
    let probability = existing.structuredData.probability;
    let amount = existing.structuredData.amount || 0;

    if (input.amount !== undefined) {
      amount = input.amount;
    }
    if (input.probability !== undefined) {
      probability = input.probability;
    } else if (input.stage && input.stage !== existing.structuredData.stage) {
      // Update probability based on new stage
      probability = this.getDefaultProbability(input.stage);
    }

    expectedRevenue = this.calculateExpectedRevenue(amount, probability);

    // Update status if stage changed to closed
    let status = existing.structuredData.status;
    if (input.stage === SalesStage.CLOSED_WON) {
      status = OpportunityStatus.WON;
    } else if (input.stage === SalesStage.CLOSED_LOST) {
      status = OpportunityStatus.LOST;
    } else if (input.status) {
      status = input.status;
    }

    const updatedData: OpportunityStructuredData = {
      ...existing.structuredData,
      ...input,
      expectedRevenue: input.expectedRevenue ?? expectedRevenue,
      probability,
      amount: input.amount ?? amount,
      status,
      isWon: status === OpportunityStatus.WON,
      isClosed: status === OpportunityStatus.WON || status === OpportunityStatus.LOST,
      lastModifiedDate: new Date(),
      lastActivityDate: new Date(),
    };

    // Update shard via Shard Manager
    try {
      await this.shardManagerClient.put(
        `/api/v1/shards/${existing.shardId}`,
        {
          structuredData: updatedData,
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
            Authorization: `Bearer ${process.env.SERVICE_JWT_SECRET}`,
          },
        }
      );
    } catch (error: any) {
      throw new Error(`Failed to update shard: ${error.message}`);
    }

    // Update opportunity record
    const updated: Opportunity = {
      ...existing,
      structuredData: updatedData,
      updatedAt: new Date(),
    };

    const container = getContainer(this.containerName);
    const { resource } = await container.item(opportunityId, tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to update opportunity');
    }

    return resource as Opportunity;
  }

  /**
   * Delete opportunity
   */
  async delete(opportunityId: string, tenantId: string): Promise<void> {
    const existing = await this.getById(opportunityId, tenantId);

    // Delete shard via Shard Manager
    try {
      await this.shardManagerClient.delete(`/api/v1/shards/${existing.shardId}`, {
        headers: {
          'X-Tenant-ID': tenantId,
          Authorization: `Bearer ${process.env.SERVICE_JWT_SECRET}`,
        },
      });
    } catch (error: any) {
      // Log but continue with local deletion
      console.error('Failed to delete shard:', error);
    }

    // Delete opportunity record
    const container = getContainer(this.containerName);
    await container.item(opportunityId, tenantId).delete();
  }

  /**
   * List opportunities with filtering
   */
  async list(
    tenantId: string,
    filters?: {
      stage?: SalesStage;
      status?: OpportunityStatus;
      ownerId?: string;
      accountId?: string;
      type?: string;
      tags?: string[];
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Opportunity[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.stage) {
      query += ' AND c.structuredData.stage = @stage';
      parameters.push({ name: '@stage', value: filters.stage });
    }

    if (filters?.status) {
      query += ' AND c.structuredData.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.ownerId) {
      query += ' AND c.structuredData.ownerId = @ownerId';
      parameters.push({ name: '@ownerId', value: filters.ownerId });
    }

    if (filters?.accountId) {
      query += ' AND c.structuredData.accountId = @accountId';
      parameters.push({ name: '@accountId', value: filters.accountId });
    }

    if (filters?.type) {
      query += ' AND c.structuredData.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    query += ' ORDER BY c.structuredData.closeDate DESC, c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Opportunity>({
          query,
          parameters,
        })
        .fetchNext();

      // Filter by tags if provided (client-side filtering for array contains)
      let filtered = resources;
      if (filters?.tags && filters.tags.length > 0) {
        filtered = resources.filter((opp) => {
          const oppTags = opp.structuredData.tags || [];
          return filters.tags!.some((tag) => oppTags.includes(tag));
        });
      }

      return {
        items: filtered.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list opportunities: ${error.message}`);
    }
  }
}

