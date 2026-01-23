/**
 * Vault Configuration API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { VaultService } from '../services/VaultService';
import { z } from 'zod';

const createVaultSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  backend: z.enum([
    'LOCAL_ENCRYPTED',
    'AZURE_KEY_VAULT',
    'AWS_SECRETS_MANAGER',
    'HASHICORP_VAULT',
    'GCP_SECRET_MANAGER',
  ]),
  scope: z.enum(['GLOBAL', 'ORGANIZATION']),
  organizationId: z.string().optional(),
  config: z.any(), // BackendConfig
  isDefault: z.boolean().optional(),
});

const updateVaultSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  config: z.any().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export async function vaultRoutes(fastify: FastifyInstance) {
  const vaultService = new VaultService();

  // List vaults
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const query = request.query as { scope?: string; organizationId?: string };
      
      const vaults = await vaultService.listVaults({
        scope: query.scope as any,
        organizationId: query.organizationId || user.organizationId,
      });
      reply.send(vaults);
    } catch (error: any) {
      throw error;
    }
  });

  // Create vault
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const body = createVaultSchema.parse(request.body);
      
      const vault = await vaultService.createVault(body, user.id);
      reply.code(201).send(vault);
    } catch (error: any) {
      throw error;
    }
  });

  // Get vault
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const vault = await vaultService.getVault(id);
      reply.send(vault);
    } catch (error: any) {
      throw error;
    }
  });

  // Update vault
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateVaultSchema.parse(request.body);
      
      const vault = await vaultService.updateVault(id, body);
      reply.send(vault);
    } catch (error: any) {
      throw error;
    }
  });

  // Delete vault
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      await vaultService.deleteVault(id);
      reply.code(204).send();
    } catch (error: any) {
      throw error;
    }
  });

  // Health check
  fastify.post('/:id/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const result = await vaultService.healthCheck(id);
      reply.send(result);
    } catch (error: any) {
      throw error;
    }
  });

  // Set as default
  fastify.post('/:id/default', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const vault = await vaultService.updateVault(id, { isDefault: true });
      reply.send(vault);
    } catch (error: any) {
      throw error;
    }
  });
}
