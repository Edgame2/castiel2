/**
 * Integration tests for Sync Task Service
 * 
 * Tests the sync task service end-to-end, including:
 * - Task creation and management
 * - Task execution lifecycle
 * - Error handling and recovery
 * - State transitions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncTaskService } from '../../src/services/sync-task.service.js';
import type { CreateSyncTaskInput, UpdateSyncTaskInput } from '../../src/types/sync-task.types.js';
import { CosmosDBService } from '../../src/services/cosmos-db.service.js';
import { MonitoringService } from '@castiel/monitoring';

describe('Sync Task Service Integration', () => {
  let syncTaskService: SyncTaskService;
  let cosmosDB: CosmosDBService;
  let monitoring: MonitoringService;
  const testTenantId = 'test-tenant-integration';
  const testUserId = 'test-user-integration';

  beforeEach(async () => {
    // Initialize monitoring
    monitoring = MonitoringService.initialize({
      enabled: false,
      provider: 'mock',
    });

    // Initialize Cosmos DB service (using test database)
    cosmosDB = new CosmosDBService(monitoring);
    await cosmosDB.initialize();

    // Initialize sync task service
    syncTaskService = new SyncTaskService(cosmosDB, monitoring);
  });

  afterEach(async () => {
    // Cleanup test data
    try {
      const container = cosmosDB.getContainer('sync-tasks');
      const tasks = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
          parameters: [{ name: '@tenantId', value: testTenantId }],
        })
        .fetchAll();

      for (const task of tasks.resources) {
        await container.item(task.id, task.tenantId).delete();
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Cleanup error:', error);
    }
  });

  describe('Task Creation', () => {
    it('should create a sync task with valid input', async () => {
      const input: CreateSyncTaskInput = {
        tenantIntegrationId: 'test-integration-1',
        name: 'Test Sync Task',
        description: 'Test description',
        schedule: {
          type: 'manual',
        },
        config: {
          direction: 'pull',
          syncMode: 'full',
        },
        enabled: true,
        tenantId: testTenantId,
        createdBy: testUserId,
      };

      const task = await syncTaskService.createTask(input);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.name).toBe('Test Sync Task');
      expect(task.tenantId).toBe(testTenantId);
      expect(task.createdBy).toBe(testUserId);
      expect(task.status).toBe('idle');
      expect(task.enabled).toBe(true);
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should reject task creation with invalid input', async () => {
      const input = {
        tenantIntegrationId: '',
        name: '',
        schedule: { type: 'invalid' as any },
        config: {},
        tenantId: testTenantId,
        createdBy: testUserId,
      } as CreateSyncTaskInput;

      await expect(syncTaskService.createTask(input)).rejects.toThrow();
    });

    it('should create task with default values', async () => {
      const input: CreateSyncTaskInput = {
        tenantIntegrationId: 'test-integration-2',
        name: 'Minimal Task',
        schedule: {
          type: 'manual',
        },
        config: {
          direction: 'pull',
        },
        tenantId: testTenantId,
        createdBy: testUserId,
      };

      const task = await syncTaskService.createTask(input);

      expect(task.enabled).toBe(true); // Default
      expect(task.status).toBe('idle'); // Default
      expect(task.config.syncMode).toBe('full'); // Default
    });
  });

  describe('Task Management', () => {
    let createdTaskId: string;

    beforeEach(async () => {
      const input: CreateSyncTaskInput = {
        tenantIntegrationId: 'test-integration-3',
        name: 'Management Test Task',
        schedule: {
          type: 'manual',
        },
        config: {
          direction: 'pull',
        },
        tenantId: testTenantId,
        createdBy: testUserId,
      };

      const task = await syncTaskService.createTask(input);
      createdTaskId = task.id;
    });

    it('should retrieve task by ID', async () => {
      const task = await syncTaskService.getTask(createdTaskId, testTenantId);

      expect(task).toBeDefined();
      expect(task?.id).toBe(createdTaskId);
      expect(task?.name).toBe('Management Test Task');
    });

    it('should list tasks for tenant', async () => {
      const result = await syncTaskService.listTasks(testTenantId, {
        limit: 10,
      });

      expect(result.tasks).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.tasks.some(t => t.id === createdTaskId)).toBe(true);
    });

    it('should update task', async () => {
      const update: UpdateSyncTaskInput = {
        name: 'Updated Task Name',
        description: 'Updated description',
        enabled: false,
      };

      const updated = await syncTaskService.updateTask(
        createdTaskId,
        testTenantId,
        update
      );

      expect(updated.name).toBe('Updated Task Name');
      expect(updated.description).toBe('Updated description');
      expect(updated.enabled).toBe(false);
      expect(updated.updatedAt).not.toBe(updated.createdAt);
    });

    it('should delete task', async () => {
      await syncTaskService.deleteTask(createdTaskId, testTenantId);

      const task = await syncTaskService.getTask(createdTaskId, testTenantId);
      expect(task).toBeNull();
    });
  });

  describe('Task State Management', () => {
    let taskId: string;

    beforeEach(async () => {
      const input: CreateSyncTaskInput = {
        tenantIntegrationId: 'test-integration-4',
        name: 'State Test Task',
        schedule: {
          type: 'manual',
        },
        config: {
          direction: 'pull',
        },
        tenantId: testTenantId,
        createdBy: testUserId,
      };

      const task = await syncTaskService.createTask(input);
      taskId = task.id;
    });

    it('should pause task', async () => {
      const paused = await syncTaskService.pauseTask(taskId, testTenantId);

      expect(paused.status).toBe('paused');
      expect(paused.pausedAt).toBeDefined();
    });

    it('should resume paused task', async () => {
      await syncTaskService.pauseTask(taskId, testTenantId);
      const resumed = await syncTaskService.resumeTask(taskId, testTenantId);

      expect(resumed.status).toBe('idle');
      expect(resumed.pausedAt).toBeUndefined();
    });

    it('should trigger manual execution', async () => {
      const execution = await syncTaskService.triggerTask(taskId, testTenantId, testUserId);

      expect(execution).toBeDefined();
      expect(execution.taskId).toBe(taskId);
      expect(execution.status).toBe('running');
      expect(execution.startedAt).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle task not found gracefully', async () => {
      const task = await syncTaskService.getTask('non-existent-id', testTenantId);
      expect(task).toBeNull();
    });

    it('should handle update of non-existent task', async () => {
      await expect(
        syncTaskService.updateTask('non-existent-id', testTenantId, { name: 'Updated' })
      ).rejects.toThrow();
    });

    it('should handle delete of non-existent task', async () => {
      await expect(
        syncTaskService.deleteTask('non-existent-id', testTenantId)
      ).rejects.toThrow();
    });

    it('should handle pause of non-existent task', async () => {
      await expect(
        syncTaskService.pauseTask('non-existent-id', testTenantId)
      ).rejects.toThrow();
    });
  });

  describe('Task Filtering and Pagination', () => {
    beforeEach(async () => {
      // Create multiple tasks with different statuses
      const tasks = [
        { name: 'Task 1', enabled: true },
        { name: 'Task 2', enabled: false },
        { name: 'Task 3', enabled: true },
      ];

      for (const taskData of tasks) {
        await syncTaskService.createTask({
          tenantIntegrationId: 'test-integration-filter',
          name: taskData.name,
          schedule: { type: 'manual' },
          config: { direction: 'pull' },
          enabled: taskData.enabled,
          tenantId: testTenantId,
          createdBy: testUserId,
        });
      }
    });

    it('should filter tasks by enabled status', async () => {
      const enabledTasks = await syncTaskService.listTasks(testTenantId, {
        enabled: true,
        limit: 10,
      });

      expect(enabledTasks.tasks.every(t => t.enabled === true)).toBe(true);
    });

    it('should paginate task results', async () => {
      const page1 = await syncTaskService.listTasks(testTenantId, {
        limit: 2,
      });

      expect(page1.tasks.length).toBeLessThanOrEqual(2);
      if (page1.hasMore) {
        expect(page1.continuationToken).toBeDefined();
      }
    });
  });
});
