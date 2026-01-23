/**
 * Opportunity Auto-Linking Service
 * 
 * Automatically links shards to opportunities based on multi-factor matching:
 * - Content overlap: Same account, contact, company IDs
 * - Metadata overlap: Same owner, team members, dates
 * - Temporal overlap: Shards created within time window of opportunity activity
 * - Account-based: Shards linked to same account as opportunity
 * 
 * Trigger: Service Bus events (shard-created) or Change Feed
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import type { Shard, InternalRelationship } from '../types/shard.types.js';
import { ShardStatus } from '../types/shard.types.js';
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';

interface LinkingRule {
  type: 'content' | 'metadata' | 'temporal' | 'account';
  strength: 'strong' | 'medium' | 'weak';
  matched: boolean;
  confidence: number; // 0.0 - 1.0
  details?: any;
}

interface LinkingCandidate {
  opportunityId: string;
  opportunity: Shard;
  rules: LinkingRule[];
  totalConfidence: number;
}

export class OpportunityAutoLinkingService {
  // Time window for activity-based linking (30 days)
  private readonly ACTIVITY_TIME_WINDOW_DAYS = 30;

  // Confidence thresholds
  private readonly STRONG_CONFIDENCE_THRESHOLD = 0.7;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.4;

  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private relationshipService: ShardRelationshipService,
    private shardTypeRepository: ShardTypeRepository
  ) {}

  /**
   * Process shard creation event and auto-link to opportunities
   */
  async processShardCreated(shard: Shard): Promise<void> {
    const startTime = Date.now();

    try {
      // Skip if shard is already linked to an opportunity
      if (this.isAlreadyLinkedToOpportunity(shard)) {
        return;
      }

      // Find candidate opportunities
      const candidates = await this.findCandidateOpportunities(shard);

      if (candidates.length === 0) {
        this.monitoring.trackEvent('opportunity_auto_linking.no_candidates', {
          shardId: shard.id,
          tenantId: shard.tenantId,
          shardTypeId: shard.shardTypeId,
        });
        return;
      }

      // Evaluate linking rules for each candidate
      const links: LinkingCandidate[] = [];

      for (const candidate of candidates) {
        const rules = await this.evaluateLinkingRules(shard, candidate.opportunity);
        const totalConfidence = this.calculateTotalConfidence(rules);
        
        // Only link if confidence is above threshold
        if (totalConfidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
          links.push({
            opportunityId: candidate.opportunity.id,
            opportunity: candidate.opportunity,
            rules,
            totalConfidence,
          });
        }
      }

      // Sort by confidence (highest first) and link top candidates
      links.sort((a, b) => b.totalConfidence - a.totalConfidence);

      // Link to opportunities (limit to top 3 to avoid over-linking)
      const topLinks = links.slice(0, 3);
      
      for (const link of topLinks) {
        await this.linkShardToOpportunity(shard, link.opportunity, link.rules, link.totalConfidence);
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('opportunity_auto_linking.completed', {
        shardId: shard.id,
        tenantId: shard.tenantId,
        opportunityCount: topLinks.length,
        duration,
      });
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'OpportunityAutoLinkingService',
          operation: 'processShardCreated',
          shardId: shard.id,
      });
      throw error;
    }
  }

  /**
   * Find candidate opportunities for auto-linking
   */
  private async findCandidateOpportunities(shard: Shard): Promise<Array<{ opportunity: Shard }>> {
    // Get opportunity shard type
    const shardType = await this.shardTypeRepository.findByName(
      CORE_SHARD_TYPE_NAMES.OPPORTUNITY,
      'system'
    );

    if (!shardType) {
      return [];
    }

    // Get all active opportunities for the tenant
    const result = await this.shardRepository.list({
      filter: {
        tenantId: shard.tenantId,
        shardTypeId: shardType.id,
        status: ShardStatus.ACTIVE,
      },
      limit: 1000, // Reasonable limit for opportunities per tenant
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    });

    return result.shards.map((opp) => ({ opportunity: opp }));
  }

  /**
   * Evaluate linking rules between shard and opportunity
   */
  private async evaluateLinkingRules(shard: Shard, opportunity: Shard): Promise<LinkingRule[]> {
    const rules: LinkingRule[] = [];

    // Rule 1: Content overlap (account, contact, company)
    const contentOverlap = this.checkContentOverlap(shard, opportunity);
    rules.push(contentOverlap);

    // Rule 2: Metadata overlap (owner, team, dates)
    const metadataOverlap = this.checkMetadataOverlap(shard, opportunity);
    rules.push(metadataOverlap);

    // Rule 3: Temporal overlap (time window)
    const temporalOverlap = this.checkTemporalOverlap(shard, opportunity);
    rules.push(temporalOverlap);

    // Rule 4: Account-based (shard linked to same account)
    const accountBased = await this.checkAccountBased(shard, opportunity);
    rules.push(accountBased);

    return rules;
  }

  /**
   * Check content overlap (account, contact, company IDs)
   */
  private checkContentOverlap(shard: Shard, opportunity: Shard): LinkingRule {
    const shardData = shard.structuredData as any;
    const oppData = opportunity.structuredData as any;

    let matched = false;
    let confidence = 0;
    const details: any = {};

    // Check account ID
    if (shardData?.accountId && oppData?.accountId) {
      if (shardData.accountId === oppData.accountId) {
        matched = true;
        confidence += 0.5;
        details.accountId = true;
      }
    }

    // Check contact ID
    if (shardData?.contactId && oppData?.contactId) {
      if (shardData.contactId === oppData.contactId) {
        matched = true;
        confidence += 0.3;
        details.contactId = true;
      }
    }

    // Check company ID
    if (shardData?.companyId && oppData?.companyId) {
      if (shardData.companyId === oppData.companyId) {
        matched = true;
        confidence += 0.2;
        details.companyId = true;
      }
    }

    return {
      type: 'content',
      strength: confidence >= 0.5 ? 'strong' : confidence >= 0.3 ? 'medium' : 'weak',
      matched,
      confidence: Math.min(confidence, 1.0),
      details,
    };
  }

  /**
   * Check metadata overlap (owner, team, dates)
   */
  private checkMetadataOverlap(shard: Shard, opportunity: Shard): LinkingRule {
    const shardData = shard.structuredData as any;
    const oppData = opportunity.structuredData as any;

    let matched = false;
    let confidence = 0;
    const details: any = {};

    // Check owner ID
    if (shardData?.ownerId && oppData?.ownerId) {
      if (shardData.ownerId === oppData.ownerId) {
        matched = true;
        confidence += 0.4;
        details.ownerId = true;
      }
    }

    // Check team members overlap
    const shardTeam = shardData?.teamMembers || shardData?.team || [];
    const oppTeam = oppData?.teamMembers || oppData?.team || [];
    
    if (Array.isArray(shardTeam) && Array.isArray(oppTeam) && shardTeam.length > 0 && oppTeam.length > 0) {
      const shardTeamIds = shardTeam.map((m: any) => (typeof m === 'string' ? m : m.id));
      const oppTeamIds = oppTeam.map((m: any) => (typeof m === 'string' ? m : m.id));
      const overlap = shardTeamIds.filter((id: string) => oppTeamIds.includes(id));
      
      if (overlap.length > 0) {
        matched = true;
        confidence += 0.3 * (overlap.length / Math.max(shardTeamIds.length, oppTeamIds.length));
        details.teamOverlap = overlap.length;
      }
    }

    // Check date proximity (close date vs shard date)
    if (oppData?.closeDate && shard.createdAt) {
      const closeDate = new Date(oppData.closeDate);
      const shardDate = shard.createdAt;
      const daysDiff = Math.abs((closeDate.getTime() - shardDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 30) {
        matched = true;
        confidence += 0.2 * (1 - daysDiff / 30);
        details.dateProximity = daysDiff;
      }
    }

    return {
      type: 'metadata',
      strength: confidence >= 0.4 ? 'strong' : confidence >= 0.2 ? 'medium' : 'weak',
      matched,
      confidence: Math.min(confidence, 1.0),
      details,
    };
  }

  /**
   * Check temporal overlap (time window)
   */
  private checkTemporalOverlap(shard: Shard, opportunity: Shard): LinkingRule {
    const shardDate = shard.createdAt;
    const oppUpdated = opportunity.updatedAt || opportunity.createdAt;
    
    const daysDiff = Math.abs((shardDate.getTime() - oppUpdated.getTime()) / (1000 * 60 * 60 * 24));
    const withinWindow = daysDiff <= this.ACTIVITY_TIME_WINDOW_DAYS;
    
    const confidence = withinWindow ? Math.max(0, 1 - daysDiff / this.ACTIVITY_TIME_WINDOW_DAYS) : 0;

    return {
      type: 'temporal',
      strength: confidence >= 0.7 ? 'strong' : confidence >= 0.4 ? 'medium' : 'weak',
      matched: withinWindow,
      confidence,
      details: { daysDiff, withinWindow },
    };
  }

  /**
   * Check account-based linking (shard linked to same account as opportunity)
   */
  private async checkAccountBased(shard: Shard, opportunity: Shard): Promise<LinkingRule> {
    const oppData = opportunity.structuredData as any;
    const oppAccountId = oppData?.accountId;

    if (!oppAccountId) {
      return {
        type: 'account',
        strength: 'weak',
        matched: false,
        confidence: 0,
      };
    }

    // Check if shard is linked to the same account
    // This would require checking shard relationships
    // For now, check if shard has accountId in structuredData
    const shardData = shard.structuredData as any;
    const shardAccountId = shardData?.accountId;

    if (shardAccountId === oppAccountId) {
      return {
        type: 'account',
        strength: 'strong',
        matched: true,
        confidence: 0.8,
        details: { accountId: oppAccountId },
      };
    }

    // Check relationships (if shard is linked to account)
    try {
      const relatedShards = await this.relationshipService.getRelatedShards(
        shard.tenantId,
        shard.id,
        'outgoing',
        { limit: 100 }
      );

      const hasAccountLink = relatedShards.some((rel) => {
        const relShard = rel.shard;
        const relData = relShard.structuredData as any;
        return relShard.shardTypeId === 'c_account' && relData?.id === oppAccountId;
      });

      if (hasAccountLink) {
        return {
          type: 'account',
          strength: 'strong',
          matched: true,
          confidence: 0.7,
          details: { accountId: oppAccountId, viaRelationship: true },
        };
      }
    } catch (error) {
      // Relationship check failed, continue
    }

    return {
      type: 'account',
      strength: 'weak',
      matched: false,
      confidence: 0,
    };
  }

  /**
   * Calculate total confidence from rules
   */
  private calculateTotalConfidence(rules: LinkingRule[]): number {
    // Weighted average with higher weights for strong matches
    let totalWeight = 0;
    let weightedSum = 0;

    for (const rule of rules) {
      if (rule.matched) {
        const weight = rule.strength === 'strong' ? 3 : rule.strength === 'medium' ? 2 : 1;
        weightedSum += rule.confidence * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Link shard to opportunity
   */
  private async linkShardToOpportunity(
    shard: Shard,
    opportunity: Shard,
    rules: LinkingRule[],
    confidence: number
  ): Promise<void> {
    try {
      // Determine relationship type based on shard type
      const relationshipType = this.getRelationshipType(shard.shardTypeId);

      // Create bidirectional link
      // Get shard types for relationship
      const opportunityShardType = await this.shardTypeRepository.findById(opportunity.shardTypeId, shard.tenantId);
      const relatedShardType = await this.shardTypeRepository.findById(shard.shardTypeId, shard.tenantId);
      
      await this.relationshipService.createRelationship({
        tenantId: shard.tenantId,
        sourceShardId: opportunity.id,
        sourceShardTypeId: opportunity.shardTypeId,
        sourceShardTypeName: opportunityShardType?.name || 'Opportunity',
        targetShardId: shard.id,
        targetShardTypeId: shard.shardTypeId,
        targetShardTypeName: relatedShardType?.name || 'Shard',
        relationshipType,
        metadata: {
          source: 'manual' as const,
          confidence,
          rules: rules.filter((r) => r.matched).map((r) => ({
            type: r.type,
            strength: r.strength,
            confidence: r.confidence,
          })),
          linkedAt: new Date(),
        },
        createdBy: 'system',
      });

      this.monitoring.trackEvent('opportunity_auto_linking.linked', {
        opportunityId: opportunity.id,
        shardId: shard.id,
        shardTypeId: shard.shardTypeId,
        confidence,
        tenantId: shard.tenantId,
      });
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'OpportunityAutoLinkingService',
          operation: 'linkShardToOpportunity',
          opportunityId: opportunity.id,
          shardId: shard.id,
      });
      // Don't throw - log and continue
    }
  }

  /**
   * Get relationship type based on shard type
   */
  private getRelationshipType(shardTypeId: string): string {
    const typeMap: Record<string, string> = {
      'c_task': 'has_task',
      'c_document': 'has_document',
      'c_documentChunk': 'has_document',
      'c_account': 'opportunity_for',
      'c_company': 'opportunity_for',
      'c_contact': 'has_stakeholder',
      'c_note': 'has_note',
      'c_meeting': 'has_meeting',
      'c_call': 'has_call',
    };

    return typeMap[shardTypeId] || 'related_to';
  }

  /**
   * Check if shard is already linked to an opportunity
   */
  private isAlreadyLinkedToOpportunity(shard: Shard): boolean {
    const relationships = shard.internal_relationships || [];
    return relationships.some((rel) => {
      // Check if relationship is from an opportunity
      // This is a simplified check - in practice, you'd check the shard type
      return rel.shardTypeId === 'c_opportunity';
    });
  }
}

