/**
 * HTTP Response Caching Middleware
 * 
 * Implements HTTP response caching with ETag support for conditional requests
 * Caches GET requests only, with configurable TTL and cache key generation
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CacheService } from '../services/cache.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { createHash } from 'crypto';

export interface ResponseCacheOptions {
  /**
   * Cache service instance
   */
  cacheService: CacheService;
  
  /**
   * Monitoring provider
   */
  monitoring: IMonitoringProvider;
  
  /**
   * Default TTL in seconds (default: 5 minutes)
   */
  defaultTTL?: number;
  
  /**
   * Paths to exclude from caching
   */
  excludePaths?: string[];
  
  /**
   * Whether to enable ETag support (default: true)
   */
  enableETag?: boolean;
  
  /**
   * Whether to include user context in cache key (default: true)
   * When true, responses are cached per user/tenant
   */
  includeUserContext?: boolean;
}

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  payload: any;
  etag: string;
  cachedAt: number;
}

/**
 * Generate ETag from response content
 */
function generateETag(content: any): string {
  const contentString = typeof content === 'string' 
    ? content 
    : JSON.stringify(content);
  return createHash('md5').update(contentString).digest('hex');
}

/**
 * Build cache key from request
 */
function buildCacheKey(
  request: FastifyRequest,
  includeUserContext: boolean
): string {
  const parts: string[] = ['http-cache'];
  
  // Include method and path
  parts.push(request.method.toLowerCase());
  parts.push(request.url.split('?')[0]); // Path without query
  
  // Include query parameters (sorted for consistency)
  if (request.query) {
    const queryString = typeof request.query === 'string'
      ? request.query
      : Object.entries(request.query as Record<string, any>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('&');
    if (queryString) {
      parts.push(queryString);
    }
  }
  
  // Include user context if enabled
  if (includeUserContext) {
    const user = (request as any).user;
    if (user) {
      parts.push(`tenant:${user.tenantId || 'unknown'}`);
      parts.push(`user:${user.id || user.userId || 'anonymous'}`);
    }
  }
  
  return parts.join(':');
}

/**
 * Check if request should be cached
 */
function shouldCache(
  request: FastifyRequest,
  reply: FastifyReply,
  excludePaths: string[]
): boolean {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return false;
  }
  
  // Don't cache if response already has Cache-Control: no-cache or no-store
  const cacheControl = reply.getHeader('Cache-Control');
  if (cacheControl && typeof cacheControl === 'string') {
    if (cacheControl.includes('no-cache') || cacheControl.includes('no-store')) {
      return false;
    }
  }
  
  // Don't cache error responses
  if (reply.statusCode >= 400) {
    return false;
  }
  
  // Check excluded paths
  if (excludePaths.some(path => request.url.startsWith(path))) {
    return false;
  }
  
  return true;
}

/**
 * Create response caching middleware
 */
export function createResponseCacheMiddleware(options: ResponseCacheOptions) {
  const {
    cacheService,
    monitoring,
    defaultTTL = 5 * 60, // 5 minutes
    excludePaths = ['/health', '/ready', '/metrics', '/graphql'],
    enableETag = true,
    includeUserContext = true,
  } = options;

  /**
   * onRequest hook: Check cache and ETag
   */
  const onRequestHook = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    // Only process GET requests
    if (request.method !== 'GET') {
      return;
    }

    // Check excluded paths
    if (excludePaths.some(path => request.url.startsWith(path))) {
      return;
    }

    try {
      const cacheKey = buildCacheKey(request, includeUserContext);
      const cached = await cacheService.get<CachedResponse>(cacheKey);

      if (cached) {
        // Check If-None-Match header for ETag validation
        if (enableETag && cached.etag) {
          const ifNoneMatch = request.headers['if-none-match'];
          if (ifNoneMatch === `"${cached.etag}"` || ifNoneMatch === cached.etag) {
            // Return 304 Not Modified
            reply.code(304);
            reply.header('ETag', `"${cached.etag}"`);
            reply.header('Cache-Control', 'public, max-age=300'); // 5 minutes
            reply.send();
            
            monitoring.trackEvent('http-cache.etag.hit', {
              path: request.url,
              method: request.method,
            });
            return;
          }
        }

        // Return cached response
        reply.code(cached.statusCode);
        
        // Set cached headers (excluding some that shouldn't be cached)
        const excludeHeaders = ['content-length', 'transfer-encoding', 'connection'];
        for (const [key, value] of Object.entries(cached.headers)) {
          if (!excludeHeaders.includes(key.toLowerCase())) {
            reply.header(key, value);
          }
        }
        
        // Add cache headers
        if (enableETag && cached.etag) {
          reply.header('ETag', `"${cached.etag}"`);
        }
        reply.header('Cache-Control', 'public, max-age=300'); // 5 minutes
        reply.header('X-Cache', 'HIT');
        
        reply.send(cached.payload);
        
        monitoring.trackEvent('http-cache.hit', {
          path: request.url,
          method: request.method,
        });
        
        // Mark request as handled to prevent further processing
        (request as any).__cached = true;
      } else {
        monitoring.trackEvent('http-cache.miss', {
          path: request.url,
          method: request.method,
        });
      }
    } catch (error) {
      // Log but don't fail - cache failures shouldn't break requests
      monitoring.trackException(error as Error, {
        operation: 'http-cache.onRequest',
        path: request.url,
      });
    }
  };

  /**
   * onSend hook: Cache successful responses
   */
  const onSendHook = async (
    request: FastifyRequest,
    reply: FastifyReply,
    payload: any
  ): Promise<any> => {
    // Skip if request was already served from cache
    if ((request as any).__cached) {
      return payload;
    }

    // Only cache GET requests
    if (request.method !== 'GET') {
      return payload;
    }

    // Check if should cache
    if (!shouldCache(request, reply, excludePaths)) {
      return payload;
    }

    try {
      const cacheKey = buildCacheKey(request, includeUserContext);
      
      // Generate ETag from payload
      const etag = enableETag ? generateETag(payload) : '';
      
      // Get response headers (excluding some that shouldn't be cached)
      const excludeHeaders = ['content-length', 'transfer-encoding', 'connection', 'x-cache'];
      const headers: Record<string, string> = {};
      const replyHeaders = reply.getHeaders();
      for (const [key, value] of Object.entries(replyHeaders)) {
        if (!excludeHeaders.includes(key.toLowerCase()) && value !== undefined) {
          headers[key] = typeof value === 'string' ? value : String(value);
        }
      }

      // Create cached response
      const cachedResponse: CachedResponse = {
        statusCode: reply.statusCode,
        headers,
        payload,
        etag,
        cachedAt: Date.now(),
      };

      // Cache the response (non-blocking)
      cacheService.set(cacheKey, cachedResponse, defaultTTL).catch((error) => {
        monitoring.trackException(error as Error, {
          operation: 'http-cache.onSend',
          path: request.url,
        });
      });

      // Add ETag header if enabled
      if (enableETag && etag) {
        reply.header('ETag', `"${etag}"`);
      }
      
      // Add Cache-Control header
      reply.header('Cache-Control', 'public, max-age=300'); // 5 minutes
      reply.header('X-Cache', 'MISS');
    } catch (error) {
      // Log but don't fail - cache failures shouldn't break responses
      monitoring.trackException(error as Error, {
        operation: 'http-cache.onSend',
        path: request.url,
      });
    }

    return payload;
  };

  return {
    onRequest: onRequestHook,
    onSend: onSendHook,
  };
}

/**
 * Register response caching middleware globally
 */
export function registerResponseCacheMiddleware(
  server: any,
  options: ResponseCacheOptions
): void {
  const middleware = createResponseCacheMiddleware(options);

  // Register hooks
  server.addHook('onRequest', middleware.onRequest);
  server.addHook('onSend', middleware.onSend);

  server.log.info('✅ HTTP response caching middleware registered');
}
