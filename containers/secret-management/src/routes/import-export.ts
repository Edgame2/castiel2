/**
 * Import/Export API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ImportService } from '../services/import/ImportService';
import { ExportService } from '../services/export/ExportService';
import { MigrationService } from '../services/migration/MigrationService';
import { z } from 'zod';

const importSchema = z.object({
  format: z.enum(['env', 'json']),
  data: z.string(),
  scope: z.enum(['GLOBAL', 'ORGANIZATION', 'TEAM', 'PROJECT', 'USER']),
  organizationId: z.string().optional(),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
});

const exportSchema = z.object({
  format: z.enum(['env', 'json']),
  scope: z.enum(['GLOBAL', 'ORGANIZATION', 'TEAM', 'PROJECT', 'USER']).optional(),
  includeValues: z.boolean().optional(),
  organizationId: z.string().optional(),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
});

const migrateSchema = z.object({
  sourceVaultId: z.string(),
  targetVaultId: z.string(),
  secretIds: z.array(z.string()).optional(),
});

export async function importExportRoutes(fastify: FastifyInstance) {
  const importService = new ImportService();
  const exportService = new ExportService();
  const migrationService = new MigrationService();

  // Import from .env file
  fastify.post('/import/env', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const body = importSchema.parse(request.body);
      
      const context = {
        userId: user.id,
        organizationId: body.organizationId || user.organizationId,
        teamId: body.teamId || user.teamId,
        projectId: body.projectId || user.projectId,
        consumerModule: 'secret-management',
      };
      
      const result = await importService.importFromEnv(
        body.data,
        {
          scope: body.scope,
          organizationId: body.organizationId,
          teamId: body.teamId,
          projectId: body.projectId,
        },
        context
      );
      
      reply.code(201).send(result);
    } catch (error: any) {
      throw error;
    }
  });

  // Import from JSON
  fastify.post('/import/json', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const body = importSchema.parse(request.body);
      
      const context = {
        userId: user.id,
        organizationId: body.organizationId || user.organizationId,
        teamId: body.teamId || user.teamId,
        projectId: body.projectId || user.projectId,
        consumerModule: 'secret-management',
      };
      
      const result = await importService.importFromJson(
        body.data,
        {
          scope: body.scope,
          organizationId: body.organizationId,
          teamId: body.teamId,
          projectId: body.projectId,
        },
        context
      );
      
      reply.code(201).send(result);
    } catch (error: any) {
      throw error;
    }
  });

  // Export secrets
  fastify.get('/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const query = exportSchema.parse(request.query);
      
      const context = {
        userId: user.id,
        organizationId: query.organizationId || user.organizationId,
        teamId: user.teamId,
        projectId: query.projectId || user.projectId,
        consumerModule: 'secret-management',
      };
      
      let result;
      if (query.format === 'env') {
        result = await exportService.exportToEnv(
          {
            scope: query.scope,
            organizationId: query.organizationId,
            teamId: query.teamId,
            projectId: query.projectId,
            includeValues: query.includeValues || false,
          },
          context
        );
      } else {
        result = await exportService.exportToJson(
          {
            scope: query.scope,
            organizationId: query.organizationId,
            teamId: query.teamId,
            projectId: query.projectId,
            includeValues: query.includeValues || false,
          },
          context
        );
      }
      
      reply.send(result);
    } catch (error: any) {
      throw error;
    }
  });

  // Migrate secrets between backends
  fastify.post('/migrate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const body = migrateSchema.parse(request.body);
      
      const context = {
        userId: user.id,
        organizationId: user.organizationId,
        consumerModule: 'secret-management',
      };
      
      const result = await migrationService.migrateSecrets(
        body.sourceVaultId,
        body.targetVaultId,
        body.secretIds,
        context
      );
      
      reply.send(result);
    } catch (error: any) {
      throw error;
    }
  });
}
