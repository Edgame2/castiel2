import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { EmbeddingTemplate } from '../types/embedding-template.types.js';

interface GetTemplateParams { shardTypeId: string }
interface UpdateTemplateParams { shardTypeId: string }

export async function registerEmbeddingTemplateRoutes(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<void> {
  const shardTypeRepository = (server as any).shardTypeRepository;

  if (!shardTypeRepository) {
    server.log.warn('⚠️ Embedding template routes not registered - ShardTypeRepository missing');
    return;
  }

  // GET /api/v1/shard-types/:shardTypeId/embedding-template
  server.get<{ Params: GetTemplateParams }>(
    '/shard-types/:shardTypeId/embedding-template',
    {
      schema: {
        description: 'Get embedding template for a shard type',
        tags: ['Embeddings'],
        params: {
          type: 'object',
          required: ['shardTypeId'],
          properties: { shardTypeId: { type: 'string' } },
        },
      },
    },
    async (req: FastifyRequest<{ Params: GetTemplateParams }>, reply: FastifyReply) => {
      try {
        const user = (req as any).user;
        if (!user?.tenantId) {return reply.code(401).send({ error: 'Unauthorized' });}

        const template = await shardTypeRepository.getEmbeddingTemplate(req.params.shardTypeId, user.tenantId);
        return reply.code(200).send({
          shardTypeId: req.params.shardTypeId,
          template: template || null,
          isDefault: !template,
        });
      } catch (error) {
        monitoring.trackException(error as Error, { component: 'EmbeddingTemplateRoutes', operation: 'get' });
        return reply.code(500).send({ error: 'Failed to get embedding template' });
      }
    }
  );

  // PUT /api/v1/shard-types/:shardTypeId/embedding-template
  server.put<{ Params: UpdateTemplateParams; Body: EmbeddingTemplate }>(
    '/shard-types/:shardTypeId/embedding-template',
    {
      schema: {
        description: 'Set or update embedding template for a shard type',
        tags: ['Embeddings'],
        params: {
          type: 'object',
          required: ['shardTypeId'],
          properties: { shardTypeId: { type: 'string' } },
        },
      },
    },
    async (req: FastifyRequest<{ Params: UpdateTemplateParams; Body: EmbeddingTemplate }>, reply: FastifyReply) => {
      try {
        const user = (req as any).user;
        if (!user?.tenantId) {return reply.code(401).send({ error: 'Unauthorized' });}
        // Basic admin check (adjust as needed)
        if (!user.roles?.includes('admin') && !user.roles?.includes('super_admin')) {
          return reply.code(403).send({ error: 'Forbidden' });
        }

        const updated = await shardTypeRepository.updateEmbeddingTemplate(
          req.params.shardTypeId,
          user.tenantId,
          req.body
        );

        monitoring.trackEvent('embeddingTemplate.updated.viaApi', {
          shardTypeId: req.params.shardTypeId,
          tenantId: user.tenantId,
        });

        return reply.code(200).send({ success: true, shardType: updated });
      } catch (error) {
        monitoring.trackException(error as Error, { component: 'EmbeddingTemplateRoutes', operation: 'update' });
        return reply.code(500).send({ error: 'Failed to update embedding template' });
      }
    }
  );

  // GET /api/v1/embedding-templates
  server.get('/embedding-templates',
    {
      schema: {
        description: 'List shard types with custom embedding templates for the tenant',
        tags: ['Embeddings'],
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (req as any).user;
        if (!user?.tenantId) {return reply.code(401).send({ error: 'Unauthorized' });}

        const list = await shardTypeRepository.listWithEmbeddingTemplates(user.tenantId);
        return reply.code(200).send({ items: list, count: list.length });
      } catch (error) {
        monitoring.trackException(error as Error, { component: 'EmbeddingTemplateRoutes', operation: 'list' });
        return reply.code(500).send({ error: 'Failed to list embedding templates' });
      }
    }
  );

  server.log.info('✅ Embedding Template routes registered');
}
