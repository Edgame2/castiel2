/**
 * CRM Data Mapping Consumer Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CRMDataMappingConsumer } from '../../../src/consumers/CRMDataMappingConsumer';
import { ServiceClient, EventPublisher } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
  EventPublisher: vi.fn(),
  FieldMapperService: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    rabbitmq: {
      url: 'amqp://localhost:5672',
      exchange: 'coder_events',
      queues: {
        integration_data_raw: 'integration_data_raw',
      },
    },
    mapping: {
      queue_name: 'integration_data_raw',
      prefetch: 20,
      config_cache_ttl: 600,
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('CRMDataMappingConsumer', () => {
  let consumer: CRMDataMappingConsumer;
  let mockShardManager: any;
  let mockEventPublisher: any;
  let mockIntegrationManager: any;

  beforeEach(() => {
    mockShardManager = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    };

    mockEventPublisher = {
      publish: vi.fn(),
    };

    mockIntegrationManager = {
      get: vi.fn(),
    };

    const deps = {
      shardManager: mockShardManager as ServiceClient,
      eventPublisher: mockEventPublisher as EventPublisher,
      integrationManager: mockIntegrationManager as ServiceClient,
    };

    consumer = new CRMDataMappingConsumer(deps);
  });

  describe('handleRawDataEvent', () => {
    it('should process raw data event and create shard', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        entityType: 'Opportunity',
        rawData: {
          Name: 'Test Opportunity',
          Amount: 10000,
        },
        externalId: 'ext-123',
        syncTaskId: 'task-123',
        idempotencyKey: 'int-123-ext-123-task-123',
        correlationId: 'corr-123',
      };

      // Mock integration config
      mockIntegrationManager.get.mockResolvedValue({
        id: 'int-123',
        syncConfig: {
          entityMappings: [
            {
              externalEntityName: 'Opportunity',
              shardTypeId: 'opportunity',
              fieldMappings: [
                {
                  externalFieldName: 'Name',
                  internalFieldName: 'name',
                  required: true,
                },
                {
                  externalFieldName: 'Amount',
                  internalFieldName: 'amount',
                  required: false,
                },
              ],
            },
          ],
        },
      });

      // Mock shard not existing
      mockShardManager.get.mockResolvedValue([]);

      // Mock shard creation
      mockShardManager.post.mockResolvedValue({
        id: 'shard-123',
      });

      // Mock idempotency check (not processed)
      // Note: This is in-memory, so first call should not be processed

      await consumer['handleRawDataEvent'](event);

      // Verify shard was created
      expect(mockShardManager.post).toHaveBeenCalledWith(
        '/api/v1/shards',
        expect.objectContaining({
          tenantId: 'tenant-123',
          shardTypeId: 'opportunity',
          structuredData: expect.objectContaining({
            name: 'Test Opportunity',
            amount: 10000,
          }),
        }),
        expect.any(Object)
      );

      // Verify mapping success event was published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'integration.data.mapped',
        'tenant-123',
        expect.objectContaining({
          integrationId: 'int-123',
          shardId: 'shard-123',
          success: true,
        }),
        expect.any(Object)
      );
    });

    it('should handle idempotency (skip already processed events)', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        entityType: 'Opportunity',
        rawData: { Name: 'Test' },
        externalId: 'ext-123',
        syncTaskId: 'task-123',
        idempotencyKey: 'int-123-ext-123-task-123',
        correlationId: 'corr-123',
      };

      // First call - process
      await consumer['handleRawDataEvent'](event);

      // Second call - should be skipped (idempotency)
      mockIntegrationManager.get.mockClear();
      mockShardManager.post.mockClear();

      await consumer['handleRawDataEvent'](event);

      // Should not process again
      expect(mockShardManager.post).not.toHaveBeenCalled();
    });

    it('should handle mapping failures and publish failed event', async () => {
      const event = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        entityType: 'Opportunity',
        rawData: { Name: 'Test' },
        externalId: 'ext-123',
        syncTaskId: 'task-123',
        idempotencyKey: 'int-123-ext-123-task-123',
        correlationId: 'corr-123',
      };

      // Mock integration config fetch failure
      mockIntegrationManager.get.mockRejectedValue(new Error('Integration not found'));

      await expect(consumer['handleRawDataEvent'](event)).rejects.toThrow();

      // Verify mapping failed event was published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'integration.data.mapping.failed',
        'tenant-123',
        expect.objectContaining({
          integrationId: 'int-123',
          error: expect.any(String),
        }),
        expect.any(Object)
      );
    });
  });

  describe('handleBatchEvent', () => {
    it('should process batch events in parallel', async () => {
      const batchEvent = {
        integrationId: 'int-123',
        tenantId: 'tenant-123',
        entityType: 'Opportunity',
        records: [
          {
            rawData: { Name: 'Opp 1', Amount: 1000 },
            externalId: 'ext-1',
            idempotencyKey: 'int-123-ext-1-task-123',
          },
          {
            rawData: { Name: 'Opp 2', Amount: 2000 },
            externalId: 'ext-2',
            idempotencyKey: 'int-123-ext-2-task-123',
          },
        ],
        syncTaskId: 'task-123',
        correlationId: 'corr-123',
        batchSize: 2,
      };

      // Mock integration config
      mockIntegrationManager.get.mockResolvedValue({
        id: 'int-123',
        syncConfig: {
          entityMappings: [
            {
              externalEntityName: 'Opportunity',
              shardTypeId: 'opportunity',
              fieldMappings: [
                {
                  externalFieldName: 'Name',
                  internalFieldName: 'name',
                  required: true,
                },
              ],
            },
          ],
        },
      });

      mockShardManager.get.mockResolvedValue([]);
      mockShardManager.post.mockResolvedValue({ id: 'shard-123' });

      await consumer['handleBatchEvent'](batchEvent);

      // Verify both records were processed
      expect(mockShardManager.post).toHaveBeenCalledTimes(2);
    });
  });
});
