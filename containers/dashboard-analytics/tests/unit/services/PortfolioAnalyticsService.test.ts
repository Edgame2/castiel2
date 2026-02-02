/**
 * Unit tests for PortfolioAnalyticsService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as config from '../../../src/config';
import { PortfolioAnalyticsService } from '../../../src/services/PortfolioAnalyticsService';

const mockGet = vi.fn();

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: { get: ReturnType<typeof vi.fn> }) {
    this.get = mockGet;
    return this;
  }),
  EventPublisher: vi.fn().mockImplementation(function (this: { publish: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }) {
    this.publish = vi.fn().mockResolvedValue(undefined);
    this.close = vi.fn();
    return this;
  }),
  authenticateRequest: vi.fn(() => vi.fn()),
  tenantEnforcementMiddleware: vi.fn(() => vi.fn()),
  setupJWT: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({ services: { shard_manager: { url: '' } } })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockLoadConfig = vi.mocked(config).loadConfig;

describe('PortfolioAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue({
      services: { shard_manager: { url: '' } },
    } as any);
  });

  describe('getSummary', () => {
    it('returns zeros when shard_manager url is not configured', async () => {
      const service = new PortfolioAnalyticsService();
      const result = await service.getSummary('p1', 'tenant-1');
      expect(result).toEqual({ opportunityCount: 0, accountsCount: 0, totalPipeline: 0 });
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('returns counts and totalPipeline when get returns items', async () => {
      mockLoadConfig.mockReturnValue({
        services: { shard_manager: { url: 'http://shard-manager' } },
      } as any);
      mockGet
        .mockResolvedValueOnce({ items: [{ structuredData: { Amount: 100 } }, { structuredData: { Amount: 200 } }] })
        .mockResolvedValueOnce({ items: [{ id: 'a1' }, { id: 'a2' }] });
      const service = new PortfolioAnalyticsService();
      const result = await service.getSummary('p1', 'tenant-1');
      expect(result.opportunityCount).toBe(2);
      expect(result.accountsCount).toBe(2);
      expect(result.totalPipeline).toBe(300);
    });
  });

  describe('getAccounts', () => {
    it('returns empty array when url is not configured', async () => {
      const service = new PortfolioAnalyticsService();
      const result = await service.getAccounts('p1', 'tenant-1');
      expect(result).toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('returns mapped accounts when get returns items', async () => {
      mockLoadConfig.mockReturnValue({
        services: { shard_manager: { url: 'http://shard-manager' } },
      } as any);
      mockGet.mockResolvedValueOnce({
        items: [
          { id: 'acc-1', structuredData: { Name: 'Account One' } },
          { id: 'acc-2', structuredData: { Name: 'Account Two' } },
        ],
      });
      const service = new PortfolioAnalyticsService();
      const result = await service.getAccounts('p1', 'tenant-1');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'acc-1', name: 'Account One' });
      expect(result[1]).toEqual({ id: 'acc-2', name: 'Account Two' });
    });
  });

  describe('getOpportunitiesForAccount', () => {
    it('returns empty array when url is not configured', async () => {
      const service = new PortfolioAnalyticsService();
      const result = await service.getOpportunitiesForAccount('acc-1', 'tenant-1');
      expect(result).toEqual([]);
    });
  });

  describe('getActivitiesForOpportunity', () => {
    it('returns empty array when url is not configured', async () => {
      const service = new PortfolioAnalyticsService();
      const result = await service.getActivitiesForOpportunity('opp-1', 'tenant-1');
      expect(result).toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
