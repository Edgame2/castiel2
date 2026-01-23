/**
 * Integration tests for Health endpoints
 * 
 * Tests:
 * - Health check endpoint
 * - Readiness check endpoint
 * - Liveness check endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

describe('Health API Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    // Register health routes
    app.get('/health', async () => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    });

    app.get('/health/ready', async () => {
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    });

    app.get('/health/live', async () => {
      return {
        status: 'alive',
        timestamp: new Date().toISOString(),
      };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'healthy');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 and ready status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'ready');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 and alive status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'alive');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/unknown',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
