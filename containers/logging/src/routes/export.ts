/**
 * Export Routes
 * Per ModuleImplementationGuide Section 7: API Standards
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { z } from 'zod';
import { ExportFormat } from '../types/policy.types';
import { LogCategory, LogSeverity } from '../types';
import { log } from '../utils/logger';

const createExportSchema = z.object({
  format: z.enum(['CSV', 'JSON']),
  filters: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    category: z.nativeEnum(LogCategory).optional(),
    severity: z.nativeEnum(LogSeverity).optional(),
    action: z.string().optional(),
    userId: z.string().optional(),
  }).optional(),
});

export async function registerExportRoutes(app: FastifyInstance): Promise<void> {
  const exportService = (app as any).exportService;
  
  if (!exportService) {
    throw new Error('ExportService not available');
  }

  // Create export job
  app.post('/export', {
    schema: {
      description: 'Create a new export job',
      tags: ['Export'],
      summary: 'Create export',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['CSV', 'JSON'] },
          filters: { type: 'object' },
        },
        required: ['format'],
      },
      response: {
        201: {
          description: 'Export job created',
          type: 'object',
        },
        400: {
          description: 'Invalid request',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const body = createExportSchema.parse(request.body);

      // Convert date strings to Date objects
      const filters = body.filters ? {
        ...body.filters,
        startDate: body.filters.startDate ? new Date(body.filters.startDate) : undefined,
        endDate: body.filters.endDate ? new Date(body.filters.endDate) : undefined,
      } : undefined;

      const exportJob = await exportService.createExport(
        user.organizationId,
        {
          format: body.format as ExportFormat,
          filters,
        },
        user.id
      );

      reply.code(201).send(exportJob);
    } catch (error: any) {
      log.error('Failed to create export', error);
      throw error;
    }
  });

  // Get export job status
  app.get('/export/:id', {
    schema: {
      description: 'Get export job status',
      tags: ['Export'],
      summary: 'Get export',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Export job',
          type: 'object',
        },
        404: {
          description: 'Export not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const exportJob = await exportService.getExport(id, user.organizationId);

      if (!exportJob) {
        return reply.code(404).send({ error: 'Export not found' });
      }

      reply.send(exportJob);
    } catch (error: any) {
      log.error('Failed to get export', error);
      throw error;
    }
  });

  // List export jobs
  app.get('/export', {
    schema: {
      description: 'List export jobs',
      tags: ['Export'],
      summary: 'List exports',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'List of export jobs',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const query = request.query as { limit?: string };

      const exports = await exportService.listExports(
        user.organizationId,
        query.limit ? parseInt(query.limit, 10) : 50
      );

      reply.send({ items: exports, total: exports.length });
    } catch (error: any) {
      log.error('Failed to list exports', error);
      throw error;
    }
  });

  // Download export file
  app.get('/export/:id/download', {
    schema: {
      description: 'Download export file',
      tags: ['Export'],
      summary: 'Download export',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Export file stream',
          type: 'string',
        },
        404: {
          description: 'Export not found or not ready',
          type: 'object',
        },
        410: {
          description: 'Export has expired',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      // Get export job
      const exportJob = await exportService.getExport(id, user.organizationId);

      if (!exportJob) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Export not found',
          },
        });
      }

      if (exportJob.status !== 'COMPLETED') {
        return reply.code(404).send({
          error: {
            code: 'NOT_READY',
            message: `Export is ${exportJob.status.toLowerCase()}`,
            progress: exportJob.progress,
          },
        });
      }

      if (exportJob.expiresAt && new Date() > exportJob.expiresAt) {
        return reply.code(410).send({
          error: {
            code: 'EXPIRED',
            message: 'Export has expired',
            expiredAt: exportJob.expiresAt.toISOString(),
          },
        });
      }

      const filePath = exportJob.fileUrl;
      if (!filePath) {
        return reply.code(404).send({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Export file not found',
          },
        });
      }

      // Check file exists
      try {
        await stat(filePath);
      } catch {
        return reply.code(404).send({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Export file not found on disk',
          },
        });
      }

      // Set content type and disposition
      const contentType = exportJob.format === 'CSV' 
        ? 'text/csv' 
        : 'application/json';
      const fileName = `audit-logs-${id}.${exportJob.format.toLowerCase()}`;

      reply.header('Content-Type', contentType);
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
      reply.header('Content-Length', exportJob.fileSizeBytes?.toString() || '0');

      // Stream the file
      const stream = createReadStream(filePath);
      return reply.send(stream);
    } catch (error: any) {
      log.error('Failed to download export', error);
      throw error;
    }
  });

  // Cancel export job
  app.delete('/export/:id', {
    schema: {
      description: 'Cancel export job',
      tags: ['Export'],
      summary: 'Cancel export',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        204: {
          description: 'Export cancelled',
        },
        404: {
          description: 'Export not found',
          type: 'object',
        },
        400: {
          description: 'Export cannot be cancelled',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const cancelled = await exportService.cancelExport(id, user.organizationId);

      if (!cancelled) {
        // Check if export exists
        const exportJob = await exportService.getExport(id, user.organizationId);
        if (!exportJob) {
          return reply.code(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Export not found',
            },
          });
        }
        return reply.code(400).send({
          error: {
            code: 'CANNOT_CANCEL',
            message: 'Export cannot be cancelled',
            status: exportJob.status,
          },
        });
      }

      reply.code(204).send();
    } catch (error: any) {
      log.error('Failed to cancel export', error);
      throw error;
    }
  });
}

