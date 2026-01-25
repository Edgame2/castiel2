/**
 * Sync Scheduler Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncSchedulerService } from '../../../src/services/SyncSchedulerService';
import { ServiceClient } from '@coder/shared';
import { publishIntegrationSyncEvent } from '../../../src/events/publishers/IntegrationSyncEventPublisher';

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
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
  let mockIntegrationManagerClient: { put: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntegrationManagerClient = { put: vi.fn() };
    (ServiceClient as any).mockImplementation(() => mockIntegrationManagerClient);
    service = new SyncSchedulerService();
  });

  afterEach(async () => {
    await service.stop();
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
