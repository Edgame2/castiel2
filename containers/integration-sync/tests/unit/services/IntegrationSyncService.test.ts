/**
 * Integration Sync Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationSyncService } from '../../../src/services/IntegrationSyncService';
import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
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
  let mockIntegrationManagerClient: any;
  let mockShardManagerClient: any;
  let mockSecretManagementClient: any;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock container
    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
        read: vi.fn(),
        replace: vi.fn(),
      },
    };
    (getContainer as any).mockReturnValue(mockContainer);

    // Mock service clients
    mockIntegrationManagerClient = {
      get: vi.fn(),
      post: vi.fn(),
    };
    mockShardManagerClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    };
    mockSecretManagementClient = {
      get: vi.fn(),
    };

    (ServiceClient as any).mockImplementation((config: any) => {
      if (config.baseURL?.includes('integration-manager')) {
        return mockIntegrationManagerClient;
      }
      if (config.baseURL?.includes('shard-manager')) {
        return mockShardManagerClient;
      }
      if (config.baseURL?.includes('secret-management')) {
        return mockSecretManagementClient;
      }
      return {};
    });

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

      // Mock existing task
      mockContainer.items.read.mockResolvedValue({
        resource: {
          id: taskId,
          tenantId,
          integrationId: 'integration-123',
          direction: 'bidirectional',
          status: 'pending',
        },
      });

      // Mock integration
      mockIntegrationManagerClient.get.mockResolvedValue({
        id: 'integration-123',
        type: 'salesforce',
        credentials: {},
      });

      // Mock sync execution
      const mockExecution = {
        executionId: 'exec-123',
        taskId,
        status: 'completed',
        syncedCount: 10,
        conflicts: [],
      };

      // Mock task update
      mockContainer.items.replace.mockResolvedValue({
        resource: {
          id: taskId,
          status: 'completed',
        },
      });

      const result = await service.executeSyncTask(taskId, tenantId);

      expect(result).toHaveProperty('executionId');
      expect(mockContainer.items.replace).toHaveBeenCalled();
    });

    it('should handle task not found', async () => {
      const tenantId = 'tenant-123';
      const taskId = 'non-existent';

      mockContainer.items.read.mockResolvedValue({
        resource: null,
      });

      await expect(
        service.executeSyncTask(taskId, tenantId)
      ).rejects.toThrow();
    });
  });

  describe('resolveConflict', () => {
    it('should resolve a conflict successfully', async () => {
      const tenantId = 'tenant-123';
      const conflictId = 'conflict-123';
      const resolution = {
        strategy: 'use_local' as const,
        resolvedData: { field: 'value' },
      };

      // Mock conflict
      const mockConflict = {
        id: conflictId,
        tenantId,
        localData: { field: 'local' },
        remoteData: { field: 'remote' },
        status: 'pending',
      };

      mockContainer.items.read.mockResolvedValue({
        resource: mockConflict,
      });

      // Mock resolution
      mockContainer.items.replace.mockResolvedValue({
        resource: {
          ...mockConflict,
          ...resolution,
          status: 'resolved',
        },
      });

      const result = await service.resolveConflict(tenantId, conflictId, resolution);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('resolved');
      expect(mockContainer.items.replace).toHaveBeenCalled();
    });
  });
});
