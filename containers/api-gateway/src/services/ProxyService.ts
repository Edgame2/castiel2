/**
 * Proxy Service
 * Handles request proxying to backend microservices
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ServiceClient } from '@coder/shared';

/**
 * Route mapping configuration
 */
export interface RouteMapping {
  path: string;
  service: string;
  serviceUrl: string;
  stripPrefix?: boolean;
}

/**
 * Proxy Service
 * Manages service clients and routing
 */
export class ProxyService {
  private serviceClients: Map<string, ServiceClient> = new Map();
  private routeMappings: RouteMapping[] = [];

  /**
   * Register a route mapping
   */
  registerRoute(mapping: RouteMapping): void {
    this.routeMappings.push(mapping);
    
    // Create service client if not exists
    if (!this.serviceClients.has(mapping.service)) {
      const client = new ServiceClient({
        baseURL: mapping.serviceUrl,
        timeout: 30000,
        retries: 3,
        circuitBreaker: {
          enabled: true,
          threshold: 5,
          timeout: 30000,
        },
      });
      this.serviceClients.set(mapping.service, client);
    }
  }

  /**
   * Find route mapping for request path
   */
  findRoute(path: string): RouteMapping | undefined {
    // Sort by path length (longest first) to match most specific routes first
    const sorted = [...this.routeMappings].sort((a, b) => b.path.length - a.path.length);
    
    for (const mapping of sorted) {
      if (path.startsWith(mapping.path)) {
        return mapping;
      }
    }
    
    return undefined;
  }

  /**
   * Proxy request to backend service
   */
  async proxyRequest(
    request: FastifyRequest,
    reply: FastifyReply,
    mapping: RouteMapping
  ): Promise<void> {
    const client = this.serviceClients.get(mapping.service);
    if (!client) {
      reply.code(503).send({ error: 'Service unavailable' });
      return;
    }

    try {
      // Build target URL
      let targetPath = request.url;
      if (mapping.stripPrefix) {
        targetPath = request.url.replace(mapping.path, '');
        if (!targetPath.startsWith('/')) {
          targetPath = '/' + targetPath;
        }
      }

      // Prepare headers (forward important headers, add X-Tenant-ID)
      const headers: Record<string, string> = {
        'Content-Type': request.headers['content-type'] || 'application/json',
      };

      // Forward X-Tenant-ID (already set by tenant validation middleware)
      if (request.headers['x-tenant-id']) {
        headers['X-Tenant-ID'] = request.headers['x-tenant-id'] as string;
      }

      // Forward Authorization if present
      if (request.headers.authorization) {
        headers['Authorization'] = request.headers.authorization as string;
      }

      // Forward X-Request-ID
      if (request.headers['x-request-id']) {
        headers['X-Request-ID'] = request.headers['x-request-id'] as string;
      }

      // Make request to backend service
      const method = request.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
      const body = (request.body as any) || undefined;

      let response: any;
      const requestConfig = { headers };
      
      if (method === 'get' || method === 'delete') {
        response = await client[method](targetPath, requestConfig);
      } else {
        response = await client[method](targetPath, body, requestConfig);
      }

      // Forward response (preserve status code if available)
      const statusCode = (response as any)?.statusCode || 200;
      reply.code(statusCode).send(response);
    } catch (error: any) {
      // Handle errors
      if (error.response) {
        // Backend service error
        reply.code(error.response.status || 500).send(error.response.data || { error: 'Service error' });
      } else if (error.message?.includes('Circuit breaker')) {
        // Circuit breaker open
        reply.code(503).send({ error: 'Service temporarily unavailable' });
      } else {
        // Network or other error
        reply.code(502).send({ error: 'Bad gateway' });
      }
    }
  }

  /**
   * Get all registered routes
   */
  getRoutes(): RouteMapping[] {
    return [...this.routeMappings];
  }
}

