/**
 * ProxyService Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as shared from '@coder/shared';
import { ProxyService } from '../../../src/services/ProxyService';

const ServiceClientMock = shared.ServiceClient as ReturnType<typeof vi.fn>;

describe('ProxyService', () => {
  let proxyService: ProxyService;

  beforeEach(() => {
    proxyService = new ProxyService();
  });

  describe('findRoute', () => {
    it('returns correct mapping for /api/auth/login', () => {
      proxyService.registerRoute({
        path: '/api/auth',
        service: 'auth',
        serviceUrl: 'http://localhost:3021',
        stripPrefix: true,
        pathRewrite: '/api/v1/auth',
      });
      const mapping = proxyService.findRoute('/api/auth/login');
      expect(mapping).toBeDefined();
      expect(mapping?.service).toBe('auth');
      expect(mapping?.path).toBe('/api/auth');
    });

    it('returns correct mapping for /api/users/me', () => {
      proxyService.registerRoute({
        path: '/api/users',
        service: 'user_management',
        serviceUrl: 'http://localhost:3022',
        stripPrefix: true,
      });
      const mapping = proxyService.findRoute('/api/users/me');
      expect(mapping).toBeDefined();
      expect(mapping?.service).toBe('user_management');
    });

    it('matches longest path first', () => {
      proxyService.registerRoute({ path: '/api/v1', service: 'risk', serviceUrl: 'http://localhost:3048', stripPrefix: false });
      proxyService.registerRoute({ path: '/api/v1/ml', service: 'ml', serviceUrl: 'http://localhost:3033', stripPrefix: false });
      const mapping = proxyService.findRoute('/api/v1/ml/models');
      expect(mapping).toBeDefined();
      expect(mapping?.service).toBe('ml');
    });

    it('returns undefined for unknown path', () => {
      proxyService.registerRoute({ path: '/api/auth', service: 'auth', serviceUrl: 'http://localhost:3021', stripPrefix: true });
      const mapping = proxyService.findRoute('/api/unknown/path');
      expect(mapping).toBeUndefined();
    });
  });

  describe('proxyRequest targetPath', () => {
    it('builds /api/v1/auth path when pathRewrite is set', async () => {
      proxyService.registerRoute({
        path: '/api/auth',
        service: 'auth',
        serviceUrl: 'http://localhost:3021',
        stripPrefix: true,
        pathRewrite: '/api/v1/auth',
      });

      const mapping = proxyService.findRoute('/api/auth/login');
      expect(mapping).toBeDefined();

      const request = {
        url: '/api/auth/login',
        method: 'GET',
        headers: {},
        body: undefined,
      } as any;
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() } as any;

      await proxyService.proxyRequest(request, reply, mapping!);

      const client = ServiceClientMock.mock.results[0]?.value;
      expect(client?.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/auth\/login/), expect.any(Object));
    });

    it('strips prefix when stripPrefix is true and no pathRewrite', async () => {
      proxyService.registerRoute({
        path: '/api/users',
        service: 'user_management',
        serviceUrl: 'http://localhost:3022',
        stripPrefix: true,
      });

      const mapping = proxyService.findRoute('/api/users/me');
      const request = { url: '/api/users/me', method: 'GET', headers: {}, body: undefined } as any;
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() } as any;

      await proxyService.proxyRequest(request, reply, mapping!);

      const client = ServiceClientMock.mock.results[0]?.value;
      expect(client?.get).toHaveBeenCalledWith('/me', expect.any(Object));
    });

    it('preserves query string in targetPath', async () => {
      proxyService.registerRoute({
        path: '/api/auth',
        service: 'auth',
        serviceUrl: 'http://localhost:3021',
        stripPrefix: true,
        pathRewrite: '/api/v1/auth',
      });

      const mapping = proxyService.findRoute('/api/auth/verify-email?token=abc');
      const request = { url: '/api/auth/verify-email?token=abc', method: 'GET', headers: {}, body: undefined } as any;
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() } as any;

      await proxyService.proxyRequest(request, reply, mapping!);

      const client = ServiceClientMock.mock.results[0]?.value;
      expect(client?.get).toHaveBeenCalledWith(expect.stringContaining('?token=abc'), expect.any(Object));
    });
  });

  describe('getRoutes', () => {
    it('returns all registered routes', () => {
      proxyService.registerRoute({ path: '/api/auth', service: 'auth', serviceUrl: 'http://localhost:3021', stripPrefix: true });
      proxyService.registerRoute({ path: '/api/users', service: 'user_management', serviceUrl: 'http://localhost:3022', stripPrefix: true });
      const routes = proxyService.getRoutes();
      expect(routes).toHaveLength(2);
      expect(routes.map((r) => r.service)).toContain('auth');
      expect(routes.map((r) => r.service)).toContain('user_management');
    });
  });
});
