/**
 * Suggested links API routes
 * @module integration-processors/routes/suggestedLinks
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware, ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { log } from '../utils/logger.js';
import { loadConfig } from '../config/index.js';

/**
 * Map shard type to relationship type for entity linking
 */
function getRelationshipType(sourceShardType: string, _targetShardType: string): string {
  const sourceTypeLower = sourceShardType.toLowerCase();

  // Map based on source shard type
  const relationshipMap: Record<string, string> = {
    document: 'attached_to',
    email: 'mentioned_in',
    message: 'mentioned_in',
    meeting: 'meeting_for',
    calendarevent: 'event_in_calendar',
  };

  // If source is a linkable type, use the mapped relationship
  if (relationshipMap[sourceTypeLower]) {
    return relationshipMap[sourceTypeLower];
  }

  // Default to related_to for other types
  return 'related_to';
}

/**
 * Create a relationship between two shards via shard-manager API
 */
async function createShardRelationship(
  shardManager: ServiceClient,
  sourceShardId: string,
  targetShardId: string,
  sourceShardType: string,
  targetShardType: string,
  tenantId: string,
  userId: string
): Promise<void> {
  const relationshipType = getRelationshipType(sourceShardType, targetShardType);

  await shardManager.post(
    '/api/v1/relationships',
    {
      sourceShardId,
      targetShardId,
      relationshipType,
      bidirectional: true,
      metadata: {
        autoLinked: false,
        source: 'suggested_link_approval',
        approvedBy: userId,
        approvedAt: new Date().toISOString(),
      },
    },
    {
      headers: {
        'X-Tenant-ID': tenantId,
      },
    }
  );
}

export async function suggestedLinksRoutes(app: FastifyInstance): Promise<void> {
  const config = loadConfig();
  const shardManagerUrl =
    config.services?.shard_manager?.url ?? process.env.SHARD_MANAGER_URL ?? '';
  const shardManager = new ServiceClient({ baseURL: shardManagerUrl });
  // Get pending suggested links
  app.get<{
    Querystring: {
      tenantId?: string;
      status?: string;
      limit?: number;
    };
  }>(
    '/suggested-links',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get pending suggested links',
        tags: ['Entity Linking'],
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            status: { type: 'string', enum: ['pending_review', 'approved', 'rejected', 'expired'], default: 'pending_review' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { status = 'pending_review', limit = 50 } = request.query;

      try {
        const container = getContainer('integration_suggested_links');
        const { resources } = await container.items
          .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status ORDER BY c.createdAt DESC',
            parameters: [
              { name: '@tenantId', value: tenantId },
              { name: '@status', value: status },
            ],
          })
          .fetchNext();

        return {
          links: (resources || []).slice(0, limit),
          total: resources?.length || 0,
        };
      } catch (error: any) {
        log.error('Failed to get suggested links', error, { tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to get suggested links' });
      }
    }
  );

  // Approve suggested link
  app.post<{
    Params: { id: string };
    Body: { userId?: string };
  }>(
    '/suggested-links/:id/approve',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Approve suggested link',
        tags: ['Entity Linking'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params;
      const userId = request.user!.id;

      try {
        const container = getContainer('integration_suggested_links');
        const { resource: link } = await container.item(id, tenantId).read();

        if (!link) {
          return reply.code(404).send({ error: 'Suggested link not found' });
        }

        // Validate link is in pending_review status
        if (link.status !== 'pending_review') {
          return reply.code(400).send({
            error: `Cannot approve link with status: ${link.status}. Only pending_review links can be approved.`,
          });
        }

        // Create relationship via shard-manager API
        try {
          await createShardRelationship(
            shardManager,
            link.sourceShardId,
            link.targetShardId,
            link.sourceShardType || 'unknown',
            link.targetShardTypeName || link.targetShardTypeId || 'unknown',
            tenantId,
            userId
          );
        } catch (error: any) {
          log.error('Failed to create relationship when approving suggested link', error, {
            linkId: id,
            sourceShardId: link.sourceShardId,
            targetShardId: link.targetShardId,
            tenantId,
            service: 'integration-processors',
          });

          // Check if relationship already exists (409 conflict)
          if (error.statusCode === 409 || error.message?.includes('already exists')) {
            // Relationship already exists, still mark as approved
            log.info('Relationship already exists, marking link as approved', {
              linkId: id,
              tenantId,
              service: 'integration-processors',
            });
          } else {
            // Other error - return error to user
            return reply.code(500).send({
              error: 'Failed to create relationship',
              details: error.message,
            });
          }
        }

        // Update link status to approved
        await container.item(id, tenantId).replace({
          ...link,
          status: 'approved',
          reviewedBy: userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        });

        return { success: true, link };
      } catch (error: any) {
        log.error('Failed to approve suggested link', error, { id, tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to approve suggested link' });
      }
    }
  );

  // Reject suggested link
  app.post<{
    Params: { id: string };
    Body: { userId?: string; reason?: string };
  }>(
    '/suggested-links/:id/reject',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Reject suggested link',
        tags: ['Entity Linking'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params;
      const userId = request.user!.id;
      const { reason } = request.body;

      try {
        const container = getContainer('integration_suggested_links');
        const { resource: link } = await container.item(id, tenantId).read();

        if (!link) {
          return reply.code(404).send({ error: 'Suggested link not found' });
        }

        // Validate link is in pending_review status
        if (link.status !== 'pending_review') {
          return reply.code(400).send({
            error: `Cannot reject link with status: ${link.status}. Only pending_review links can be rejected.`,
          });
        }

        // Update link status to rejected
        await container.item(id, tenantId).replace({
          ...link,
          status: 'rejected',
          reviewedBy: userId,
          reviewedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date(),
        });

        return { success: true };
      } catch (error: any) {
        log.error('Failed to reject suggested link', error, { id, tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to reject suggested link' });
      }
    }
  );
}
