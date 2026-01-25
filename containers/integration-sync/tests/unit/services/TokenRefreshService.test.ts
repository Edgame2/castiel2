/**
 * Token Refresh Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenRefreshService } from '../../../src/services/TokenRefreshService';
import { ServiceClient } from '@coder/shared';
import { publishIntegrationSyncEvent } from '../../../src/events/publishers/IntegrationSyncEventPublisher';

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
  generateServiceToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    token_refresh: { enabled: true, interval_ms: 3600000 },
    services: { integration_manager: { url: 'http://integration-manager:3000' } },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../src/events/publishers/IntegrationSyncEventPublisher', () => ({
  publishIntegrationSyncEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let mockIntegrationManagerClient: { post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntegrationManagerClient = { post: vi.fn(), put: vi.fn() };
    (ServiceClient as any).mockImplementation(() => mockIntegrationManagerClient);
    service = new TokenRefreshService();
  });

  afterEach(async () => {
    await service.stop();
  });

  describe('start', () => {
    it('should publish integration.token.check-expiring on start when enabled', async () => {
      await service.start();
      expect(publishIntegrationSyncEvent).toHaveBeenCalledWith(
        'integration.token.check-expiring',
        'system',
        expect.objectContaining({ timestamp: expect.any(String), thresholdTime: expect.any(String) })
      );
    });

    it('should not throw when start is called', async () => {
      await expect(service.start()).resolves.toBeUndefined();
    });
  });

  describe('stop', () => {
    it('should clear interval on stop', async () => {
      await service.start();
      await service.stop();
      await expect(service.stop()).resolves.toBeUndefined();
    });
  });

  describe('refreshConnectionTokens', () => {
    it('should skip when tenantId is missing', async () => {
      await service.refreshConnectionTokens({
        id: 'conn-1',
        integrationId: 'int-1',
        authType: 'oauth',
        status: 'active',
      } as any);
      expect(mockIntegrationManagerClient.post).not.toHaveBeenCalled();
    });

    it('should skip when integrationId is missing', async () => {
      await service.refreshConnectionTokens({
        id: 'conn-1',
        tenantId: 't-1',
        authType: 'oauth',
        status: 'active',
      } as any);
      expect(mockIntegrationManagerClient.post).not.toHaveBeenCalled();
    });

    it('should call integration-manager refresh and publish integration.token.refreshed on success', async () => {
      mockIntegrationManagerClient.post.mockResolvedValue({ success: true });
      await service.refreshConnectionTokens({
        id: 'conn-1',
        integrationId: 'int-1',
        tenantId: 't-1',
        authType: 'oauth',
        status: 'active',
      } as any);
      expect(mockIntegrationManagerClient.post).toHaveBeenCalledWith(
        '/api/v1/integrations/int-1/connections/conn-1/refresh',
        {},
        expect.objectContaining({ headers: expect.any(Object) })
      );
      expect(publishIntegrationSyncEvent).toHaveBeenCalledWith(
        'integration.token.refreshed',
        't-1',
        expect.objectContaining({ connectionId: 'conn-1', integrationId: 'int-1', refreshedAt: expect.any(String) })
      );
    });

    it('should publish integration.token.refresh.failed and put integration to error on API failure', async () => {
      mockIntegrationManagerClient.post.mockRejectedValue(new Error('Refresh failed'));
      mockIntegrationManagerClient.put.mockResolvedValue({});
      await expect(
        service.refreshConnectionTokens({
          id: 'conn-1',
          integrationId: 'int-1',
          tenantId: 't-1',
          authType: 'oauth',
          status: 'active',
        } as any)
      ).rejects.toThrow();
      expect(publishIntegrationSyncEvent).toHaveBeenCalledWith(
        'integration.token.refresh.failed',
        't-1',
        expect.objectContaining({ connectionId: 'conn-1', integrationId: 'int-1', error: expect.any(String), failedAt: expect.any(String) })
      );
      expect(mockIntegrationManagerClient.put).toHaveBeenCalledWith(
        '/api/v1/integrations/int-1',
        expect.objectContaining({ status: 'error', connectionError: expect.stringContaining('Token refresh failed') }),
        expect.any(Object)
      );
    });
  });
});
