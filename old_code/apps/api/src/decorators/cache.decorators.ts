import { FastifyRequest, FastifyReply } from 'fastify';
import type { CacheService } from '../services/cache.service.js';

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
 * Get cache service from Fastify instance
 */
function getCacheService(target: any): CacheService | null {
  // Try to get from request
  if (target.request?.server?.cache) {
    return target.request.server.cache;
  }
  
  // Try to get from instance
  if (target.cache) {
    return target.cache;
  }
  
  return null;
}

/**
 * Build cache key from options and request
 */
function buildCacheKey(
  keyOrBuilder: string | ((req: FastifyRequest) => string),
  request: FastifyRequest
): string {
  if (typeof keyOrBuilder === 'function') {
    return keyOrBuilder(request);
  }
  return keyOrBuilder;
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
export function Cacheable(options: CacheableOptions) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      request: FastifyRequest,
      reply: FastifyReply
    ) {
      const cacheService = getCacheService(this);
      
      // If cache is not available, execute original method
      if (!cacheService) {
        return originalMethod.call(this, request, reply);
      }

      try {
        const cacheKey = buildCacheKey(options.key, request);
        
        // Try to get from cache
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          // Return cached result
          return reply.send(cached);
        }

        // Cache miss - execute original method
        const result = await originalMethod.call(this, request, reply);
        
        // Check condition if provided
        if (options.condition && !options.condition(result)) {
          return result;
        }

        // Cache the result (don't await to avoid blocking)
        cacheService.set(cacheKey, result, options.ttl).catch((error) => {
          // Use request logger if available, otherwise silent fail (non-blocking cache operation)
          if (request.log) {
            request.log.error({ err: error, cacheKey }, '[Cacheable] Failed to cache result');
          }
        });

        return result;
      } catch (error) {
        // On error, execute original method without caching
        if (request.log) {
          request.log.error({ err: error }, '[Cacheable] Error in cache decorator');
        }
        return originalMethod.call(this, request, reply);
      }
    };

    return descriptor;
  };
}

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
export function CacheEvict(options: CacheEvictOptions) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      request: FastifyRequest,
      reply: FastifyReply
    ) {
      const cacheService = getCacheService(this);

      try {
        // Execute original method first
        const result = await originalMethod.call(this, request, reply);

        // Evict cache after successful execution
        if (cacheService) {
          const cacheKey = buildCacheKey(options.key, request);
          
          if (options.allEntries) {
            // Evict all keys matching pattern
            await cacheService.invalidatePattern(cacheKey);
          } else {
            // Evict single key
            await cacheService.delete(cacheKey);
          }
        }

        return result;
      } catch (error) {
        // Don't evict cache on error
        throw error;
      }
    };

    return descriptor;
  };
}

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
export function CacheEvictAll(pattern: string | ((req: FastifyRequest) => string)) {
  return CacheEvict({ key: pattern, allEntries: true });
}

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
export function CachePut(options: CacheableOptions) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      request: FastifyRequest,
      reply: FastifyReply
    ) {
      const cacheService = getCacheService(this);

      try {
        // Always execute original method
        const result = await originalMethod.call(this, request, reply);

        // Update cache with result
        if (cacheService) {
          const cacheKey = buildCacheKey(options.key, request);
          
          // Check condition if provided
          if (!options.condition || options.condition(result)) {
            await cacheService.set(cacheKey, result, options.ttl);
          }
        }

        return result;
      } catch (error) {
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Helper function to create cache key builder for common patterns
 */
export const CacheKeyBuilders = {
  /**
   * Build key from tenant ID and user ID in request params
   */
  tenantUser: (req: FastifyRequest) => {
    const params = req.params as any;
    return `tenant:${params.tenantId}:user:${params.userId}`;
  },

  /**
   * Build key from tenant ID and shard ID in request params
   */
  tenantShard: (req: FastifyRequest) => {
    const params = req.params as any;
    return `tenant:${params.tenantId}:shard:${params.shardId}`;
  },

  /**
   * Build key from tenant ID in request params
   */
  tenant: (req: FastifyRequest) => {
    const params = req.params as any;
    return `tenant:${params.tenantId}`;
  },

  /**
   * Build key from authenticated user
   */
  authUser: (req: FastifyRequest) => {
    const user = (req as any).user;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return `tenant:${user.tenantId}:user:${user.id}`;
  },
};
