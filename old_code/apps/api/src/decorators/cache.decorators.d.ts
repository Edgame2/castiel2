import { FastifyRequest } from 'fastify';
/**
 * Cache decorator options
 */
export interface CacheableOptions {
    /**
     * Cache key or key builder function
     */
    key: string | ((req: FastifyRequest) => string);
    /**
     * Time to live in seconds
     */
    ttl: number;
    /**
     * Condition function to determine if result should be cached
     */
    condition?: (result: any) => boolean;
}
/**
 * Cache evict options
 */
export interface CacheEvictOptions {
    /**
     * Cache key or key builder function
     */
    key: string | ((req: FastifyRequest) => string);
    /**
     * Whether to evict all keys matching pattern
     */
    allEntries?: boolean;
}
/**
 * @Cacheable decorator
 * Caches the result of a method based on the provided key and TTL
 *
 * Usage:
 * ```typescript
 * @Cacheable({ key: 'user:profile', ttl: 3600 })
 * async getUserProfile(request: FastifyRequest, reply: FastifyReply) {
 *   // Method implementation
 * }
 * ```
 */
export declare function Cacheable(options: CacheableOptions): (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * @CacheEvict decorator
 * Evicts cache entries when a method is called
 *
 * Usage:
 * ```typescript
 * @CacheEvict({ key: 'user:profile' })
 * async updateUserProfile(request: FastifyRequest, reply: FastifyReply) {
 *   // Method implementation
 * }
 * ```
 */
export declare function CacheEvict(options: CacheEvictOptions): (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * @CacheEvictAll decorator
 * Evicts all cache entries matching a pattern when a method is called
 *
 * Usage:
 * ```typescript
 * @CacheEvictAll({ pattern: 'tenant:123:*' })
 * async deleteTenant(request: FastifyRequest, reply: FastifyReply) {
 *   // Method implementation
 * }
 * ```
 */
export declare function CacheEvictAll(pattern: string | ((req: FastifyRequest) => string)): (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * @CachePut decorator
 * Updates cache with the method result
 * Similar to @Cacheable but always executes the method
 *
 * Usage:
 * ```typescript
 * @CachePut({ key: 'user:profile', ttl: 3600 })
 * async refreshUserProfile(request: FastifyRequest, reply: FastifyReply) {
 *   // Method implementation
 * }
 * ```
 */
export declare function CachePut(options: CacheableOptions): (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Helper function to create cache key builder for common patterns
 */
export declare const CacheKeyBuilders: {
    /**
     * Build key from tenant ID and user ID in request params
     */
    tenantUser: (req: FastifyRequest) => string;
    /**
     * Build key from tenant ID and shard ID in request params
     */
    tenantShard: (req: FastifyRequest) => string;
    /**
     * Build key from tenant ID in request params
     */
    tenant: (req: FastifyRequest) => string;
    /**
     * Build key from authenticated user
     */
    authUser: (req: FastifyRequest) => string;
};
//# sourceMappingURL=cache.decorators.d.ts.map