/**
 * Shard Linking Service
 * Manages project-specific shard links with enhanced features
 */

import { getContainer } from '@coder/shared/database';
import { log } from '@coder/shared/utils/logger';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ShardService } from './ShardService';
import {
  ShardLink,
  CreateLinkInput,
  UpdateLinkInput,
  BulkLinkInput,
  BulkLinkResult,
  LinkFilterOptions,
  LinkValidationResult,
  LinkRelationshipType,
} from '../types/shard-linking.types';
import { v4 as uuidv4 } from 'uuid';

export class ShardLinkingService {
  private containerName = 'shard_links';
  private shardService: ShardService;

  constructor(shardService: ShardService) {
    this.shardService = shardService;
  }

  /**
   * Get container instance
   */
  private async getContainer() {
    return getContainer(this.containerName);
  }

  /**
   * Initialize container
   */
  async initialize(): Promise<void> {
    try {
      await this.getContainer();
      log.info('Shard linking container ensured', { service: 'shard-manager' });
    } catch (error: any) {
      log.error('Failed to ensure shard linking container', error, { service: 'shard-manager' });
      throw error;
    }
  }

  /**
   * Validate a link before creation
   */
  async validateLink(
    tenantId: string,
    projectId: string,
    input: CreateLinkInput
  ): Promise<LinkValidationResult> {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Validate shards exist
    try {
      const fromShard = await this.shardService.findById(input.fromShardId, tenantId);
      if (!fromShard) {
        errors.push({ field: 'fromShardId', message: 'Source shard not found' });
      }
    } catch {
      errors.push({ field: 'fromShardId', message: 'Source shard not found' });
    }

    try {
      const toShard = await this.shardService.findById(input.toShardId, tenantId);
      if (!toShard) {
        errors.push({ field: 'toShardId', message: 'Target shard not found' });
      }
    } catch {
      errors.push({ field: 'toShardId', message: 'Target shard not found' });
    }

    // Validate self-link
    if (input.fromShardId === input.toShardId) {
      errors.push({ field: 'toShardId', message: 'Cannot link shard to itself' });
    }

    // Validate strength
    if (input.strength !== undefined && (input.strength < 0 || input.strength > 1)) {
      errors.push({ field: 'strength', message: 'Strength must be between 0 and 1' });
    }

    // Check for duplicate link
    const existing = await this.findLinkBetween(
      tenantId,
      projectId,
      input.fromShardId,
      input.toShardId,
      input.relationshipType
    );
    if (existing) {
      warnings.push({
        field: 'relationshipType',
        message: 'A link with this relationship type already exists',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Create a single link between two shards
   */
  async createLink(
    tenantId: string,
    projectId: string,
    input: CreateLinkInput,
    createdByUserId: string
  ): Promise<ShardLink> {
    // Validate input
    const validation = await this.validateLink(tenantId, projectId, input);
    if (!validation.isValid) {
      throw new BadRequestError(
        `Link validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Get shard details for denormalization
    const [fromShard, toShard] = await Promise.all([
      this.shardService.findById(input.fromShardId, tenantId),
      this.shardService.findById(input.toShardId, tenantId),
    ]);

    if (!fromShard || !toShard) {
      throw new NotFoundError('Shard', '');
    }

    const container = await this.getContainer();

    const link: ShardLink = {
      id: uuidv4(),
      tenantId,
      projectId,
      fromShardId: input.fromShardId,
      fromShardName: (fromShard.structuredData as any)?.name || (fromShard.structuredData as any)?.title,
      fromShardType: fromShard.shardTypeId,
      toShardId: input.toShardId,
      toShardName: (toShard.structuredData as any)?.name || (toShard.structuredData as any)?.title,
      toShardType: toShard.shardTypeId,
      relationshipType: input.relationshipType,
      customLabel: input.customLabel,
      description: input.description,
      strength: input.strength ?? 1.0,
      createdBy: createdByUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: createdByUserId,
      isActive: true,
      isBidirectional: input.isBidirectional ?? false,
      priority: input.priority,
      tags: input.tags,
      metadata: {
        accessCount: 0,
        aiSuggestable: true,
      },
    };

    const { resource } = await container.items.create<ShardLink>(link);

    // Create reverse link if bidirectional
    if (link.isBidirectional) {
      const reverseLink: ShardLink = {
        ...link,
        id: uuidv4(),
        fromShardId: input.toShardId,
        fromShardName: link.toShardName,
        fromShardType: link.toShardType,
        toShardId: input.fromShardId,
        toShardName: link.fromShardName,
        toShardType: link.fromShardType,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await container.items.create<ShardLink>(reverseLink);
    }

    log.info('Shard link created', {
      service: 'shard-manager',
      linkId: link.id,
      tenantId,
      projectId,
    });

    return resource as ShardLink;
  }

  /**
   * Get a link by ID
   */
  async getLink(tenantId: string, projectId: string, linkId: string): Promise<ShardLink | null> {
    try {
      const container = await this.getContainer();
      const { resource } = await container.item(linkId, tenantId).read<ShardLink>();
      
      // Verify it belongs to the project
      if (resource && resource.projectId === projectId) {
        return resource;
      }
      
      return null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      log.error('Failed to get shard link', error, {
        service: 'shard-manager',
        linkId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find link between two shards
   */
  async findLinkBetween(
    tenantId: string,
    projectId: string,
    fromShardId: string,
    toShardId: string,
    relationshipType?: LinkRelationshipType
  ): Promise<ShardLink | null> {
    try {
      const container = await this.getContainer();
      
      let query = `
        SELECT * FROM l 
        WHERE l.tenantId = @tenantId 
          AND l.projectId = @projectId
          AND l.fromShardId = @fromShardId
          AND l.toShardId = @toShardId
          AND l.isActive = true
      `;
      const parameters: { name: string; value: any }[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@projectId', value: projectId },
        { name: '@fromShardId', value: fromShardId },
        { name: '@toShardId', value: toShardId },
      ];

      if (relationshipType) {
        query += ' AND l.relationshipType = @relationshipType';
        parameters.push({ name: '@relationshipType', value: relationshipType });
      }

      const { resources } = await container.items
        .query<ShardLink>({ query, parameters })
        .fetchAll();

      return resources[0] || null;
    } catch (error: any) {
      log.error('Failed to find link between shards', error, {
        service: 'shard-manager',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Get links for a shard
   */
  async getLinksForShard(
    tenantId: string,
    projectId: string,
    shardId: string,
    options?: LinkFilterOptions
  ): Promise<ShardLink[]> {
    try {
      const container = await this.getContainer();
      
      const queryParts: string[] = [
        'l.tenantId = @tenantId',
        'l.projectId = @projectId',
        '(l.fromShardId = @shardId OR l.toShardId = @shardId)',
      ];
      
      const parameters: { name: string; value: any }[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@projectId', value: projectId },
        { name: '@shardId', value: shardId },
      ];

      if (!options?.includeInactive) {
        queryParts.push('l.isActive = true');
      }

      if (options?.relationshipType) {
        queryParts.push('l.relationshipType = @relationshipType');
        parameters.push({ name: '@relationshipType', value: options.relationshipType });
      }

      if (options?.fromShardId) {
        queryParts.push('l.fromShardId = @fromShardId');
        parameters.push({ name: '@fromShardId', value: options.fromShardId });
      }

      if (options?.toShardId) {
        queryParts.push('l.toShardId = @toShardId');
        parameters.push({ name: '@toShardId', value: options.toShardId });
      }

      const query = `SELECT * FROM l WHERE ${queryParts.join(' AND ')} ORDER BY l.createdAt DESC`;

      const { resources } = await container.items
        .query<ShardLink>({ query, parameters }, { maxItemCount: options?.limit || 100 })
        .fetchAll();

      return resources;
    } catch (error: any) {
      log.error('Failed to get links for shard', error, {
        service: 'shard-manager',
        tenantId,
        shardId,
      });
      throw error;
    }
  }

  /**
   * Update an existing link
   */
  async updateLink(
    tenantId: string,
    projectId: string,
    linkId: string,
    input: UpdateLinkInput,
    updatedByUserId: string
  ): Promise<ShardLink> {
    const link = await this.getLink(tenantId, projectId, linkId);
    if (!link) {
      throw new NotFoundError('Link', linkId);
    }

    // Update fields
    if (input.relationshipType !== undefined) {
      link.relationshipType = input.relationshipType;
    }
    if (input.customLabel !== undefined) {
      link.customLabel = input.customLabel;
    }
    if (input.description !== undefined) {
      link.description = input.description;
    }
    if (input.strength !== undefined) {
      link.strength = input.strength;
    }
    if (input.priority !== undefined) {
      link.priority = input.priority;
    }
    if (input.tags !== undefined) {
      link.tags = input.tags;
    }
    if (input.isBidirectional !== undefined) {
      link.isBidirectional = input.isBidirectional;
    }

    link.updatedAt = new Date();
    link.updatedBy = updatedByUserId;

    const container = await this.getContainer();
    const { resource } = await container.item(linkId, tenantId).replace<ShardLink>(link);

    log.info('Shard link updated', {
      service: 'shard-manager',
      linkId,
      tenantId,
    });

    return resource as ShardLink;
  }

  /**
   * Delete a link (soft delete)
   */
  async deleteLink(
    tenantId: string,
    projectId: string,
    linkId: string,
    deletedByUserId: string
  ): Promise<void> {
    const link = await this.getLink(tenantId, projectId, linkId);
    if (!link) {
      throw new NotFoundError('Link', linkId);
    }

    // Mark as inactive (soft delete)
    link.isActive = false;
    link.updatedAt = new Date();
    link.updatedBy = deletedByUserId;

    const container = await this.getContainer();
    await container.item(linkId, tenantId).replace<ShardLink>(link);

    // If bidirectional, also deactivate reverse link
    if (link.isBidirectional) {
      const reverseLink = await this.findLinkBetween(
        tenantId,
        projectId,
        link.toShardId,
        link.fromShardId,
        link.relationshipType
      );
      if (reverseLink) {
        reverseLink.isActive = false;
        reverseLink.updatedAt = new Date();
        reverseLink.updatedBy = deletedByUserId;
        await container.item(reverseLink.id, tenantId).replace<ShardLink>(reverseLink);
      }
    }

    log.info('Shard link deleted', {
      service: 'shard-manager',
      linkId,
      tenantId,
    });
  }

  /**
   * Bulk create links
   */
  async bulkCreateLinks(
    tenantId: string,
    input: BulkLinkInput,
    createdByUserId: string
  ): Promise<BulkLinkResult> {
    const linkIds: string[] = [];
    const failures: BulkLinkResult['failures'] = [];

    for (let i = 0; i < input.links.length; i++) {
      try {
        const link = await this.createLink(
          tenantId,
          input.projectId,
          input.links[i],
          createdByUserId
        );
        linkIds.push(link.id);
      } catch (error: any) {
        failures.push({
          index: i,
          fromShardId: input.links[i].fromShardId,
          toShardId: input.links[i].toShardId,
          error: error.message || String(error),
        });
      }
    }

    const result: BulkLinkResult = {
      createdCount: linkIds.length,
      failureCount: failures.length,
      linkIds,
      failures,
      timestamp: new Date(),
    };

    log.info('Bulk links created', {
      service: 'shard-manager',
      tenantId,
      createdCount: result.createdCount,
      failureCount: result.failureCount,
    });

    return result;
  }
}
