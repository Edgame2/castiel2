/**
 * ProxyService Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ProxyService } from '../../../src/services/ProxyService';

vi.mock('axios', () => ({
  default: { request: vi.fn() },
}));

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
    beforeEach(() => {
      vi.mocked(axios.request).mockResolvedValue({ status: 200, data: {} });
    });

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

      expect(axios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          url: 'http://localhost:3021/api/v1/auth/login',
          data: undefined,
        })
      );
      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({});
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

      expect(axios.request).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'http://localhost:3022/me', method: 'get' })
      );
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

      expect(axios.request).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining('?token=abc') })
      );
    });

    it('forwards backend status code (e.g. 401)', async () => {
      proxyService.registerRoute({
        path: '/api/auth',
        service: 'auth',
        serviceUrl: 'http://localhost:3021',
        stripPrefix: true,
        pathRewrite: '/api/v1/auth',
      });
      vi.mocked(axios.request).mockResolvedValueOnce({ status: 401, data: { error: 'Invalid credentials' } });

      const mapping = proxyService.findRoute('/api/auth/login');
      const request = { url: '/api/auth/login', method: 'POST', headers: {}, body: { email: 'a@b.com', password: 'x' } } as any;
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() } as any;

      await proxyService.proxyRequest(request, reply, mapping!);

      expect(reply.code).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Invalid credentials' });
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
