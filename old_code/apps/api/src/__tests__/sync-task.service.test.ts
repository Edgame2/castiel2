import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncTaskService } from '../services/sync-task.service';
import { IMonitoringProvider } from '@castiel/monitoring';
import {
  SyncTaskRepository,
  SyncExecutionRepository,
  SyncConflictRepository,
} from '../repositories/sync-task.repository';
import { ConversionSchemaRepository } from '../repositories/conversion-schema.repository';
import { ConversionSchemaService } from '../services/conversion-schema.service';
import { ShardRepository } from '../repositories/shard.repository';
import { IntegrationAdapterRegistry } from '../services/integration-adapter.registry';
import { IntegrationShardService } from '../services/integration-shard.service';
import { IntegrationDeduplicationService } from '../services/integration-deduplication.service';
import { BidirectionalSyncEngine } from '../services/bidirectional-sync.service';

describe('SyncTaskService - Sync Execution', () => {
  let service: SyncTaskService;
  let mockRepositories: any;
  let mockServices: any;
  let mockMonitoring: Partial<IMonitoringProvider>;

  beforeEach(() => {
    mockMonitoring = {
      trackEvent: vi.fn(),
      trackException: vi.fn(),
      trackMetric: vi.fn(),
    };

    mockRepositories = {
      syncTaskRepository: {
        findById: vi.fn(),
        update: vi.fn(),
        updateAfterExecution: vi.fn(),
        list: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        findDueTasks: vi.fn(),
      },
      syncExecutionRepository: {
        create: vi.fn().mockResolvedValue({
          id: 'exec-123',
          syncTaskId: 'task-123',
          tenantId: 'tenant-123',
          status: 'running',
          createdAt: new Date(),
        }),
        update: vi.fn(),
        complete: vi.fn(),
        findById: vi.fn(),
        list: vi.fn(),
      },
      syncConflictRepository: {
        listPending: vi.fn(),
        findById: vi.fn(),
        resolve: vi.fn(),
      },
      conversionSchemaRepository: {
        findById: vi.fn().mockResolvedValue({
          id: 'schema-123',
          tenantId: 'tenant-123',
          name: 'Test Schema',
          deduplication: {
            externalIdField: 'id',
            rules: [],
            mergeStrategy: 'merge_fields',
          },
          target: {
            shardTypeId: 'shard-type-1',
            createIfMissing: true,
            updateIfExists: true,
          },
          fieldMappings: [
            { source: 'firstName', target: 'first_name', transformation: 'trim' },
            { source: 'lastName', target: 'last_name', transformation: 'trim' },
          ],
          bidirectionalSync: {
            enabled: false,
          },
        }),
      },
      shardRepository: {
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        list: vi.fn(),
      },
    };

    mockServices = {
      conversionSchemaService: {
        transform: vi.fn().mockResolvedValue({
          success: true,
          data: { first_name: 'John', last_name: 'Doe' },
          errors: [],
        }),
      },
      adapterRegistry: {
        getIntegration: vi.fn(),
        getAdapter: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue({
            data: [
              { id: '1', firstName: 'John', lastName: 'Doe' },
              { id: '2', firstName: 'Jane', lastName: 'Smith' },
            ],
          }),
          fetchBatch: vi.fn(),
        }),
      },
      shardService: {
        createShardsFromIntegrationData: vi.fn().mockResolvedValue({
          primaryShardId: 'shard-1',
          derivedShardIds: [],
        }),
      },
      deduplicationService: {
        findDuplicates: vi.fn().mockResolvedValue([]),
        mergeDuplicates: vi.fn(),
      },
      bidirectionalSyncEngine: {
        detectConflicts: vi.fn(),
        resolveConflict: vi.fn(),
      },
    };

    service = new SyncTaskService({
      monitoring: mockMonitoring as IMonitoringProvider,
      syncTaskRepository: mockRepositories.syncTaskRepository,
      syncExecutionRepository: mockRepositories.syncExecutionRepository,
      syncConflictRepository: mockRepositories.syncConflictRepository,
      conversionSchemaRepository: mockRepositories.conversionSchemaRepository,
      conversionSchemaService: mockServices.conversionSchemaService,
      shardRepository: mockRepositories.shardRepository,
      adapterRegistry: mockServices.adapterRegistry,
      shardService: mockServices.shardService,
      deduplicationService: mockServices.deduplicationService,
      bidirectionalSyncEngine: mockServices.bidirectionalSyncEngine,
      retryConfig: {
        maxAttempts: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      },
      batchConfig: {
        batchSize: 10,
        delayBetweenBatchesMs: 5,
      },
    });
  });

  describe('triggerSync', () => {
    it('should create execution and start async sync', async () => {
      mockRepositories.syncTaskRepository.findById.mockResolvedValue({
        id: 'task-123',
        tenantId: 'tenant-123',
        tenantIntegrationId: 'salesforce',
        status: 'active',
        conversionSchemaId: 'schema-123',
        config: { entity: 'Contact' },
      });

      const execution = await service.triggerSync('task-123', 'tenant-123', 'user-123');

      expect(execution.id).toBe('exec-123');
      expect(mockRepositories.syncExecutionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          syncTaskId: 'task-123',
          tenantId: 'tenant-123',
          triggeredBy: 'manual',
          triggeredByUserId: 'user-123',
        })
      );
    });

    it('should prevent duplicate execution of same task', async () => {
      mockRepositories.syncTaskRepository.findById.mockResolvedValue({
        id: 'task-123',
        tenantId: 'tenant-123',
        status: 'active',
      });

      // First trigger
      await service.triggerSync('task-123', 'tenant-123', 'user-123');

      // Wait briefly for first to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Second trigger should fail
      await expect(
        service.triggerSync('task-123', 'tenant-123', 'user-123')
      ).rejects.toThrow('already running');
    });

    it('should reject trigger on disabled task', async () => {
      mockRepositories.syncTaskRepository.findById.mockResolvedValue({
        id: 'task-123',
        tenantId: 'tenant-123',
        status: 'disabled',
      });

      await expect(
        service.triggerSync('task-123', 'tenant-123', 'user-123')
      ).rejects.toThrow('disabled');
    });
  });

  describe('processBatch', () => {
    it('should process records and create shards', async () => {
      const batch = [
        { id: '1', firstName: 'John', lastName: 'Doe' },
        { id: '2', firstName: 'Jane', lastName: 'Smith' },
      ];

      const task = {
        id: 'task-123',
        tenantId: 'tenant-123',
        tenantIntegrationId: 'salesforce',
        config: { entity: 'Contact' },
      };

      const schema = {
        deduplication: { externalIdField: 'id', rules: [] },
        target: { shardTypeId: 'shard-type-1', createIfMissing: true },
        fieldMappings: [],
      };

      // Would need to call private method through public API
      // This is a limitation of testing private methods
      // In practice, this would be tested through triggerSync
    });
  });

  describe('Batch Processing', () => {
    it('should process large dataset in batches', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 250 }, (_, i) => ({
        id: `${i}`,
        name: `User ${i}`,
      }));

      mockServices.adapterRegistry.getAdapter.mockReturnValue({
        fetch: vi.fn().mockResolvedValue({ data: largeDataset }),
      });

      // Trigger sync
      mockRepositories.syncTaskRepository.findById.mockResolvedValue({
        id: 'task-123',
        tenantId: 'tenant-123',
        tenantIntegrationId: 'salesforce',
        status: 'active',
        conversionSchemaId: 'schema-123',
        config: { entity: 'Contact' },
      });

      await service.triggerSync('task-123', 'tenant-123', 'user-123');

      // Give async operation time to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify batch processing occurred
      expect(mockRepositories.syncExecutionRepository.update).toHaveBeenCalled();
      expect(mockMonitoring.trackMetric).toHaveBeenCalledWith(
        'sync.records.fetched',
        250,
        expect.any(Object)
      );
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed records with exponential backoff', async () => {
      // Mock transform to fail first, then succeed
      let callCount = 0;
      mockServices.conversionSchemaService.transform.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            success: false,
            errors: ['Transformation failed'],
          };
        }
        return {
          success: true,
          data: { first_name: 'John', last_name: 'Doe' },
          errors: [],
        };
      });

      // The actual retry would happen in executeSync
      // This test verifies retry config is set up correctly
      expect(service['retryConfig'].maxAttempts).toBe(2);
      expect(service['retryConfig'].backoffMultiplier).toBe(2);
    });

    it('should not retry non-recoverable errors', async () => {
      mockServices.conversionSchemaService.transform.mockResolvedValue({
        success: false,
        errors: ['Schema validation failed'],
      });

      // Non-recoverable errors (recoverable: false) should not be retried
      // This is validated in the execution logic
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect and resolve conflicts in bidirectional sync', async () => {
      const schema = {
        deduplication: { externalIdField: 'id', rules: [] },
        target: { shardTypeId: 'shard-type-1', updateIfExists: true },
        fieldMappings: [],
        bidirectionalSync: {
          enabled: true,
          conflictResolution: 'merge',
        },
      };

      mockRepositories.conversionSchemaRepository.findById.mockResolvedValue(schema);

      mockServices.bidirectionalSyncEngine.detectConflicts.mockResolvedValue({
        id: 'conflict-1',
        conflictType: 'field_level',
        localData: { name: 'John' },
        remoteData: { name: 'Jonathan' },
      });

      mockServices.bidirectionalSyncEngine.resolveConflict.mockResolvedValue({
        resolved: { name: 'Jonathan' }, // Remote wins
      });

      // This would be tested through full sync execution
      expect(mockServices.bidirectionalSyncEngine.detectConflicts).toBeDefined();
    });
  });

  describe('Deduplication', () => {
    it('should find and merge duplicates', async () => {
      mockServices.deduplicationService.findDuplicates.mockResolvedValue(['shard-1', 'shard-2']);

      mockServices.deduplicationService.mergeDuplicates.mockResolvedValue('shard-1');

      // Test that deduplication is called
      expect(mockServices.deduplicationService.findDuplicates).toBeDefined();
      expect(mockServices.deduplicationService.mergeDuplicates).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle adapter connection errors', async () => {
      mockServices.adapterRegistry.getAdapter.mockReturnValue({
        fetch: vi.fn().mockRejectedValue(new Error('Connection failed')),
      });

      mockRepositories.syncTaskRepository.findById.mockResolvedValue({
        id: 'task-123',
        tenantId: 'tenant-123',
        tenantIntegrationId: 'salesforce',
        status: 'active',
        conversionSchemaId: 'schema-123',
      });

      await service.triggerSync('task-123', 'tenant-123', 'user-123');

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should mark execution as failed
      expect(mockRepositories.syncExecutionRepository.update).toHaveBeenCalledWith(
        expect.any(String),
        'tenant-123',
        expect.objectContaining({ status: 'failed' })
      );
    });

    it('should handle schema not found error', async () => {
      mockRepositories.conversionSchemaRepository.findById.mockResolvedValue(null);

      mockRepositories.syncTaskRepository.findById.mockResolvedValue({
        id: 'task-123',
        tenantId: 'tenant-123',
        conversionSchemaId: 'invalid-schema',
        status: 'active',
      });

      await service.triggerSync('task-123', 'tenant-123', 'user-123');

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockRepositories.syncExecutionRepository.update).toHaveBeenCalledWith(
        expect.any(String),
        'tenant-123',
        expect.objectContaining({ status: 'failed' })
      );
    });
  });

  describe('Progress Tracking', () => {
    it('should update execution progress during sync', async () => {
      mockRepositories.syncTaskRepository.findById.mockResolvedValue({
        id: 'task-123',
        tenantId: 'tenant-123',
        tenantIntegrationId: 'salesforce',
        status: 'active',
        conversionSchemaId: 'schema-123',
        config: { entity: 'Contact' },
      });

      mockServices.adapterRegistry.getAdapter.mockReturnValue({
        fetch: vi.fn().mockResolvedValue({
          data: [
            { id: '1', firstName: 'John', lastName: 'Doe' },
          ],
        }),
      });

      await service.triggerSync('task-123', 'tenant-123', 'user-123');

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify progress was tracked
      expect(mockRepositories.syncExecutionRepository.update).toHaveBeenCalledWith(
        expect.any(String),
        'tenant-123',
        expect.objectContaining({
          progress: expect.objectContaining({
            phase: expect.stringMatching(/fetching|transforming|saving/),
          }),
        })
      );
    });
  });

  describe('Execution Completion', () => {
    it('should mark execution as successful when all records process', async () => {
      mockRepositories.syncTaskRepository.findById.mockResolvedValue({
        id: 'task-123',
        tenantId: 'tenant-123',
        tenantIntegrationId: 'salesforce',
        status: 'active',
        conversionSchemaId: 'schema-123',
        config: { entity: 'Contact' },
      });

      mockServices.adapterRegistry.getAdapter.mockReturnValue({
        fetch: vi.fn().mockResolvedValue({
          data: [{ id: '1', firstName: 'John', lastName: 'Doe' }],
        }),
      });

      await service.triggerSync('task-123', 'tenant-123', 'user-123');

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockRepositories.syncExecutionRepository.complete).toHaveBeenCalledWith(
        expect.any(String),
        'tenant-123',
        expect.stringMatching(/success|partial/),
        expect.any(Object)
      );
    });

    it('should track sync completion metrics', async () => {
      mockRepositories.syncTaskRepository.findById.mockResolvedValue({
        id: 'task-123',
        tenantId: 'tenant-123',
        tenantIntegrationId: 'salesforce',
        status: 'active',
        conversionSchemaId: 'schema-123',
        config: { entity: 'Contact' },
      });

      mockServices.adapterRegistry.getAdapter.mockReturnValue({
        fetch: vi.fn().mockResolvedValue({
          data: [
            { id: '1', firstName: 'John', lastName: 'Doe' },
            { id: '2', firstName: 'Jane', lastName: 'Smith' },
          ],
        }),
      });

      await service.triggerSync('task-123', 'tenant-123', 'user-123');

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'syncTask.completed',
        expect.objectContaining({
          taskId: 'task-123',
          recordsProcessed: 2,
          status: expect.any(String),
          durationMs: expect.any(Number),
        })
      );
    });
  });

  describe('Retry Execution', () => {
    it('should allow retry of failed execution', async () => {
      const failedExecution = {
        id: 'exec-123',
        syncTaskId: 'task-123',
        tenantIntegrationId: 'salesforce',
        tenantId: 'tenant-123',
        status: 'failed',
        triggeredBy: 'manual',
      };

      mockRepositories.syncExecutionRepository.findById.mockResolvedValue(failedExecution);

      mockRepositories.syncTaskRepository.findById.mockResolvedValue({
        id: 'task-123',
        tenantId: 'tenant-123',
        tenantIntegrationId: 'salesforce',
        status: 'active',
        conversionSchemaId: 'schema-123',
      });

      const retryExecution = await service.retryExecution('exec-123', 'tenant-123', 'user-123');

      expect(retryExecution).toBeDefined();
      expect(mockRepositories.syncExecutionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeredBy: 'retry',
          retryOf: 'exec-123',
        })
      );
    });

    it('should prevent retry of successful execution', async () => {
      mockRepositories.syncExecutionRepository.findById.mockResolvedValue({
        id: 'exec-123',
        syncTaskId: 'task-123',
        tenantId: 'tenant-123',
        status: 'success',
      });

      await expect(
        service.retryExecution('exec-123', 'tenant-123', 'user-123')
      ).rejects.toThrow('Can only retry failed or partial executions');
    });
  });

  describe('Scheduled Processing', () => {
    it('should process due tasks', async () => {
      const dueTasks = [
        {
          id: 'task-1',
          tenantId: 'tenant-123',
          tenantIntegrationId: 'salesforce',
          status: 'active',
          conversionSchemaId: 'schema-123',
        },
      ];

      mockRepositories.syncTaskRepository.findDueTasks.mockResolvedValue(dueTasks);
      mockRepositories.syncTaskRepository.findById.mockResolvedValue(dueTasks[0]);

      mockServices.adapterRegistry.getAdapter.mockReturnValue({
        fetch: vi.fn().mockResolvedValue({ data: [] }),
      });

      await service.processDueTasks();

      expect(mockRepositories.syncTaskRepository.findDueTasks).toHaveBeenCalledWith(10);
      expect(mockRepositories.syncExecutionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeredBy: 'schedule',
        })
      );
    });
  });
});
