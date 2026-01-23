/**
 * Opportunity Service
 * Centralized service for opportunity operations
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardRepository,
  ShardTypeRepository,
  ShardRelationshipService,
  RiskEvaluationService,
  TeamService,
} from '@castiel/api-core';
import type {
  OpportunityFilters,
  OpportunityListResult,
  OpportunityWithRelated,
} from '../types/opportunity.types.js';
import type { Shard } from '../types/shard.types.js';
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
import { ShardStatus } from '../types/shard.types.js';

export class OpportunityService {
  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private shardTypeRepository: ShardTypeRepository,
    private relationshipService: ShardRelationshipService,
    private riskEvaluationService?: RiskEvaluationService,
    private teamService?: TeamService
  ) {}

  /**
   * List opportunities owned by user with filters
   */
  async listOwnedOpportunities(
    userId: string,
    tenantId: string,
    filters?: OpportunityFilters,
    options?: {
      limit?: number;
      offset?: number;
      continuationToken?: string;
      includeRisk?: boolean;
    }
  ): Promise<OpportunityListResult> {
    const startTime = Date.now();

    try {
      // Get opportunity shard type
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.OPPORTUNITY,
        'system'
      );

      if (!shardType) {
        throw new Error('Opportunity shard type not found');
      }

      // Build structuredData filters
      // Ensure userId is valid before filtering
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid userId: userId is required and must be a non-empty string');
      }
      
      const structuredDataFilters: Record<string, any> = {
        ownerId: userId.trim(), // Ensure no leading/trailing whitespace
      };

      if (filters?.stage) {
        if (Array.isArray(filters.stage)) {
          structuredDataFilters.stage = filters.stage;
        } else {
          structuredDataFilters.stage = filters.stage;
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          structuredDataFilters.status = filters.status;
        } else {
          structuredDataFilters.status = filters.status;
        }
      }

      if (filters?.accountId) {
        structuredDataFilters.accountId = filters.accountId;
      }

      if (filters?.closeDateFrom || filters?.closeDateTo) {
        if (filters.closeDateFrom && filters.closeDateTo) {
          structuredDataFilters.closeDate = {
            min: filters.closeDateFrom instanceof Date ? filters.closeDateFrom.toISOString() : filters.closeDateFrom,
            max: filters.closeDateTo instanceof Date ? filters.closeDateTo.toISOString() : filters.closeDateTo,
          };
        } else if (filters.closeDateFrom) {
          structuredDataFilters.closeDate = {
            operator: 'gte',
            value: filters.closeDateFrom instanceof Date ? filters.closeDateFrom.toISOString() : filters.closeDateFrom,
          };
        } else if (filters.closeDateTo) {
          structuredDataFilters.closeDate = {
            operator: 'lte',
            value: filters.closeDateTo instanceof Date ? filters.closeDateTo.toISOString() : filters.closeDateTo,
          };
        }
      }

      // Query opportunities using enhanced repository method
      let result;
      try {
        result = await this.shardRepository.list({
          filter: {
            tenantId,
            shardTypeId: shardType.id,
            status: ShardStatus.ACTIVE,
            structuredDataFilters,
          },
          limit: options?.limit || 50,
          continuationToken: options?.continuationToken,
          orderBy: 'updatedAt',
          orderDirection: 'desc',
        });
      } catch (error: unknown) {
        // If query fails, try without structuredDataFilters and filter in memory
        // This is a fallback for cases where Cosmos DB query syntax has issues
        if (error instanceof Error && error.message?.includes('input values is invalid')) {
          this.monitoring.trackException(error, {
            operation: 'opportunity.listOwnedOpportunities.fallback',
            tenantId,
            userId,
          });
          
          // Fallback: query all opportunities and filter in memory
          result = await this.shardRepository.list({
            filter: {
              tenantId,
              shardTypeId: shardType.id,
              status: ShardStatus.ACTIVE,
            },
            limit: 1000, // Get more to filter in memory
            continuationToken: options?.continuationToken,
            orderBy: 'updatedAt',
            orderDirection: 'desc',
          });
          
          // Filter by ownerId in memory
          result.shards = result.shards.filter((shard) => {
            const data = shard.structuredData as any;
            return data?.ownerId === userId;
          });
        } else {
          throw error;
        }
      }

      // Apply risk filters if needed (post-query filtering for risk-based filters)
      let filteredOpportunities = result.shards;

      if (filters?.riskLevel || filters?.riskCategory || filters?.riskScoreMin || filters?.riskScoreMax) {
        filteredOpportunities = await this.applyRiskFilters(
          filteredOpportunities,
          filters,
          tenantId,
          userId
        );
      }

      // Apply text search if provided
      if (filters?.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        filteredOpportunities = filteredOpportunities.filter((opp) => {
          const data = opp.structuredData as any;
          const name = (data?.name || '').toLowerCase();
          const description = (data?.description || '').toLowerCase();
          return name.includes(searchLower) || description.includes(searchLower);
        });
      }

      this.monitoring.trackEvent('opportunity.list', {
        tenantId,
        userId,
        count: filteredOpportunities.length,
        durationMs: Date.now() - startTime,
      });

      return {
        opportunities: filteredOpportunities,
        total: filteredOpportunities.length,
        continuationToken: result.continuationToken,
        hasMore: !!result.continuationToken,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'opportunity.listOwnedOpportunities',
        tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get opportunity with related shards
   */
  async getOpportunity(
    opportunityId: string,
    tenantId: string,
    includeRelated: boolean = true
  ): Promise<OpportunityWithRelated> {
    const startTime = Date.now();

    try {
      // Get opportunity
      const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
      if (!opportunity) {
        throw new Error(`Opportunity not found: ${opportunityId}`);
      }

      // Verify it's an opportunity
      const shardType = await this.shardTypeRepository.findById(opportunity.shardTypeId, tenantId);
      if (shardType?.name !== CORE_SHARD_TYPE_NAMES.OPPORTUNITY) {
        throw new Error(`Shard is not an opportunity: ${opportunityId}`);
      }

      const result: OpportunityWithRelated = {
        opportunity,
        relatedShards: {
          documents: [],
          tasks: [],
          notes: [],
          meetings: [],
          calls: [],
        },
      };

      if (includeRelated) {
        // Get related shards
        const relatedShardsResult = await this.relationshipService.getRelatedShards(
          tenantId,
          opportunityId,
          'both',
          { limit: 100 }
        );

        // Organize related shards by type
        for (const rel of relatedShardsResult) {
          const shard = rel.shard;
          const relType = rel.edge?.relationshipType || '';

          if (shard.shardTypeId === 'c_account' || relType === 'opportunity_for') {
            result.relatedShards.account = shard;
          } else if (shard.shardTypeId === 'c_contact' || relType === 'has_stakeholder') {
            result.relatedShards.contact = shard;
          } else if (shard.shardTypeId === 'c_document' || relType === 'has_document') {
            result.relatedShards.documents.push(shard);
          } else if (shard.shardTypeId === 'c_task' || relType === 'has_task') {
            result.relatedShards.tasks.push(shard);
          } else if (shard.shardTypeId === 'c_note' || relType === 'has_note') {
            result.relatedShards.notes.push(shard);
          } else if (shard.shardTypeId === 'c_meeting' || relType === 'has_meeting') {
            result.relatedShards.meetings.push(shard);
          } else if (shard.shardTypeId === 'c_call' || relType === 'has_call') {
            result.relatedShards.calls.push(shard);
          }
        }

        // Get risk evaluation if available
        if (this.riskEvaluationService) {
          try {
            const opportunityData = opportunity.structuredData as any;
            if (opportunityData?.riskEvaluation) {
              result.riskEvaluation = opportunityData.riskEvaluation;
            } else {
              // Optionally evaluate on demand (commented out for performance)
              // result.riskEvaluation = await this.riskEvaluationService.evaluateOpportunity(
              //   opportunityId,
              //   tenantId,
              //   'system',
              //   { includeHistorical: false, includeAI: false }
              // );
            }
          } catch (error: unknown) {
            // Risk evaluation failed, but don't fail the whole request
            this.monitoring.trackException(
              error instanceof Error ? error : new Error(String(error)),
              {
              operation: 'opportunity.getOpportunity.riskEvaluation',
              opportunityId,
              tenantId,
            });
          }
        }
      }

      this.monitoring.trackEvent('opportunity.get', {
        tenantId,
        opportunityId,
        includeRelated,
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'opportunity.getOpportunity',
        tenantId,
        opportunityId,
      });
      throw error;
    }
  }

  /**
   * Get opportunities by account
   */
  async getOpportunitiesByAccount(
    accountId: string,
    tenantId: string,
    options?: {
      limit?: number;
      includeClosed?: boolean;
    }
  ): Promise<Shard[]> {
    try {
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.OPPORTUNITY,
        'system'
      );

      if (!shardType) {
        return [];
      }

      const result = await this.shardRepository.list({
        filter: {
          tenantId,
          shardTypeId: shardType.id,
          status: options?.includeClosed ? undefined : ShardStatus.ACTIVE,
          structuredDataFilters: {
            accountId,
          },
        },
        limit: options?.limit || 100,
        orderBy: 'updatedAt',
        orderDirection: 'desc',
      });

      return result.shards;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'opportunity.getOpportunitiesByAccount',
        tenantId,
        accountId,
      });
      throw error;
    }
  }

  /**
   * Update opportunity stage (for kanban drag-and-drop)
   */
  async updateStage(
    opportunityId: string,
    newStage: string,
    tenantId: string,
    userId: string
  ): Promise<Shard> {
    const startTime = Date.now();

    try {
      const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
      if (!opportunity) {
        throw new Error(`Opportunity not found: ${opportunityId}`);
      }

      const currentData = opportunity.structuredData as any;
      const oldStage = currentData?.stage;

      // Update stage
      const updated = await this.shardRepository.update(opportunityId, tenantId, {
        structuredData: {
          ...currentData,
          stage: newStage,
          // Auto-update probability based on stage (if not manually overridden)
          // This would typically be handled by a computed field or workflow
        },
      });

      this.monitoring.trackEvent('opportunity.stageUpdated', {
        tenantId,
        opportunityId,
        oldStage,
        newStage,
        userId,
        durationMs: Date.now() - startTime,
      });

      // Queue risk evaluation when stage changes (async, non-blocking)
      if (this.riskEvaluationService && oldStage !== newStage) {
        try {
          await this.riskEvaluationService.queueRiskEvaluation(
            opportunityId,
            tenantId,
            userId,
            'opportunity_updated',
            'normal',
            {
              includeHistorical: true,
              includeAI: true,
              includeSemanticDiscovery: true,
            }
          );
        } catch (error) {
          // Log but don't fail stage update
          this.monitoring.trackException(
            error instanceof Error ? error : new Error(String(error)),
            {
              operation: 'opportunity.updateStage.queueRiskEvaluation',
              tenantId,
              opportunityId,
            }
          );
        }
      }

      return updated!;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'opportunity.updateStage',
        tenantId,
        opportunityId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Apply risk-based filters (post-query filtering)
   * Note: This requires risk evaluation, so it's done after initial query
   */
  private async applyRiskFilters(
    opportunities: Shard[],
    filters: OpportunityFilters,
    tenantId: string,
    userId: string
  ): Promise<Shard[]> {
    if (!filters.riskLevel && !filters.riskCategory && !filters.riskScoreMin && !filters.riskScoreMax) {
      return opportunities;
    }

    // Filter opportunities based on risk criteria
    const filtered: Shard[] = [];

    for (const opp of opportunities) {
      const data = opp.structuredData as any;
      const riskEvaluation = data?.riskEvaluation;

      // Risk level filter
      if (filters.riskLevel) {
        const riskLevels = Array.isArray(filters.riskLevel) ? filters.riskLevel : [filters.riskLevel];
        const riskScore = riskEvaluation?.riskScore || 0;
        let oppRiskLevel: 'high' | 'medium' | 'low';
        
        if (riskScore >= 0.7) {
          oppRiskLevel = 'high';
        } else if (riskScore >= 0.4) {
          oppRiskLevel = 'medium';
        } else {
          oppRiskLevel = 'low';
        }

        if (!riskLevels.includes(oppRiskLevel)) {
          continue;
        }
      }

      // Risk score range filter
      if (filters.riskScoreMin !== undefined || filters.riskScoreMax !== undefined) {
        const riskScore = riskEvaluation?.riskScore || 0;
        if (filters.riskScoreMin !== undefined && riskScore < filters.riskScoreMin) {
          continue;
        }
        if (filters.riskScoreMax !== undefined && riskScore > filters.riskScoreMax) {
          continue;
        }
      }

      // Risk category filter
      if (filters.riskCategory) {
        const categories = Array.isArray(filters.riskCategory) ? filters.riskCategory : [filters.riskCategory];
        const riskCategories = riskEvaluation?.risks?.map((r: any) => r.category) || [];
        const hasMatchingCategory = categories.some(cat => riskCategories.includes(cat));
        
        if (!hasMatchingCategory) {
          continue;
        }
      }

      filtered.push(opp);
    }

    return filtered;
  }

  /**
   * List opportunities for a team (all team members' opportunities)
   */
  async listTeamOpportunities(
    teamId: string,
    tenantId: string,
    userId: string,
    filters?: OpportunityFilters,
    options?: {
      limit?: number;
      offset?: number;
      continuationToken?: string;
      includeRisk?: boolean;
    }
  ): Promise<OpportunityListResult> {
    const startTime = Date.now();

    try {
      if (!this.teamService) {
        throw new Error('TeamService is required for team opportunity queries');
      }

      // Get all user IDs in the team (including descendants if needed)
      const teamUserIds = await this.teamService.getTeamUserIdsRecursive(teamId, tenantId);

      if (teamUserIds.length === 0) {
        return {
          opportunities: [],
          total: 0,
          continuationToken: undefined,
          hasMore: false,
        };
      }

      // Get opportunities for all team members
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.OPPORTUNITY,
        'system'
      );

      if (!shardType) {
        throw new Error('Opportunity shard type not found');
      }

      const result = await this.shardRepository.list({
        filter: {
          tenantId,
          shardTypeId: shardType.id,
          status: ShardStatus.ACTIVE,
        },
        limit: options?.limit || 1000,
        continuationToken: options?.continuationToken,
        orderBy: 'updatedAt',
        orderDirection: 'desc',
      });

      // Filter by team member ownerIds
      let filteredOpportunities = result.shards.filter((shard) => {
        const data = shard.structuredData as any;
        return teamUserIds.includes(data?.ownerId);
      });

      // Apply additional filters
      filteredOpportunities = this.applyOpportunityFilters(filteredOpportunities, filters);

      // Apply risk filters if needed
      if (filters?.riskLevel || filters?.riskCategory || filters?.riskScoreMin || filters?.riskScoreMax) {
        filteredOpportunities = await this.applyRiskFilters(
          filteredOpportunities,
          filters,
          tenantId,
          userId
        );
      }

      this.monitoring.trackEvent('opportunity.listTeam', {
        tenantId,
        userId,
        teamId,
        count: filteredOpportunities.length,
        durationMs: Date.now() - startTime,
      });

      return {
        opportunities: filteredOpportunities,
        total: filteredOpportunities.length,
        continuationToken: result.continuationToken,
        hasMore: !!result.continuationToken,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'opportunity.listTeamOpportunities',
        tenantId,
        userId,
        teamId,
      });
      throw error;
    }
  }

  /**
   * List opportunities for all teams managed by a user
   */
  async listManagerOpportunities(
    managerId: string,
    tenantId: string,
    userId: string,
    filters?: OpportunityFilters,
    options?: {
      limit?: number;
      offset?: number;
      continuationToken?: string;
      includeRisk?: boolean;
      includeAllTeams?: boolean; // If true, include all descendant teams
    }
  ): Promise<OpportunityListResult> {
    const startTime = Date.now();

    try {
      if (!this.teamService) {
        throw new Error('TeamService is required for manager opportunity queries');
      }

      // Get all teams managed by this user
      const managerTeams = await this.teamService.getManagerTeams(managerId, tenantId);

      if (managerTeams.length === 0) {
        return {
          opportunities: [],
          total: 0,
          continuationToken: undefined,
          hasMore: false,
        };
      }

      // Collect all user IDs from all managed teams
      const allUserIds = new Set<string>();

      for (const team of managerTeams) {
        const teamUserIds = options?.includeAllTeams
          ? await this.teamService.getTeamUserIdsRecursive(team.id, tenantId)
          : await this.teamService.getTeamUserIds(team.id, tenantId);

        teamUserIds.forEach(id => allUserIds.add(id));
      }

      if (allUserIds.size === 0) {
        return {
          opportunities: [],
          total: 0,
          continuationToken: undefined,
          hasMore: false,
        };
      }

      // Get opportunities for all team members
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.OPPORTUNITY,
        'system'
      );

      if (!shardType) {
        throw new Error('Opportunity shard type not found');
      }

      const result = await this.shardRepository.list({
        filter: {
          tenantId,
          shardTypeId: shardType.id,
          status: ShardStatus.ACTIVE,
        },
        limit: options?.limit || 1000,
        continuationToken: options?.continuationToken,
        orderBy: 'updatedAt',
        orderDirection: 'desc',
      });

      // Filter by team member ownerIds
      const userIdsArray = Array.from(allUserIds);
      let filteredOpportunities = result.shards.filter((shard) => {
        const data = shard.structuredData as any;
        return userIdsArray.includes(data?.ownerId);
      });

      // Apply additional filters
      filteredOpportunities = this.applyOpportunityFilters(filteredOpportunities, filters);

      // Apply risk filters if needed
      if (filters?.riskLevel || filters?.riskCategory || filters?.riskScoreMin || filters?.riskScoreMax) {
        filteredOpportunities = await this.applyRiskFilters(
          filteredOpportunities,
          filters,
          tenantId,
          userId
        );
      }

      this.monitoring.trackEvent('opportunity.listManager', {
        tenantId,
        userId,
        managerId,
        count: filteredOpportunities.length,
        durationMs: Date.now() - startTime,
      });

      return {
        opportunities: filteredOpportunities,
        total: filteredOpportunities.length,
        continuationToken: result.continuationToken,
        hasMore: !!result.continuationToken,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'opportunity.listManagerOpportunities',
        tenantId,
        userId,
        managerId,
      });
      throw error;
    }
  }

  /**
   * Helper: Apply opportunity filters (stage, status, accountId, closeDate, searchQuery)
   */
  private applyOpportunityFilters(
    opportunities: Shard[],
    filters?: OpportunityFilters
  ): Shard[] {
    let filtered = opportunities;

    if (filters?.stage) {
      const stages = Array.isArray(filters.stage) ? filters.stage : [filters.stage];
      filtered = filtered.filter((opp) => {
        const data = opp.structuredData as any;
        return stages.includes(data?.stage);
      });
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      filtered = filtered.filter((opp) => {
        const data = opp.structuredData as any;
        return statuses.includes(data?.status);
      });
    }

    if (filters?.accountId) {
      filtered = filtered.filter((opp) => {
        const data = opp.structuredData as any;
        return data?.accountId === filters.accountId;
      });
    }

    if (filters?.closeDateFrom || filters?.closeDateTo) {
      filtered = filtered.filter((opp) => {
        const data = opp.structuredData as any;
        const closeDate = data?.closeDate ? new Date(data.closeDate) : null;
        if (!closeDate) {return true;}

        if (filters.closeDateFrom && closeDate < filters.closeDateFrom) {
          return false;
        }
        if (filters.closeDateTo && closeDate > filters.closeDateTo) {
          return false;
        }
        return true;
      });
    }

    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((opp) => {
        const data = opp.structuredData as any;
        const name = (data?.name || '').toLowerCase();
        const description = (data?.description || '').toLowerCase();
        return name.includes(searchLower) || description.includes(searchLower);
      });
    }

    return filtered;
  }
}

