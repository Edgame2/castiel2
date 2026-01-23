/**
 * Project Auto-Attachment Service (Phase 2)
 * 
 * Automatically links shards to projects based on overlap rules:
 * - Entity overlap: Same company, contact, account IDs
 * - Actor overlap: Same user IDs, team members
 * - Time windows: Shards created within 30 days of project activity
 * - Explicit references: Shard content mentions project name/ID
 * 
 * Trigger: Service Bus events (shard-created) or Change Feed
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import type { Shard, InternalRelationship } from '../types/shard.types.js';
import { ShardStatus } from '../types/shard.types.js';
// Service Bus removed - replaced by BullMQ/Redis
// Legacy Service Bus config removed

interface AutoAttachmentConfig {
  // Service Bus config removed - use QueueService instead
}

interface OverlapRule {
  type: 'entity' | 'actor' | 'time' | 'explicit';
  strength: 'strong' | 'weak';
  matched: boolean;
  details?: any;
}

export class ProjectAutoAttachmentService {
  private shardRepository: ShardRepository;
  private monitoring: IMonitoringProvider;
  private config: AutoAttachmentConfig;

  // Time window for activity-based attachment (30 days)
  private readonly ACTIVITY_TIME_WINDOW_DAYS = 30;

  constructor(
    monitoring: IMonitoringProvider,
    shardRepository: ShardRepository,
    config: AutoAttachmentConfig = {}
  ) {
    this.monitoring = monitoring;
    this.shardRepository = shardRepository;
    this.config = config;
  }

  /**
   * Process shard creation event and auto-attach to projects
   */
  async processShardCreated(shard: Shard): Promise<void> {
    const startTime = Date.now();

    try {
      // Find candidate projects
      const candidateProjects = await this.findCandidateProjects(shard);

      if (candidateProjects.length === 0) {
        this.monitoring.trackEvent('project_auto_attachment.no_candidates', {
          shardId: shard.id,
          tenantId: shard.tenantId,
        });
        return;
      }

      // Evaluate overlap rules for each candidate
      const attachments: Array<{ projectId: string; rules: OverlapRule[] }> = [];

      for (const project of candidateProjects) {
        const rules = await this.evaluateOverlapRules(shard, project);
        const strongSignals = rules.filter(r => r.strength === 'strong' && r.matched);

        // Auto-attach if any strong signal exists
        if (strongSignals.length > 0) {
          attachments.push({ projectId: project.id, rules });
        }
      }

      // Attach shard to projects
      for (const attachment of attachments) {
        await this.attachShardToProject(shard, attachment.projectId, attachment.rules);
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('project_auto_attachment.completed', {
        shardId: shard.id,
        tenantId: shard.tenantId,
        projectCount: attachments.length,
        duration,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        component: 'ProjectAutoAttachmentService',
        operation: 'processShardCreated',
        shardId: shard.id,
      });
      throw error;
    }
  }

  /**
   * Find candidate projects for auto-attachment
   */
  private async findCandidateProjects(shard: Shard): Promise<Shard[]> {
    // Get all active projects for the tenant
    const projects = await this.shardRepository.findByShardType(
      'c_project',
      shard.tenantId,
      { 
        statusFilter: [ShardStatus.ACTIVE],
        limit: 1000, // Reasonable limit for projects per tenant
      }
    );

    // Filter to projects that might be relevant
    // For now, return all projects (could be optimized with pre-filtering)
    return projects;
  }

  /**
   * Evaluate overlap rules between shard and project
   */
  private async evaluateOverlapRules(shard: Shard, project: Shard): Promise<OverlapRule[]> {
    const rules: OverlapRule[] = [];

    // Rule 1: Entity overlap
    const entityOverlap = this.checkEntityOverlap(shard, project);
    rules.push(entityOverlap);

    // Rule 2: Actor overlap
    const actorOverlap = this.checkActorOverlap(shard, project);
    rules.push(actorOverlap);

    // Rule 3: Time window overlap
    const timeOverlap = this.checkTimeWindowOverlap(shard, project);
    rules.push(timeOverlap);

    // Rule 4: Explicit references
    const explicitRef = await this.checkExplicitReferences(shard, project);
    rules.push(explicitRef);

    return rules;
  }

  /**
   * Check entity overlap (same company, contact, account IDs)
   */
  private checkEntityOverlap(shard: Shard, project: Shard): OverlapRule {
    const shardData = shard.structuredData || {};
    const projectData = project.structuredData || {};

    // Check for matching account/company IDs
    const shardAccountId = shardData.accountId || shardData.companyId;
    const projectAccountId = projectData.accountId || projectData.companyId;

    if (shardAccountId && projectAccountId && shardAccountId === projectAccountId) {
      return {
        type: 'entity',
        strength: 'strong',
        matched: true,
        details: { accountId: shardAccountId },
      };
    }

    // Check for matching contact IDs
    const shardContactId = shardData.contactId;
    const projectContactId = projectData.contactId;

    if (shardContactId && projectContactId && shardContactId === projectContactId) {
      return {
        type: 'entity',
        strength: 'strong',
        matched: true,
        details: { contactId: shardContactId },
      };
    }

    return {
      type: 'entity',
      strength: 'strong',
      matched: false,
    };
  }

  /**
   * Check actor overlap (same user IDs, team members)
   */
  private checkActorOverlap(shard: Shard, project: Shard): OverlapRule {
    const shardData = shard.structuredData || {};
    const projectData = project.structuredData || {};

    // Check owner/assignee overlap
    const shardOwnerId = shardData.ownerId || shard.userId;
    const projectOwnerId = projectData.ownerId || projectData.managerId || project.userId;

    if (shardOwnerId && projectOwnerId && shardOwnerId === projectOwnerId) {
      return {
        type: 'actor',
        strength: 'strong',
        matched: true,
        details: { userId: shardOwnerId },
      };
    }

    // Check team member overlap
    const shardTeamMembers = shardData.teamMembers || shardData.assignees || [];
    const projectTeamMembers = projectData.teamMembers || projectData.members || [];

    if (Array.isArray(shardTeamMembers) && Array.isArray(projectTeamMembers)) {
      const overlap = shardTeamMembers.some(member => 
        projectTeamMembers.some(pm => 
          (typeof member === 'string' ? member : member.userId || member.id) ===
          (typeof pm === 'string' ? pm : pm.userId || pm.id)
        )
      );

      if (overlap) {
        return {
          type: 'actor',
          strength: 'strong',
          matched: true,
          details: { teamMemberOverlap: true },
        };
      }
    }

    return {
      type: 'actor',
      strength: 'strong',
      matched: false,
    };
  }

  /**
   * Check time window overlap (shards created within 30 days of project activity)
   */
  private checkTimeWindowOverlap(shard: Shard, project: Shard): OverlapRule {
    const shardCreatedAt = new Date(shard.createdAt);
    const projectLastActivity = project.lastActivityAt 
      ? new Date(project.lastActivityAt)
      : new Date(project.updatedAt);

    const daysDiff = (shardCreatedAt.getTime() - projectLastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (Math.abs(daysDiff) <= this.ACTIVITY_TIME_WINDOW_DAYS) {
      return {
        type: 'time',
        strength: 'weak',
        matched: true,
        details: { daysDiff: Math.abs(daysDiff) },
      };
    }

    return {
      type: 'time',
      strength: 'weak',
      matched: false,
    };
  }

  /**
   * Check explicit references (shard content mentions project name/ID)
   */
  private async checkExplicitReferences(shard: Shard, project: Shard): Promise<OverlapRule> {
    const projectData = project.structuredData || {};
    const projectName = projectData.name || projectData.title || '';
    const projectId = project.id;

    // Check shard structured data
    const shardData = shard.structuredData || {};
    const shardText = JSON.stringify(shardData).toLowerCase();
    const projectNameLower = projectName.toLowerCase();

    if (projectName && shardText.includes(projectNameLower)) {
      return {
        type: 'explicit',
        strength: 'strong',
        matched: true,
        details: { referenceType: 'name' },
      };
    }

    // Check unstructured data
    if (shard.unstructuredData?.text) {
      const unstructuredText = shard.unstructuredData.text.toLowerCase();
      if (projectName && unstructuredText.includes(projectNameLower)) {
        return {
          type: 'explicit',
          strength: 'strong',
          matched: true,
          details: { referenceType: 'name' },
        };
      }
    }

    // Check for project ID reference
    if (shardText.includes(projectId)) {
      return {
        type: 'explicit',
        strength: 'strong',
        matched: true,
        details: { referenceType: 'id' },
      };
    }

    return {
      type: 'explicit',
      strength: 'strong',
      matched: false,
    };
  }

  /**
   * Attach shard to project with relationship metadata
   */
  private async attachShardToProject(
    shard: Shard,
    projectId: string,
    rules: OverlapRule[]
  ): Promise<void> {
    const strongRules = rules.filter(r => r.strength === 'strong' && r.matched);
    const confidence = strongRules.length > 0 ? 0.9 : 0.6; // High confidence for strong signals

    // Get project to get its name
    const project = await this.shardRepository.findById(projectId, shard.tenantId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Build relationship metadata
    const metadata = {
      confidence,
      source: 'manual' as const,
      extractionMethod: 'overlap-rules',
      extractedAt: new Date(),
      rules: strongRules.map(r => ({
        type: r.type,
        strength: r.strength,
        details: r.details,
      })),
    } as any;

    // Create relationship from shard to project
    const relationship: InternalRelationship = {
      shardId: projectId,
      shardTypeId: 'c_project',
      shardTypeName: 'Project',
      shardName: (project.structuredData as any)?.name || 'Project',
      createdAt: new Date(),
      metadata,
    };

    // Update shard with relationship
    const existingRelationships = shard.internal_relationships || [];
    const updatedRelationships = [...existingRelationships];

    // Check if relationship already exists
    const existingIndex = updatedRelationships.findIndex(r => r.shardId === projectId);
    if (existingIndex >= 0) {
      // Update existing relationship
      updatedRelationships[existingIndex] = relationship;
    } else {
      // Add new relationship
      updatedRelationships.push(relationship);
    }

    await this.shardRepository.update(shard.id, shard.tenantId, {
      internal_relationships: updatedRelationships,
    });

    this.monitoring.trackEvent('project_auto_attachment.attached', {
      shardId: shard.id,
      projectId,
      confidence,
      ruleCount: strongRules.length,
    });
  }

  /**
   * Manual link/unlink via API
   */
  async linkShardToProject(
    shardId: string,
    projectId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const shard = await this.shardRepository.findById(shardId, tenantId);
    if (!shard) {
      throw new Error('Shard not found');
    }

    const project = await this.shardRepository.findById(projectId, tenantId);
    if (!project) {
      throw new Error('Project not found');
    }

    const relationship: InternalRelationship = {
      shardId: projectId,
      shardTypeId: 'c_project',
      shardTypeName: 'Project',
      shardName: (project.structuredData as any)?.name || 'Project',
      createdAt: new Date(),
      metadata: {
        confidence: 1.0,
        source: 'manual',
        verified: true,
        verifiedBy: userId,
        verifiedAt: new Date(),
      },
    };

    const existingRelationships = shard.internal_relationships || [];
    const updatedRelationships = [...existingRelationships];

    const existingIndex = updatedRelationships.findIndex(r => r.shardId === projectId);
    if (existingIndex >= 0) {
      updatedRelationships[existingIndex] = relationship;
    } else {
      updatedRelationships.push(relationship);
    }

    await this.shardRepository.update(shardId, tenantId, {
      internal_relationships: updatedRelationships,
    });
  }

  /**
   * Unlink shard from project
   */
  async unlinkShardFromProject(
    shardId: string,
    projectId: string,
    tenantId: string
  ): Promise<void> {
    const shard = await this.shardRepository.findById(shardId, tenantId);
    if (!shard) {
      throw new Error('Shard not found');
    }

    const existingRelationships = shard.internal_relationships || [];
    const updatedRelationships = existingRelationships.filter(r => r.shardId !== projectId);

    await this.shardRepository.update(shardId, tenantId, {
      internal_relationships: updatedRelationships,
    });
  }
}

