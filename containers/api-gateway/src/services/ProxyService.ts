/**
 * Proxy Service
 * Handles request proxying to backend microservices
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import { ServiceClient } from '@coder/shared';

/**
 * Route mapping configuration
 */
export interface RouteMapping {
  path: string;
  service: string;
  serviceUrl: string;
  stripPrefix?: boolean;
  /** When set, replace this path prefix with pathRewrite when forwarding (e.g. /api/auth -> /api/v1/auth) */
  pathRewrite?: string;
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
      let targetPath = request.url.split('?')[0];
      const query = request.url.includes('?') ? '?' + request.url.split('?').slice(1).join('?') : '';
      if (mapping.pathRewrite !== undefined) {
        // Replace path prefix with pathRewrite (e.g. /api/auth -> /api/v1/auth)
        targetPath = request.url.startsWith(mapping.path)
          ? mapping.pathRewrite + targetPath.slice(mapping.path.length)
          : targetPath;
      } else if (mapping.stripPrefix) {
        targetPath = targetPath.replace(mapping.path, '');
        if (!targetPath.startsWith('/')) {
          targetPath = '/' + targetPath;
        }
      }
      targetPath = targetPath + query;

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

      // Make request with axios so we preserve backend HTTP status (ServiceClient returns only body)
      const method = request.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
      const body = (request.body as any) || undefined;
      const baseURL = mapping.serviceUrl.replace(/\/$/, '');
      const fullUrl = targetPath.startsWith('http') ? targetPath : `${baseURL}${targetPath}`;

      const res = await axios.request({
        method,
        url: fullUrl,
        data: body,
        headers,
        timeout: 30000,
        validateStatus: () => true,
      });
      reply.code(res.status).send(res.data);
    } catch (error: any) {
      if (error.response) {
        reply.code(error.response.status || 500).send(error.response.data || { error: 'Service error' });
      } else if (error.message?.includes('Circuit breaker')) {
        reply.code(503).send({ error: 'Service temporarily unavailable' });
      } else {
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

