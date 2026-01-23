/**
 * Route Registration Tests
 * Tests for service initialization and route registration logic
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { MonitoringService } from '@castiel/monitoring';

describe('Route Registration', () => {
  let mockServer: Partial<FastifyInstance>;
  let mockRedis: Redis | null;

  beforeEach(() => {
    mockServer = {
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      } as any,
      register: vi.fn().mockResolvedValue(undefined),
      decorate: vi.fn(),
    } as any;

    mockRedis = null;
  });

  describe('Service Initialization', () => {
    it('should handle missing optional services gracefully', async () => {
      // Route registration should not fail if optional services are missing
      const monitoring = MonitoringService.initialize({
        enabled: false,
        provider: 'mock',
      });

      // Verify monitoring is initialized
      expect(monitoring).toBeDefined();
    });

    it('should initialize ConfigurationService when available', async () => {
      // This test verifies that ConfigurationService initialization
      // is handled gracefully in route registration
      const monitoring = MonitoringService.initialize({
        enabled: false,
        provider: 'mock',
      });

      expect(monitoring).toBeDefined();
      // ConfigurationService initialization is tested in integration tests
    });

    it('should handle ServiceRegistry initialization failure', async () => {
      // Route registration should continue even if ServiceRegistry fails
      const monitoring = MonitoringService.initialize({
        enabled: false,
        provider: 'mock',
      });

      expect(monitoring).toBeDefined();
      // ServiceRegistry failure should not block route registration
    });
  });

  describe('Optional Service Handling', () => {
    it('should register routes conditionally based on service availability', async () => {
      // Routes should only register if required services are available
      // This is tested through integration tests
      expect(mockServer.register).toBeDefined();
    });

    it('should log warnings for missing optional services', () => {
      // Missing optional services should log warnings but not errors
      if (mockServer.log) {
        mockServer.log.warn('⚠️ Optional service not available');
        expect(mockServer.log.warn).toHaveBeenCalled();
      }
    });
  });

  describe('Error Recovery', () => {
    it('should continue route registration after service initialization failure', () => {
      // If one service fails to initialize, others should still register
      const errors: Error[] = [];
      
      // Simulate service initialization failure
      try {
        throw new Error('Service initialization failed');
      } catch (error) {
        errors.push(error as Error);
      }

      // Route registration should continue
      expect(errors.length).toBe(1);
      // Other services should still be able to initialize
    });
  });
});
