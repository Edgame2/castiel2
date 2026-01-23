import { FastifyRequest, FastifyReply, FastifyPluginCallback } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { FieldSecurityService } from '../services/field-security.service.js';
import { ShardTypeRepository } from '@castiel/api-core';
import { FieldSecurityContext, SecurityLevel } from '../types/field-security.types.js';
import { Shard } from '../types/shard.types.js';
import { ShardType } from '../types/shard-type.types.js';

interface FieldSecurityMiddlewareOptions {
  monitoring: IMonitoringProvider;
  shardTypeRepository: ShardTypeRepository;
}

/**
 * Create field security middleware
 */
export function createFieldSecurityMiddleware(
  options: FieldSecurityMiddlewareOptions
): {
  service: FieldSecurityService;
  secureShardResponse: (
    shard: Shard,
    request: FastifyRequest
  ) => Promise<Shard>;
  secureShardsResponse: (
    shards: Shard[],
    request: FastifyRequest
  ) => Promise<Shard[]>;
  validateWriteRequest: (
    data: Record<string, any>,
    shardTypeId: string,
    tenantId: string,
    request: FastifyRequest
  ) => Promise<{ valid: boolean; errors: string[] }>;
} {
  const { monitoring, shardTypeRepository } = options;
  const securityService = new FieldSecurityService(monitoring);

  // Cache for ShardTypes
  const shardTypeCache = new Map<string, { shardType: ShardType; expiresAt: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get ShardType with caching
   */
  async function getShardType(shardTypeId: string, tenantId: string): Promise<ShardType | null> {
    const cacheKey = `${tenantId}:${shardTypeId}`;
    const cached = shardTypeCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.shardType;
    }

    const shardType = await shardTypeRepository.findById(shardTypeId, tenantId);
    if (shardType) {
      shardTypeCache.set(cacheKey, {
        shardType,
        expiresAt: Date.now() + CACHE_TTL,
      });
    }

    return shardType;
  }

  /**
   * Build security context from request
   */
  function buildSecurityContext(
    request: FastifyRequest,
    operation: 'read' | 'write' | 'export' | 'ai'
  ): FieldSecurityContext {
    const auth = (request as any).auth || {};
    return {
      userId: auth.userId || 'anonymous',
      userRoles: auth.roles || ['user'],
      tenantId: auth.tenantId || '',
      operation,
      applyMasking: true,
      decryptFields: true,
    };
  }

  /**
   * Secure a single shard for response
   */
  async function secureShardResponse(
    shard: Shard,
    request: FastifyRequest
  ): Promise<Shard> {
    const auth = (request as any).auth || {};
    const tenantId = auth.tenantId;

    if (!tenantId) {return shard;}

    const shardType = await getShardType(shard.shardTypeId, tenantId);
    if (!shardType) {return shard;}

    const context = buildSecurityContext(request, 'read');
    const secured = await securityService.secureShardForRead(shard, shardType, context);

    // Log audit entries if any
    if (secured.auditEntries.length > 0) {
      monitoring.trackEvent('fieldSecurity.audit', {
        shardId: shard.id,
        tenantId,
        userId: context.userId,
        entries: secured.auditEntries.length,
      });
    }

    return {
      ...shard,
      structuredData: secured.structuredData,
    };
  }

  /**
   * Secure multiple shards for response
   */
  async function secureShardsResponse(
    shards: Shard[],
    request: FastifyRequest
  ): Promise<Shard[]> {
    return Promise.all(shards.map(shard => secureShardResponse(shard, request)));
  }

  /**
   * Validate data for write operations
   */
  async function validateWriteRequest(
    data: Record<string, any>,
    shardTypeId: string,
    tenantId: string,
    request: FastifyRequest
  ): Promise<{ valid: boolean; errors: string[] }> {
    const shardType = await getShardType(shardTypeId, tenantId);
    if (!shardType) {
      return { valid: true, errors: [] };
    }

    const context = buildSecurityContext(request, 'write');
    const result = await securityService.validateFieldsForWrite(data, shardType, context);

    return {
      valid: result.valid,
      errors: result.errors.map(e => e.message),
    };
  }

  return {
    service: securityService,
    secureShardResponse,
    secureShardsResponse,
    validateWriteRequest,
  };
}

/**
 * Field security Fastify plugin
 */
export const fieldSecurityPlugin: FastifyPluginCallback<FieldSecurityMiddlewareOptions> = (
  fastify,
  options,
  done
) => {
  const middleware = createFieldSecurityMiddleware(options);

  // Decorate fastify instance
  fastify.decorate('fieldSecurity', middleware);

  // Add pre-serialization hook to secure responses
  fastify.addHook('preSerialization', async (request, reply, payload) => {
    // Only process shard responses
    if (!payload || typeof payload !== 'object') {return payload;}

    // Check if this is a shard response
    if ('structuredData' in payload && 'shardTypeId' in payload) {
      return middleware.secureShardResponse(payload as Shard, request);
    }

    // Check if this is a list of shards
    if ('shards' in payload && Array.isArray((payload as any).shards)) {
      const securedShards = await middleware.secureShardsResponse(
        (payload as any).shards,
        request
      );
      return { ...payload, shards: securedShards };
    }

    return payload;
  });

  done();
};

/**
 * Declare Fastify decorations for TypeScript
 */
declare module 'fastify' {
  interface FastifyInstance {
    fieldSecurity: ReturnType<typeof createFieldSecurityMiddleware>;
  }
}











