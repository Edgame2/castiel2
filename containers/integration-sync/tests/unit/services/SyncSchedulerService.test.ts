/**
 * Sync Scheduler Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncSchedulerService } from '../../../src/services/SyncSchedulerService';
import { publishIntegrationSyncEvent } from '../../../src/events/publishers/IntegrationSyncEventPublisher';

const mockIntegrationManagerClient = vi.hoisted(() => ({ put: vi.fn() }));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: unknown, _config: { baseURL?: string }) {
    return mockIntegrationManagerClient;
  }),
  generateServiceToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    sync_scheduler: { enabled: true, interval_ms: 60000 },
    services: { integration_manager: { url: 'http://integration-manager:3000' } },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../src/events/publishers/IntegrationSyncEventPublisher', () => ({
  publishIntegrationSyncEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('SyncSchedulerService', () => {
  let service: SyncSchedulerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SyncSchedulerService();
  });

  afterEach(async () => {
    if (service) await service.stop();
  });

  describe('start', () => {
    it('should publish integration.sync.check-due on start when enabled', async () => {
      await service.start();
      expect(publishIntegrationSyncEvent).toHaveBeenCalledWith(
        'integration.sync.check-due',
        'system',
        expect.objectContaining({ timestamp: expect.any(String), checkType: 'scheduled' })
      );
    });

    it('should not throw when start is called', async () => {
      await expect(service.start()).resolves.toBeUndefined();
    });
  });

  describe('stop', () => {
    it('should clear scheduler interval on stop', async () => {
      await service.start();
      await service.stop();
      await expect(service.stop()).resolves.toBeUndefined();
    });
  });
});
