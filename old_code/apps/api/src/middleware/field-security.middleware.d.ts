import { FastifyRequest, FastifyPluginCallback } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { FieldSecurityService } from '../services/field-security.service.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { Shard } from '../types/shard.types.js';
interface FieldSecurityMiddlewareOptions {
    monitoring: IMonitoringProvider;
    shardTypeRepository: ShardTypeRepository;
}
/**
 * Create field security middleware
 */
export declare function createFieldSecurityMiddleware(options: FieldSecurityMiddlewareOptions): {
    service: FieldSecurityService;
    secureShardResponse: (shard: Shard, request: FastifyRequest) => Promise<Shard>;
    secureShardsResponse: (shards: Shard[], request: FastifyRequest) => Promise<Shard[]>;
    validateWriteRequest: (data: Record<string, any>, shardTypeId: string, tenantId: string, request: FastifyRequest) => Promise<{
        valid: boolean;
        errors: string[];
    }>;
};
/**
 * Field security Fastify plugin
 */
export declare const fieldSecurityPlugin: FastifyPluginCallback<FieldSecurityMiddlewareOptions>;
/**
 * Declare Fastify decorations for TypeScript
 */
declare module 'fastify' {
    interface FastifyInstance {
        fieldSecurity: ReturnType<typeof createFieldSecurityMiddleware>;
    }
}
export {};
//# sourceMappingURL=field-security.middleware.d.ts.map