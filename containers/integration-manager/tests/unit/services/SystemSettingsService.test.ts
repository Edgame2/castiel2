/**
 * System Settings Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemSettingsService } from '../../../src/services/SystemSettingsService';

const mockGetSettings = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock('../../../src/repositories/SystemSettingsRepository', () => ({
  SystemSettingsRepository: vi.fn().mockImplementation(function (this: any) {
    this.getSettings = mockGetSettings;
    this.updateSettings = mockUpdateSettings;
  }),
}));

describe('SystemSettingsService', () => {
  let service: SystemSettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SystemSettingsService();
  });

  describe('getSettings', () => {
    it('should return repository settings when present', async () => {
      const settings = { rateLimits: {}, capacity: {}, queues: [], featureFlags: {} };
      mockGetSettings.mockResolvedValue(settings);
      const result = await service.getSettings();
      expect(result).toEqual(settings);
    });

    it('should return default settings when repository returns null', async () => {
      mockGetSettings.mockResolvedValue(null);
      const result = await service.getSettings();
      expect(result).toBeDefined();
      expect(result.rateLimits).toBeDefined();
      expect(result.capacity).toBeDefined();
    });
  });

  describe('updateSettings', () => {
    it('should delegate to repository', async () => {
      const updates = { rateLimits: { requestsPerMinute: 100 } };
      const updated = { ...updates, updatedBy: 'admin' };
      mockUpdateSettings.mockResolvedValue(updated);
      const result = await service.updateSettings(updates, 'admin');
      expect(mockUpdateSettings).toHaveBeenCalledWith(updates, 'admin');
      expect(result).toEqual(updated);
    });
  });

  describe('getRateLimits', () => {
    it('should return rateLimits from settings', async () => {
      mockGetSettings.mockResolvedValue({ rateLimits: { requestsPerMinute: 50 } });
      const result = await service.getRateLimits();
      expect(result).toEqual({ requestsPerMinute: 50 });
    });
  });

  describe('updateRateLimits', () => {
    it('should delegate to updateSettings with rateLimits', async () => {
      const rateLimits = { requestsPerMinute: 60 };
      mockUpdateSettings.mockResolvedValue({ rateLimits });
      const result = await service.updateRateLimits(rateLimits, 'admin');
      expect(mockUpdateSettings).toHaveBeenCalledWith({ rateLimits }, 'admin');
      expect(result).toEqual(rateLimits);
    });
  });
});
