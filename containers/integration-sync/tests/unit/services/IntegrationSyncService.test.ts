/**
 * Integration Sync Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationSyncService } from '../../../src/services/IntegrationSyncService';
import { getContainer } from '@coder/shared/database';

const mockClients = vi.hoisted(() => ({
  integrationManager: { get: vi.fn(), post: vi.fn() },
  shardManager: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  secretManagement: { get: vi.fn() },
}));

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: unknown, config: { baseURL?: string }) {
    if (config?.baseURL?.includes('integration-manager')) return mockClients.integrationManager;
    if (config?.baseURL?.includes('shard-manager')) return mockClients.shardManager;
    if (config?.baseURL?.includes('secret-management')) return mockClients.secretManagement;
    return { get: vi.fn(), post: vi.fn(), put: vi.fn() };
  }),
  generateServiceToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      integration_manager: { url: 'http://integration-manager:3000' },
      shard_manager: { url: 'http://shard-manager:3000' },
      secret_management: { url: 'http://secret-management:3000' },
    },
    database: {
      containers: {
        integration_sync_tasks: 'integration_sync_tasks',
      },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../../src/events/publishers/IntegrationSyncEventPublisher', () => ({
  publishIntegrationSyncEvent: vi.fn(),
}));

describe('IntegrationSyncService', () => {
  let service: IntegrationSyncService;
  let mockContainer: ReturnType<typeof createMockContainer>;

  function createMockContainer() {
    return {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        })),
      },
      item: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: null }), replace: vi.fn().mockResolvedValue({}) })),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = createMockContainer();
    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
    service = new IntegrationSyncService();
  });

  describe('createSyncTask', () => {
    it('should create a sync task successfully', async () => {
      const tenantId = 'tenant-123';
      const integrationId = 'integration-123';
      const direction = 'bidirectional' as const;

      const mockTask = {
        taskId: 'task-123',
        tenantId,
        integrationId,
        direction,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContainer.items.create.mockResolvedValue({
        resource: mockTask,
      });

      const result = await service.createSyncTask(tenantId, integrationId, direction);

      expect(result).toHaveProperty('taskId');
      expect(result.direction).toBe(direction);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should handle errors during task creation', async () => {
      const tenantId = 'tenant-123';
      const integrationId = 'integration-123';
      const direction = 'bidirectional' as const;

      mockContainer.items.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createSyncTask(tenantId, integrationId, direction)
      ).rejects.toThrow();
    });
  });

  describe('executeSyncTask', () => {
    it('should execute a sync task successfully', async () => {
      const tenantId = 'tenant-123';
      const taskId = 'task-123';
      const mockTask = {
        taskId,
        tenantId,
        integrationId: 'integration-123',
        direction: 'bidirectional' as const,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const readMock = vi.fn().mockResolvedValue({ resource: mockTask });
      const replaceMock = vi.fn().mockResolvedValue({});
      mockContainer.item.mockReturnValue({ read: readMock, replace: replaceMock });

      mockClients.integrationManager.get.mockResolvedValue({
        id: 'integration-123',
        type: 'salesforce',
        credentials: {},
      });

      (getContainer as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
        if (name === 'integration_executions') {
          return {
            items: {
              create: vi.fn().mockResolvedValue({}),
              query: vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
              }),
            },
            item: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: null }), replace: vi.fn().mockResolvedValue({}) })),
          };
        }
        return mockContainer;
      });

      const result = await service.executeSyncTask(taskId, tenantId);

      expect(result).toHaveProperty('executionId');
      expect(replaceMock).toHaveBeenCalled();
    });

    it('should handle task not found', async () => {
      const tenantId = 'tenant-123';
      const taskId = 'non-existent';

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
        replace: vi.fn(),
      });

      await expect(service.executeSyncTask(taskId, tenantId)).rejects.toThrow();
    });
  });

  describe('resolveConflict', () => {
    it('should resolve a conflict successfully', async () => {
      const tenantId = 'tenant-123';
      const conflictId = 'conflict-123';
      const resolvedBy = 'user-123';
      const resolution = { strategy: 'use_local' as const, resolvedData: { field: 'value' } };

      const mockConflict = {
        id: conflictId,
        tenantId,
        localData: { field: 'local' },
        remoteData: { field: 'remote' },
        status: 'pending',
        resolutionStrategy: undefined as any,
        resolved: false,
        resolvedAt: undefined as any,
        resolvedBy: undefined as any,
        updatedAt: new Date(),
      };

      (getContainer as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
        if (name === 'integration_conflicts') {
          return {
            item: vi.fn(() => ({
              read: vi.fn().mockResolvedValue({ resource: { ...mockConflict } }),
              replace: vi.fn().mockResolvedValue({}),
            })),
          };
        }
        return mockContainer;
      });

      const result = await service.resolveConflict(conflictId, tenantId, resolution, resolvedBy);

      expect(result).toHaveProperty('id');
      expect(result.resolved).toBe(true);
    });
  });
});
