/**
 * Adapter Manager Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdapterManagerService } from '../../../src/services/AdapterManagerService';
import { IntegrationConnectionService } from '../../../src/services/IntegrationConnectionService';
import { IntegrationService } from '../../../src/services/IntegrationService';
import type { IntegrationAdapter, IntegrationAdapterFactory } from '../../../src/types/adapter.types';

vi.mock('../../../src/services/AdapterRegistry', () => ({
  adapterRegistry: {
    register: vi.fn(),
    get: vi.fn(),
    has: vi.fn(),
    list: vi.fn(),
  },
}));

import { adapterRegistry } from '../../../src/services/AdapterRegistry';

describe('AdapterManagerService', () => {
  let service: AdapterManagerService;
  let mockConnectionService: IntegrationConnectionService;
  let mockIntegrationService: IntegrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectionService = {} as IntegrationConnectionService;
    mockIntegrationService = {
      getById: vi.fn().mockResolvedValue({ id: 'int-1', tenantId: 't1', userScoped: false }),
    } as any;
    service = new AdapterManagerService(mockConnectionService, mockIntegrationService);
  });

  describe('registerAdapter', () => {
    it('should delegate to adapterRegistry.register', () => {
      const factory: IntegrationAdapterFactory = { create: vi.fn() };
      service.registerAdapter('salesforce', factory);
      expect(adapterRegistry.register).toHaveBeenCalledWith('salesforce', factory);
    });
  });

  describe('getAdapter', () => {
    it('should throw when adapter not registered', async () => {
      vi.mocked(adapterRegistry.get).mockReturnValue(undefined);
      await expect(service.getAdapter('unknown', 'int-1', 't1')).rejects.toThrow(/Adapter not found/);
    });

    it('should throw when integration not found', async () => {
      const factory: IntegrationAdapterFactory = {
        create: vi.fn(() => ({}) as IntegrationAdapter),
      };
      vi.mocked(adapterRegistry.get).mockReturnValue(factory);
      vi.mocked(mockIntegrationService.getById).mockRejectedValue(new Error('Not found'));
      await expect(service.getAdapter('salesforce', 'int-1', 't1')).rejects.toThrow('Not found');
    });

    it('should return cached adapter on second call', async () => {
      const adapter = { connect: vi.fn(), disconnect: vi.fn() } as unknown as IntegrationAdapter;
      const factory: IntegrationAdapterFactory = {
        create: vi.fn(() => adapter),
      };
      vi.mocked(adapterRegistry.get).mockReturnValue(factory);
      const first = await service.getAdapter('salesforce', 'int-1', 't1');
      const second = await service.getAdapter('salesforce', 'int-1', 't1');
      expect(first).toBe(second);
      expect(factory.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('connectAdapter', () => {
    it('should call adapter.connect when present', async () => {
      const connect = vi.fn().mockResolvedValue(undefined);
      const adapter = { connect } as any;
      await service.connectAdapter(adapter, {});
      expect(connect).toHaveBeenCalledWith({});
    });

    it('should no-op when adapter has no connect', async () => {
      const adapter = {} as any;
      await expect(service.connectAdapter(adapter, {})).resolves.toBeUndefined();
    });
  });

  describe('disconnectAdapter', () => {
    it('should call adapter.disconnect when present', async () => {
      const disconnect = vi.fn().mockResolvedValue(undefined);
      const adapter = { disconnect } as any;
      await service.disconnectAdapter(adapter);
      expect(disconnect).toHaveBeenCalled();
    });
  });

  describe('testAdapterConnection', () => {
    it('should return success when adapter.testConnection succeeds', async () => {
      const adapter = { testConnection: vi.fn().mockResolvedValue({ success: true }) } as any;
      const result = await service.testAdapterConnection(adapter);
      expect(result.success).toBe(true);
    });

    it('should return success: false when testConnection fails', async () => {
      const adapter = { testConnection: vi.fn().mockResolvedValue({ success: false, error: 'fail' }) } as any;
      const result = await service.testAdapterConnection(adapter);
      expect(result.success).toBe(false);
      expect(result.error).toBe('fail');
    });
  });
});
