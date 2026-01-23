import { FieldSecurityService } from '../services/field-security.service.js';
/**
 * Create field security middleware
 */
export function createFieldSecurityMiddleware(options) {
    const { monitoring, shardTypeRepository } = options;
    const securityService = new FieldSecurityService(monitoring);
    // Cache for ShardTypes
    const shardTypeCache = new Map();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    /**
     * Get ShardType with caching
     */
    async function getShardType(shardTypeId, tenantId) {
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
    function buildSecurityContext(request, operation) {
        const auth = request.auth || {};
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
    async function secureShardResponse(shard, request) {
        const auth = request.auth || {};
        const tenantId = auth.tenantId;
        if (!tenantId) {
            return shard;
        }
        const shardType = await getShardType(shard.shardTypeId, tenantId);
        if (!shardType) {
            return shard;
        }
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
    async function secureShardsResponse(shards, request) {
        return Promise.all(shards.map(shard => secureShardResponse(shard, request)));
    }
    /**
     * Validate data for write operations
     */
    async function validateWriteRequest(data, shardTypeId, tenantId, request) {
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
export const fieldSecurityPlugin = (fastify, options, done) => {
    const middleware = createFieldSecurityMiddleware(options);
    // Decorate fastify instance
    fastify.decorate('fieldSecurity', middleware);
    // Add pre-serialization hook to secure responses
    fastify.addHook('preSerialization', async (request, reply, payload) => {
        // Only process shard responses
        if (!payload || typeof payload !== 'object') {
            return payload;
        }
        // Check if this is a shard response
        if ('structuredData' in payload && 'shardTypeId' in payload) {
            return middleware.secureShardResponse(payload, request);
        }
        // Check if this is a list of shards
        if ('shards' in payload && Array.isArray(payload.shards)) {
            const securedShards = await middleware.secureShardsResponse(payload.shards, request);
            return { ...payload, shards: securedShards };
        }
        return payload;
    });
    done();
};
//# sourceMappingURL=field-security.middleware.js.map