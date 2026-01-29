/**
 * Entity Linking Configuration API routes
 * @module integration-processors/routes/entityLinking
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware, ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/logger';
import { loadConfig } from '../config';

/**
 * Entity linking settings interface
 */
interface EntityLinkingSettings {
  id?: string; // Cosmos document id when loaded from DB
  tenantId: string;
  autoLinkThreshold: number; // 0.0-1.0 (default 0.8)
  suggestedLinkThreshold: number; // 0.0-1.0 (default 0.6)
  enabledStrategies: {
    explicitReference: boolean; // Always enabled
    participantMatching: boolean;
    contentAnalysis: boolean;
    temporalCorrelation: boolean;
    vectorSimilarity: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Linking rule interface
 */
interface LinkingRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  condition: {
    sourceShardType: string;
    field: string;
    operator: 'equals' | 'contains' | 'matches' | 'startsWith' | 'endsWith';
    value: any;
  };
  action: {
    targetShardType: string;
    linkType: string;
    confidence: number;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_SETTINGS: Omit<EntityLinkingSettings, 'tenantId' | 'createdAt' | 'updatedAt'> = {
  autoLinkThreshold: 0.8,
  suggestedLinkThreshold: 0.6,
  enabledStrategies: {
    explicitReference: true, // Always enabled
    participantMatching: true,
    contentAnalysis: true,
    temporalCorrelation: true,
    vectorSimilarity: true,
  },
};

export async function entityLinkingRoutes(app: FastifyInstance): Promise<void> {
  const config = loadConfig();
  const shardManagerUrl =
    config.services?.shard_manager?.url ?? process.env.SHARD_MANAGER_URL ?? '';
  const shardManager = new ServiceClient({ baseURL: shardManagerUrl });

  // Get entity linking settings
  app.get(
    '/entity-linking/settings',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get entity linking settings',
        tags: ['Entity Linking'],
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              settings: { type: 'object' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      try {
        const container = getContainer('integration_entity_linking_settings');
        
        // Try to get existing settings
        const { resources } = await container.items
          .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
            parameters: [{ name: '@tenantId', value: tenantId }],
          })
          .fetchNext();

        if (resources && resources.length > 0) {
          return reply.send({ settings: resources[0] });
        }

        // Return default settings if none exist
        const defaultSettings: EntityLinkingSettings = {
          ...DEFAULT_SETTINGS,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return reply.send({ settings: defaultSettings });
      } catch (error: any) {
        log.error('Failed to get entity linking settings', error, { tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to get entity linking settings' });
      }
    }
  );

  // Update entity linking settings
  app.put<{
    Body: {
      autoLinkThreshold?: number;
      suggestedLinkThreshold?: number;
      enabledStrategies?: {
        explicitReference?: boolean;
        participantMatching?: boolean;
        contentAnalysis?: boolean;
        temporalCorrelation?: boolean;
        vectorSimilarity?: boolean;
      };
    };
  }>(
    '/entity-linking/settings',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update entity linking settings',
        tags: ['Entity Linking'],
        body: {
          type: 'object',
          properties: {
            autoLinkThreshold: { type: 'number', minimum: 0, maximum: 1 },
            suggestedLinkThreshold: { type: 'number', minimum: 0, maximum: 1 },
            enabledStrategies: {
              type: 'object',
              properties: {
                explicitReference: { type: 'boolean' },
                participantMatching: { type: 'boolean' },
                contentAnalysis: { type: 'boolean' },
                temporalCorrelation: { type: 'boolean' },
                vectorSimilarity: { type: 'boolean' },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              settings: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const body = request.body;

      try {
        const container = getContainer('integration_entity_linking_settings');

        // Get existing settings or create new
        const { resources } = await container.items
          .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
            parameters: [{ name: '@tenantId', value: tenantId }],
          })
          .fetchNext();

        let settings: EntityLinkingSettings;

        if (resources && resources.length > 0) {
          settings = resources[0] as EntityLinkingSettings;
          // Update existing settings
          settings = {
            ...settings,
            autoLinkThreshold: body.autoLinkThreshold ?? settings.autoLinkThreshold,
            suggestedLinkThreshold: body.suggestedLinkThreshold ?? settings.suggestedLinkThreshold,
            enabledStrategies: {
              ...settings.enabledStrategies,
              ...body.enabledStrategies,
              explicitReference: true, // Always enabled
            },
            updatedAt: new Date(),
          };

          await container.item(settings.id || tenantId, tenantId).replace(settings);
        } else {
          // Create new settings
          settings = {
            ...DEFAULT_SETTINGS,
            tenantId,
            autoLinkThreshold: body.autoLinkThreshold ?? DEFAULT_SETTINGS.autoLinkThreshold,
            suggestedLinkThreshold: body.suggestedLinkThreshold ?? DEFAULT_SETTINGS.suggestedLinkThreshold,
            enabledStrategies: {
              ...DEFAULT_SETTINGS.enabledStrategies,
              ...body.enabledStrategies,
              explicitReference: true, // Always enabled
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await container.items.create(settings, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);
        }

        return reply.send({ settings });
      } catch (error: any) {
        log.error('Failed to update entity linking settings', error, { tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to update entity linking settings' });
      }
    }
  );

  // Get suggested links (reuse existing endpoint but update path)
  app.get<{
    Querystring: {
      tenantId?: string;
      status?: string;
      limit?: number;
    };
  }>(
    '/entity-linking/suggested-links',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get suggested links (pending review)',
        tags: ['Entity Linking'],
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            status: { type: 'string', enum: ['pending_review', 'approved', 'rejected', 'expired'], default: 'pending_review' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              suggestedLinks: { type: 'array' },
            },
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

        return reply.send({
          suggestedLinks: (resources || []).slice(0, limit),
        });
      } catch (error: any) {
        log.error('Failed to get suggested links', error, { tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to get suggested links' });
      }
    }
  );

  // Approve suggested link
  app.post<{
    Params: { id: string };
  }>(
    '/entity-linking/suggested-links/:id/approve',
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
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              relationship: { type: 'object' },
            },
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

        if (link.status !== 'pending_review') {
          return reply.code(400).send({
            error: `Cannot approve link with status: ${link.status}. Only pending_review links can be approved.`,
          });
        }

        // Create relationship via shard-manager API
        const relationshipType = getRelationshipType(
          link.sourceShardType || 'unknown',
          link.targetShardTypeName || link.targetShardTypeId || 'unknown'
        );

        let relationship;
        try {
          const response = await shardManager.post(
            '/api/v1/relationships',
            {
              sourceShardId: link.sourceShardId,
              targetShardId: link.targetShardId,
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
          relationship = response.data;
        } catch (error: any) {
          if (error.statusCode === 409 || error.message?.includes('already exists')) {
            log.info('Relationship already exists, marking link as approved', {
              linkId: id,
              tenantId,
              service: 'integration-processors',
            });
          } else {
            log.error('Failed to create relationship when approving suggested link', error, {
              linkId: id,
              tenantId,
              service: 'integration-processors',
            });
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

        return reply.send({ success: true, relationship });
      } catch (error: any) {
        log.error('Failed to approve suggested link', error, { id, tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to approve suggested link' });
      }
    }
  );

  // Reject suggested link
  app.post<{
    Params: { id: string };
    Body: { reason?: string };
  }>(
    '/entity-linking/suggested-links/:id/reject',
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
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
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

        if (link.status !== 'pending_review') {
          return reply.code(400).send({
            error: `Cannot reject link with status: ${link.status}. Only pending_review links can be rejected.`,
          });
        }

        await container.item(id, tenantId).replace({
          ...link,
          status: 'rejected',
          reviewedBy: userId,
          reviewedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date(),
        });

        return reply.send({ success: true });
      } catch (error: any) {
        log.error('Failed to reject suggested link', error, { id, tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to reject suggested link' });
      }
    }
  );

  // Approve all suggested links
  app.post<{
    Body: {
      tenantId?: string;
      userId?: string;
    };
  }>(
    '/entity-linking/suggested-links/approve-all',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Approve all pending suggested links',
        tags: ['Entity Linking'],
        body: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            userId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              approved: { type: 'number' },
              failed: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      try {
        const container = getContainer('integration_suggested_links');
        const { resources } = await container.items
          .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
            parameters: [
              { name: '@tenantId', value: tenantId },
              { name: '@status', value: 'pending_review' },
            ],
          })
          .fetchNext();

        let approved = 0;
        let failed = 0;

        for (const link of resources || []) {
          try {
            // Create relationship
            const relationshipType = getRelationshipType(
              link.sourceShardType || 'unknown',
              link.targetShardTypeName || link.targetShardTypeId || 'unknown'
            );

            try {
              await shardManager.post(
                '/api/v1/relationships',
                {
                  sourceShardId: link.sourceShardId,
                  targetShardId: link.targetShardId,
                  relationshipType,
                  bidirectional: true,
                  metadata: {
                    autoLinked: false,
                    source: 'suggested_link_approval_all',
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
            } catch (error: any) {
              if (error.statusCode === 409 || error.message?.includes('already exists')) {
                // Relationship already exists, continue
              } else {
                throw error;
              }
            }

            // Update link status
            await container.item(link.id, tenantId).replace({
              ...link,
              status: 'approved',
              reviewedBy: userId,
              reviewedAt: new Date(),
              updatedAt: new Date(),
            });

            approved++;
          } catch (error: any) {
            log.error('Failed to approve suggested link in batch', error, {
              linkId: link.id,
              tenantId,
              service: 'integration-processors',
            });
            failed++;
          }
        }

        return reply.send({ approved, failed });
      } catch (error: any) {
        log.error('Failed to approve all suggested links', error, { tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to approve all suggested links' });
      }
    }
  );

  // Get linking rules
  app.get(
    '/entity-linking/rules',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get linking rules',
        tags: ['Entity Linking'],
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              rules: { type: 'array' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      try {
        const container = getContainer('integration_linking_rules');
        const { resources } = await container.items
          .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@tenantId', value: tenantId }],
          })
          .fetchNext();

        return reply.send({ rules: resources || [] });
      } catch (error: any) {
        log.error('Failed to get linking rules', error, { tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to get linking rules' });
      }
    }
  );

  // Create linking rule
  app.post<{
    Body: {
      name: string;
      description?: string;
      condition: {
        sourceShardType: string;
        field: string;
        operator: 'equals' | 'contains' | 'matches' | 'startsWith' | 'endsWith';
        value: any;
      };
      action: {
        targetShardType: string;
        linkType: string;
        confidence: number;
      };
      enabled?: boolean;
    };
  }>(
    '/entity-linking/rules',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create linking rule',
        tags: ['Entity Linking'],
        body: {
          type: 'object',
          required: ['name', 'condition', 'action'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            condition: {
              type: 'object',
              required: ['sourceShardType', 'field', 'operator', 'value'],
              properties: {
                sourceShardType: { type: 'string' },
                field: { type: 'string' },
                operator: { type: 'string', enum: ['equals', 'contains', 'matches', 'startsWith', 'endsWith'] },
                value: {},
              },
            },
            action: {
              type: 'object',
              required: ['targetShardType', 'linkType', 'confidence'],
              properties: {
                targetShardType: { type: 'string' },
                linkType: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
              },
            },
            enabled: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              rule: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const body = request.body;

      try {
        const container = getContainer('integration_linking_rules');

        const rule: LinkingRule = {
          id: uuidv4(),
          tenantId,
          name: body.name,
          description: body.description,
          condition: body.condition,
          action: body.action,
          enabled: body.enabled ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await container.items.create(rule, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);

        return reply.code(201).send({ rule });
      } catch (error: any) {
        log.error('Failed to create linking rule', error, { tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to create linking rule' });
      }
    }
  );
}

/**
 * Map shard type to relationship type for entity linking
 */
function getRelationshipType(sourceShardType: string, _targetShardType: string): string {
  const sourceTypeLower = sourceShardType.toLowerCase();
  const relationshipMap: Record<string, string> = {
    document: 'attached_to',
    email: 'mentioned_in',
    message: 'mentioned_in',
    meeting: 'meeting_for',
    calendarevent: 'event_in_calendar',
  };

  if (relationshipMap[sourceTypeLower]) {
    return relationshipMap[sourceTypeLower];
  }

  return 'related_to';
}
