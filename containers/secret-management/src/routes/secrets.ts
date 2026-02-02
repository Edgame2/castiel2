/**
 * Secret Management API Routes
 * 
 * All endpoints for secret CRUD, lifecycle, access, and SSO operations.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SecretService } from '../services/SecretService';
import { AccessGrantService } from '../services/access/AccessGrantService';
import { RotationManager } from '../services/lifecycle/RotationManager';
import { VersionManager } from '../services/lifecycle/VersionManager';
import { SoftDeleteManager } from '../services/lifecycle/SoftDeleteManager';
import { SecretResolver } from '../services/SecretResolver';
import { RecoveryPeriodExpiredError } from '../errors/SecretErrors';
import { getLoggingClient } from '../services/logging/LoggingClient';
import { z } from 'zod';
import { SecretContext, AnySecretValue } from '../types';
import { getSecretContext } from '../utils/requestContext';
import { verifyServiceAuth, verifyServiceAuthorized } from '../utils/auth';
import { VaultService } from '../services/VaultService';
import { BackendFactory } from '../services/backends/BackendFactory';
import { getDatabaseClient } from '@coder/shared';
import { zodToFastifySchema } from '../utils/zodToJsonSchema';

// Request schemas
const createSecretSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum([
    'API_KEY',
    'OAUTH2_TOKEN',
    'USERNAME_PASSWORD',
    'CERTIFICATE',
    'SSH_KEY',
    'CONNECTION_STRING',
    'JSON_CREDENTIAL',
    'ENV_VARIABLE_SET',
    'GENERIC',
  ]),
  value: z.any(), // AnySecretValue
  scope: z.enum(['GLOBAL', 'ORGANIZATION', 'TEAM', 'PROJECT', 'USER']),
  organizationId: z.string().optional(),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  rotationEnabled: z.boolean().optional(),
  rotationIntervalDays: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  storageBackend: z.enum([
    'LOCAL_ENCRYPTED',
    'AZURE_KEY_VAULT',
    'AWS_SECRETS_MANAGER',
    'HASHICORP_VAULT',
    'GCP_SECRET_MANAGER',
  ]).optional(),
});

const updateSecretSchema = z.object({
  description: z.string().optional(),
  value: z.any().optional(),
  expiresAt: z.string().datetime().optional(),
  rotationEnabled: z.boolean().optional(),
  rotationIntervalDays: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  changeReason: z.string().optional(),
});

const listSecretsSchema = z.object({
  scope: z.enum(['GLOBAL', 'ORGANIZATION', 'TEAM', 'PROJECT', 'USER']).optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  includeDeleted: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const grantAccessSchema = z.object({
  granteeType: z.enum(['USER', 'TEAM', 'ROLE']),
  granteeId: z.string(),
  permissions: z.object({
    canRead: z.boolean(),
    canUpdate: z.boolean(),
    canDelete: z.boolean(),
    canGrant: z.boolean(),
  }),
  expiresAt: z.string().datetime().optional(),
});

const rotateSecretSchema = z.object({
  value: z.any(), // AnySecretValue
  changeReason: z.string().optional(),
});

const rollbackSchema = z.object({
  targetVersion: z.number().int().positive(),
});

// Helper to get user context from request (using utility)
function getContext(request: FastifyRequest): SecretContext {
  return getSecretContext(request);
}

export async function secretRoutes(fastify: FastifyInstance) {
  const secretService = new SecretService();
  const accessGrantService = new AccessGrantService();
  const rotationManager = new RotationManager();
  const versionManager = new VersionManager();
  const secretResolver = new SecretResolver();
  const softDeleteManager = new SoftDeleteManager();

  // ============================================================================
  // SECRET CRUD ENDPOINTS
  // ============================================================================

  // Create secret
  fastify.post('/', {
    schema: {
      description: 'Create a new secret',
      tags: ['Secrets'],
      summary: 'Create secret',
      security: [{ bearerAuth: [] }],
      body: zodToFastifySchema(createSecretSchema),
      response: {
        201: {
          description: 'Secret created successfully',
          type: 'object',
        },
        400: {
          description: 'Invalid request',
          type: 'object',
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
        },
        403: {
          description: 'Forbidden',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const context = getContext(request);
      const body = createSecretSchema.parse(request.body);
      
      // Convert expiresAt string to Date if provided
      const createParams = {
        ...body,
        value: body.value ?? '',
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      };
      const secret = await secretService.createSecret(createParams as import('../types').CreateSecretParams, context);
      reply.code(201).send(secret);
    } catch (error: any) {
      // Error handler middleware will handle this
      throw error;
    }
  });

  // List secrets (metadata only)
  fastify.get('/', {
    schema: {
      description: 'List secrets (metadata only, no values)',
      tags: ['Secrets'],
      summary: 'List secrets',
      security: [{ bearerAuth: [] }],
      querystring: zodToFastifySchema(listSecretsSchema),
      response: {
        200: {
          description: 'List of secrets',
          type: 'object',
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const context = getContext(request);
      const query = listSecretsSchema.parse(request.query);
      
      // Convert type string to SecretType if provided
      const listParams: any = {
        ...query,
      };
      
      const secrets = await secretService.listSecrets(listParams, context);
      reply.send(secrets);
    } catch (error: any) {
      throw error;
    }
  });

  // Get secret metadata
  fastify.get('/:id', {
    schema: {
      description: 'Get secret metadata (no value)',
      tags: ['Secrets'],
      summary: 'Get secret metadata',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Secret ID' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Secret metadata',
          type: 'object',
        },
        404: {
          description: 'Secret not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const context = getContext(request);
      
      const secret = await secretService.getSecretMetadata(id, context);
      reply.send(secret);
    } catch (error: any) {
      throw error;
    }
  });

  // Get secret value
  fastify.get('/:id/value', {
    schema: {
      description: 'Get secret value (requires READ permission)',
      tags: ['Secrets'],
      summary: 'Get secret value',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Secret ID' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Secret value',
          type: 'object',
          properties: {
            value: {
              description: 'The secret value (type depends on secret type)',
            },
          },
        },
        403: {
          description: 'Access denied',
          type: 'object',
        },
        404: {
          description: 'Secret not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const context = getContext(request);
      
      const value = await secretService.getSecretValue(id, context);
      reply.send({ value });
    } catch (error: any) {
      throw error;
    }
  });

  // Update secret metadata
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const context = getContext(request);
      const body = updateSecretSchema.parse(request.body);
      
      // Convert expiresAt string to Date if provided
      const updateParams = {
        ...body,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      };
      const secret = await secretService.updateSecret(id, updateParams, context);
      reply.send(secret);
    } catch (error: any) {
      throw error;
    }
  });

  // Update secret value
  fastify.put('/:id/value', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const context = getContext(request);
      const body = z.object({ value: z.any() }).parse(request.body);
      
      const secret = await secretService.updateSecret(
        id,
        { value: body.value },
        context
      );
      reply.send(secret);
    } catch (error: any) {
      throw error;
    }
  });

  // Soft delete secret
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const context = getContext(request);
      
      await secretService.deleteSecret(id, context);
      reply.code(204).send();
    } catch (error: any) {
      throw error;
    }
  });

  // Restore soft-deleted secret
  fastify.post('/:id/restore', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      
      await softDeleteManager.restoreSecret(id, user.id);
      reply.send({ success: true });
    } catch (error: any) {
      throw error;
    }
  });

  // Permanently delete secret
  fastify.delete('/:id/permanent', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const context = getContext(request);
      
      // Get secret metadata to check if it's soft-deleted
      const secret = await secretService.getSecretMetadata(id, context);
      
      // Verify secret is soft-deleted
      if (!secret.deletedAt) {
        throw new Error('Secret must be soft-deleted before permanent deletion');
      }
      
      // Verify recovery period has expired
      if (secret.recoveryDeadline && secret.recoveryDeadline > new Date()) {
        throw new RecoveryPeriodExpiredError(id, secret.recoveryDeadline);
      }
      
      // Get full secret record to check storage backend
      const db = getDatabaseClient() as any;
      const secretRecord = await db.secret_secrets.findUnique({
        where: { id },
        select: {
          storageBackend: true,
          vaultSecretId: true,
          scope: true,
          organizationId: true,
        },
      });
      
      if (!secretRecord) {
        throw new Error('Secret not found');
      }
      
      // If external vault, delete from vault first
      if (secretRecord.storageBackend !== 'LOCAL_ENCRYPTED' && secretRecord.vaultSecretId) {
        const vaultService = new VaultService();
        
        // Get vault configuration and backend
        const vaultScope = secretRecord.scope === 'GLOBAL' ? 'GLOBAL' : 'ORGANIZATION';
        const vaultConfig = await vaultService.getDefaultVaultByBackend(
          secretRecord.storageBackend,
          vaultScope,
          secretRecord.organizationId || undefined
        );
        
        if (vaultConfig) {
          try {
            const backendConfig = await vaultService.getVaultConfig(vaultConfig.id);
            const backend = await BackendFactory.createBackend(backendConfig);
            
            // Delete from vault
            await backend.deleteSecret({
              secretRef: secretRecord.vaultSecretId,
            });
          } catch (error: any) {
            // Log error but continue with database deletion
            await getLoggingClient().sendLog({
              level: 'error',
              message: 'Failed to delete secret from vault during permanent deletion',
              service: 'secret-management',
              metadata: {
                secretId: id,
                storageBackend: secretRecord.storageBackend,
                error: error.message,
              },
            });
          }
        }
      }
      
      // Delete versions first
      await db.secret_versions.deleteMany({
        where: { secretId: id },
      });
      
      // Delete access grants
      await db.secret_access_grants.deleteMany({
        where: { secretId: id },
      });
      
      // Delete usage records
      await db.secret_usage.deleteMany({
        where: { secretId: id },
      });
      
      // Delete secret from database
      await db.secret_secrets.delete({
        where: { id },
      });
      
      reply.code(204).send();
    } catch (error: any) {
      throw error;
    }
  });

  // ============================================================================
  // ROTATION & VERSIONING ENDPOINTS
  // ============================================================================

  // Rotate secret
  fastify.post('/:id/rotate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const context = getContext(request);
      const body = rotateSecretSchema.parse(request.body);
      
      const result = await rotationManager.rotateSecret(
        id,
        body.value as AnySecretValue,
        context,
        body.changeReason
      );
      reply.send(result);
    } catch (error: any) {
      throw error;
    }
  });

  // Get version history
  fastify.get('/:id/versions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const context = getContext(request);
      
      // Check access
      await secretService.getSecretMetadata(id, context);
      
      const versions = await versionManager.getVersionHistory(id);
      reply.send(versions);
    } catch (error: any) {
      throw error;
    }
  });

  // Get specific version value
  fastify.get('/:id/versions/:version', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id, version } = request.params as { id: string; version: string };
      const context = getContext(request);
      
      // Check access
      await secretService.getSecretMetadata(id, context);
      
      const value = await versionManager.getVersionValue(id, parseInt(version, 10));
      reply.send({ value, version: parseInt(version, 10) });
    } catch (error: any) {
      throw error;
    }
  });

  // Rollback to previous version
  fastify.post('/:id/rollback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const body = rollbackSchema.parse(request.body);
      
      const result = await versionManager.rollbackToVersion(id, body.targetVersion, {
        userId: user.id,
      });
      reply.send(result);
    } catch (error: any) {
      throw error;
    }
  });

  // ============================================================================
  // ACCESS MANAGEMENT ENDPOINTS
  // ============================================================================

  // List access grants
  fastify.get('/:id/access', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const context = getContext(request);
      
      // Check access
      await secretService.getSecretMetadata(id, context);
      
      const grants = await accessGrantService.listGrants(id);
      reply.send(grants);
    } catch (error: any) {
      throw error;
    }
  });

  // Grant access
  fastify.post('/:id/access', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const context = getContext(request);
      const body = grantAccessSchema.parse(request.body);
      
      // Convert expiresAt string to Date if provided
      const grantParams = {
        ...body,
        secretId: id,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      };
      
      const grant = await accessGrantService.grantAccess(grantParams, context.userId);
      reply.code(201).send(grant);
    } catch (error: any) {
      throw error;
    }
  });

  // Revoke access
  fastify.delete('/:id/access/:grantId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { grantId } = request.params as { grantId: string };
      const user = (request as any).user;
      
      await accessGrantService.revokeAccess(grantId, user.id);
      reply.code(204).send();
    } catch (error: any) {
      throw error;
    }
  });

  // ============================================================================
  // SECRET RESOLUTION ENDPOINTS
  // ============================================================================

  // Resolve multiple secrets (batch)
  fastify.post('/resolve', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const context = getContext(request);
      const body = z.object({
        secretIds: z.array(z.string()).min(1).max(100),
        allowPartial: z.boolean().optional(),
      }).parse(request.body);
      
      const result = await secretResolver.resolveSecrets({
        references: body.secretIds,
        context,
      }, {
        allowPartial: body.allowPartial || false,
      });
      
      reply.send(result);
    } catch (error: any) {
      throw error;
    }
  });

  // Resolve configuration with secret references
  fastify.post('/resolve/config', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const context = getContext(request);
      const body = z.object({
        config: z.record(z.any()),
      }).parse(request.body);
      
      const resolved = await secretResolver.resolveConfig(body.config, context);
      
      reply.send({ config: resolved });
    } catch (error: any) {
      throw error;
    }
  });

  // ============================================================================
  // SSO SECRET ENDPOINTS (Service-to-service only)
  // ============================================================================

  // Store SSO secret
  fastify.post('/sso', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify service-to-service authentication
      const { requestingService } = verifyServiceAuth(request);
      verifyServiceAuthorized(requestingService, ['organization-service', 'auth-service']);

      const body = request.body as {
        organizationId: string;
        provider: 'azure_ad' | 'okta';
        credentials: Record<string, any>;
      };

      if (!body.organizationId || !body.provider || !body.credentials) {
        throw new Error('Missing required fields: organizationId, provider, credentials');
      }

      // Create secret with CERTIFICATE type
      const secret = await secretService.createSecret(
        {
          name: `sso-${body.organizationId}-${body.provider}`,
          type: 'CERTIFICATE',
          value: {
            type: 'CERTIFICATE',
            certificate: body.credentials.certificate,
            privateKey: body.credentials.privateKey,
            chain: body.credentials.chain,
            passphrase: body.credentials.passphrase,
          } as AnySecretValue,
          scope: 'ORGANIZATION',
          organizationId: body.organizationId,
          metadata: {
            type: 'sso',
            provider: body.provider,
          },
        },
        {
          userId: 'system', // System user for service-to-service
          organizationId: body.organizationId,
          consumerModule: requestingService,
        }
      );

      reply.code(201).send({
        secretId: secret.id,
        organizationId: body.organizationId,
        provider: body.provider,
        createdAt: secret.createdAt.toISOString(),
      });
    } catch (error: any) {
      throw error;
    }
  });

  // Get SSO secret
  fastify.get('/sso/:secretId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify service-to-service authentication
      const { requestingService, organizationId } = verifyServiceAuth(request);
      verifyServiceAuthorized(requestingService, ['auth-service', 'organization-service']);

      const { secretId } = request.params as { secretId: string };
      
      const value = await secretService.getSecretValue(secretId, {
        userId: 'system',
        organizationId,
        consumerModule: requestingService,
      });

      reply.send({
        secretId,
        organizationId,
        credentials: value,
      });
    } catch (error: any) {
      throw error;
    }
  });

  // Update SSO secret
  fastify.put('/sso/:secretId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify service-to-service authentication
      const { requestingService, organizationId } = verifyServiceAuth(request);
      verifyServiceAuthorized(requestingService, ['organization-service']);

      const { secretId } = request.params as { secretId: string };
      const body = request.body as {
        credentials: Record<string, any>;
      };

      if (!body.credentials) {
        throw new Error('Missing credentials');
      }

      const secret = await secretService.updateSecret(
        secretId,
        {
          value: {
            type: 'CERTIFICATE',
            certificate: body.credentials.certificate,
            privateKey: body.credentials.privateKey,
            chain: body.credentials.chain,
            passphrase: body.credentials.passphrase,
          } as AnySecretValue,
        },
        {
          userId: 'system',
          organizationId,
          consumerModule: requestingService,
        }
      );

      reply.send({
        secretId: secret.id,
        organizationId,
        updatedAt: secret.updatedAt.toISOString(),
      });
    } catch (error: any) {
      throw error;
    }
  });

  // Delete SSO secret
  fastify.delete('/sso/:secretId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify service-to-service authentication
      const { requestingService, organizationId } = verifyServiceAuth(request);
      verifyServiceAuthorized(requestingService, ['organization-service']);

      const { secretId } = request.params as { secretId: string };
      
      await secretService.deleteSecret(secretId, {
        userId: 'system',
        organizationId,
        consumerModule: requestingService,
      });
      
      reply.send({
        success: true,
        message: 'SSO secret deleted successfully',
      });
    } catch (error: any) {
      throw error;
    }
  });

  // Rotate SSO certificate
  fastify.post('/sso/:secretId/rotate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify service-to-service authentication
      const { requestingService, organizationId } = verifyServiceAuth(request);
      verifyServiceAuthorized(requestingService, ['organization-service']);

      const { secretId } = request.params as { secretId: string };
      const body = request.body as {
        newCertificate: string;
        newPrivateKey?: string;
        gracePeriodHours?: number;
      };

      if (!body.newCertificate) {
        throw new Error('newCertificate is required');
      }

      const result = await rotationManager.rotateSecret(
        secretId,
        {
          type: 'CERTIFICATE',
          certificate: body.newCertificate,
          privateKey: body.newPrivateKey,
        } as AnySecretValue,
        {
          userId: 'system',
          organizationId,
          consumerModule: requestingService,
        },
        'SSO certificate rotated'
      );

      reply.send({
        secretId: result.secretId,
        rotatedAt: result.rotatedAt.toISOString(),
      });
    } catch (error: any) {
      throw error;
    }
  });

  // Check certificate expiration
  fastify.get('/sso/:secretId/expiration', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify service-to-service authentication
      const { requestingService, organizationId } = verifyServiceAuth(request);
      verifyServiceAuthorized(requestingService, ['auth-service', 'organization-service']);

      const { secretId } = request.params as { secretId: string };
      
      const secret = await secretService.getSecretMetadata(secretId, {
        userId: 'system',
        organizationId,
        consumerModule: requestingService,
      });

      reply.send({
        secretId,
        expiresAt: secret.expiresAt?.toISOString(),
        isExpired: secret.expiresAt ? secret.expiresAt < new Date() : false,
      });
    } catch (error: any) {
      throw error;
    }
  });
}
