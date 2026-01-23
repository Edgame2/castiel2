/**
 * Import/Export Routes
 * 
 * Routes for shard import and export operations
 */

import type { FastifyInstance } from 'fastify';
import type { ImportExportController } from '../controllers/import-export.controller.js';
import { ExportFormat, ImportFormat } from '../types/import-export.types.js';

const createExportSchema = {
  body: {
    type: 'object',
    required: ['format'],
    properties: {
      format: { type: 'string', enum: Object.values(ExportFormat) },
      shardTypeId: { type: 'string' },
      shardIds: { type: 'array', items: { type: 'string' }, maxItems: 1000 },
      options: {
        type: 'object',
        properties: {
          includeMetadata: { type: 'boolean' },
          includeRelationships: { type: 'boolean' },
          includeRevisions: { type: 'boolean' },
          flattenStructuredData: { type: 'boolean' },
          fields: { type: 'array', items: { type: 'string' } },
          filters: {
            type: 'object',
            properties: {
              status: { type: 'array', items: { type: 'string' } },
              createdAfter: { type: 'string', format: 'date-time' },
              createdBefore: { type: 'string', format: 'date-time' },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
          csvDelimiter: { type: 'string', maxLength: 1 },
          dateFormat: { type: 'string' },
        },
      },
    },
  },
};

const createImportSchema = {
  body: {
    type: 'object',
    required: ['format', 'shardTypeId', 'fileContent', 'fileName', 'columnMappings'],
    properties: {
      format: { type: 'string', enum: Object.values(ImportFormat) },
      shardTypeId: { type: 'string' },
      fileContent: { type: 'string' }, // Base64
      fileName: { type: 'string' },
      columnMappings: {
        type: 'array',
        items: {
          type: 'object',
          required: ['sourceColumn', 'targetField'],
          properties: {
            sourceColumn: { type: 'string' },
            targetField: { type: 'string' },
            transformer: { type: 'string' },
            defaultValue: {},
            required: { type: 'boolean' },
          },
        },
      },
      options: {
        type: 'object',
        properties: {
          skipFirstRow: { type: 'boolean' },
          validateBeforeImport: { type: 'boolean' },
          updateExisting: { type: 'boolean' },
          matchField: { type: 'string' },
          onError: { type: 'string', enum: ['skip', 'abort'] },
          csvDelimiter: { type: 'string', maxLength: 1 },
          dateFormat: { type: 'string' },
          batchSize: { type: 'integer', minimum: 1, maximum: 500 },
        },
      },
    },
  },
};

const validateImportSchema = {
  body: {
    type: 'object',
    required: ['format', 'shardTypeId', 'fileContent', 'fileName', 'columnMappings'],
    properties: {
      format: { type: 'string', enum: Object.values(ImportFormat) },
      shardTypeId: { type: 'string' },
      fileContent: { type: 'string' },
      fileName: { type: 'string' },
      columnMappings: {
        type: 'array',
        items: {
          type: 'object',
          required: ['sourceColumn', 'targetField'],
          properties: {
            sourceColumn: { type: 'string' },
            targetField: { type: 'string' },
            transformer: { type: 'string' },
            defaultValue: {},
            required: { type: 'boolean' },
          },
        },
      },
      previewRows: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
};

const jobIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
};

export function registerImportExportRoutes(
  server: FastifyInstance,
  controller: ImportExportController
) {
  // Export routes
  server.post(
    '/api/v1/exports',
    { schema: createExportSchema },
    (request, reply) => controller.createExport(request, reply)
  );

  server.get(
    '/api/v1/exports/:id',
    { schema: jobIdSchema },
    (request, reply) => controller.getExportJob(request, reply)
  );

  server.get(
    '/api/v1/exports/:id/download',
    { schema: jobIdSchema },
    (request, reply) => controller.downloadExport(request, reply)
  );

  // Import routes
  server.post(
    '/api/v1/imports',
    { schema: createImportSchema },
    (request, reply) => controller.createImport(request, reply)
  );

  server.get(
    '/api/v1/imports/:id',
    { schema: jobIdSchema },
    (request, reply) => controller.getImportJob(request, reply)
  );

  server.post(
    '/api/v1/imports/validate',
    { schema: validateImportSchema },
    (request, reply) => controller.validateImport(request, reply)
  );
}

