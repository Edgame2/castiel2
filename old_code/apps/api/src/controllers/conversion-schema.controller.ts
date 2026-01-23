/**
 * Conversion Schema Controller
 * Handles HTTP requests for conversion schema management
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  ConversionSchemaService,
  type CreateConversionSchemaInput,
  type UpdateConversionSchemaInput,
  type ConversionSchemaListOptions,
  type SchemaTestInput,
} from '@castiel/api-core';
import { IMonitoringProvider } from '@castiel/monitoring';

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    tenantId: string;
  };
  auth?: {
    id: string;
    tenantId: string;
  };
}

export class ConversionSchemaController {
  constructor(
    private conversionSchemaService: ConversionSchemaService,
    private monitoring: IMonitoringProvider
  ) {}

  /**
   * POST /api/v1/integrations/:integrationId/conversion-schemas
   * Create a new conversion schema
   */
  create = async (
    req: FastifyRequest<{
      Params: { integrationId: string };
      Body: CreateConversionSchemaInput;
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const authRequest = req as AuthenticatedRequest;
    const { integrationId } = req.params;
    const userId = authRequest.user?.id || authRequest.auth?.id;
    const tenantId = authRequest.user?.tenantId || authRequest.auth?.tenantId;

    if (!tenantId || !userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const input: CreateConversionSchemaInput = {
        ...req.body,
        tenantIntegrationId: integrationId,
        createdBy: userId,
      };

      const schema = await this.conversionSchemaService.create(input);

      this.monitoring.trackEvent('conversionSchema.controller.create.success', {
        schemaId: schema.id,
        integrationId,
        tenantId,
      });

      reply.code(201).send(schema);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'conversionSchema.controller.create',
          integrationId,
          tenantId,
        }
      );
      reply.code(500).send({ error: errorMessage });
    }
  };

  /**
   * GET /api/v1/integrations/:integrationId/conversion-schemas
   * List conversion schemas for an integration
   */
  list = async (
    req: FastifyRequest<{
      Params: { integrationId: string };
      Querystring: {
        limit?: number;
        offset?: number;
        isActive?: boolean;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const authRequest = req as AuthenticatedRequest;
    const { integrationId } = req.params;
    const tenantId = authRequest.user?.tenantId || authRequest.auth?.tenantId;

    if (!tenantId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const options: ConversionSchemaListOptions = {
        tenantId,
        tenantIntegrationId: integrationId,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0,
        isActive: req.query.isActive,
      };

      const result = await this.conversionSchemaService.list(options);

      this.monitoring.trackEvent('conversionSchema.controller.list.success', {
        integrationId,
        tenantId,
        count: result.schemas.length,
      });

      reply.code(200).send(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'conversionSchema.controller.list',
          integrationId,
          tenantId,
        }
      );
      reply.code(500).send({ error: errorMessage });
    }
  };

  /**
   * GET /api/v1/integrations/:integrationId/conversion-schemas/:schemaId
   * Get a specific conversion schema
   */
  get = async (
    req: FastifyRequest<{
      Params: { integrationId: string; schemaId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const authRequest = req as AuthenticatedRequest;
    const { schemaId } = req.params;
    const tenantId = authRequest.user?.tenantId || authRequest.auth?.tenantId;

    if (!tenantId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const schema = await this.conversionSchemaService.findById(schemaId, tenantId);

      if (!schema) {
        return reply.code(404).send({ error: 'Conversion schema not found' });
      }

      this.monitoring.trackEvent('conversionSchema.controller.get.success', {
        schemaId,
        tenantId,
      });

      reply.code(200).send(schema);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'conversionSchema.controller.get',
          schemaId,
          tenantId,
        }
      );
      reply.code(500).send({ error: errorMessage });
    }
  };

  /**
   * PATCH /api/v1/integrations/:integrationId/conversion-schemas/:schemaId
   * Update a conversion schema
   */
  update = async (
    req: FastifyRequest<{
      Params: { integrationId: string; schemaId: string };
      Body: UpdateConversionSchemaInput;
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const authRequest = req as AuthenticatedRequest;
    const { schemaId } = req.params;
    const tenantId = authRequest.user?.tenantId || authRequest.auth?.tenantId;

    if (!tenantId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const schema = await this.conversionSchemaService.update(schemaId, tenantId, req.body);

      if (!schema) {
        return reply.code(404).send({ error: 'Conversion schema not found' });
      }

      this.monitoring.trackEvent('conversionSchema.controller.update.success', {
        schemaId,
        tenantId,
      });

      reply.code(200).send(schema);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'conversionSchema.controller.update',
          schemaId,
          tenantId,
        }
      );
      reply.code(500).send({ error: errorMessage });
    }
  };

  /**
   * DELETE /api/v1/integrations/:integrationId/conversion-schemas/:schemaId
   * Delete a conversion schema
   */
  delete = async (
    req: FastifyRequest<{
      Params: { integrationId: string; schemaId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const authRequest = req as AuthenticatedRequest;
    const { schemaId } = req.params;
    const tenantId = authRequest.user?.tenantId || authRequest.auth?.tenantId;

    if (!tenantId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const deleted = await this.conversionSchemaService.delete(schemaId, tenantId);

      if (!deleted) {
        return reply.code(404).send({ error: 'Conversion schema not found' });
      }

      this.monitoring.trackEvent('conversionSchema.controller.delete.success', {
        schemaId,
        tenantId,
      });

      reply.code(204).send();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'conversionSchema.controller.delete',
          schemaId,
          tenantId,
        }
      );
      reply.code(500).send({ error: errorMessage });
    }
  };

  /**
   * POST /api/v1/integrations/:integrationId/conversion-schemas/:schemaId/test
   * Test a conversion schema with sample data
   */
  test = async (
    req: FastifyRequest<{
      Params: { integrationId: string; schemaId: string };
      Body: SchemaTestInput;
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const authRequest = req as AuthenticatedRequest;
    const { schemaId } = req.params;
    const tenantId = authRequest.user?.tenantId || authRequest.auth?.tenantId;

    if (!tenantId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const result = await this.conversionSchemaService.testSchema(schemaId, tenantId, req.body);

      this.monitoring.trackEvent('conversionSchema.controller.test.success', {
        schemaId,
        tenantId,
      });

      reply.code(200).send(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'conversionSchema.controller.test',
          schemaId,
          tenantId,
        }
      );
      reply.code(500).send({ error: errorMessage });
    }
  };
}
