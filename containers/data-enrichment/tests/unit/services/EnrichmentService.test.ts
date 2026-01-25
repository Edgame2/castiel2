/**
 * Enrichment Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrichmentService } from '../../../src/services/EnrichmentService';
import { getContainer } from '@coder/shared/database';
import { ServiceClient } from '@coder/shared';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      ai_service: { url: 'http://ai-service:3000' },
      embeddings: { url: 'http://embeddings:3000' },
      shard_manager: { url: 'http://shard-manager:3000' },
    },
    database: {
      containers: {
        enrichment_jobs: 'enrichment_jobs',
        enrichment_results: 'enrichment_results',
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

vi.mock('../../../src/events/publishers/EnrichmentEventPublisher', () => ({
  publishEnrichmentEvent: vi.fn(),
}));

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  let mockContainer: any;
  let mockAiServiceClient: any;
  let mockEmbeddingsClient: any;
  let mockShardManagerClient: any;

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
    mockAiServiceClient = {
      post: vi.fn(),
    };
    mockEmbeddingsClient = {
      post: vi.fn(),
    };
    mockShardManagerClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    (ServiceClient as any).mockImplementation((config: any) => {
      if (config.baseURL?.includes('ai-service')) {
        return mockAiServiceClient;
      }
      if (config.baseURL?.includes('embeddings')) {
        return mockEmbeddingsClient;
      }
      if (config.baseURL?.includes('shard-manager')) {
        return mockShardManagerClient;
      }
      return {};
    });

    service = new EnrichmentService();
  });

  describe('createEnrichmentJob', () => {
    it('should create an enrichment job successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const input = {
        shardId: 'shard-123',
        enrichmentTypes: ['ai_summary', 'vectorization'],
      };

      const mockJob = {
        id: 'job-123',
        tenantId,
        userId,
        shardId: input.shardId,
        status: 'pending',
        enrichmentTypes: input.enrichmentTypes,
        createdAt: new Date(),
      };

      mockContainer.items.create.mockResolvedValue({
        resource: mockJob,
      });

      const result = await service.createEnrichmentJob(tenantId, userId, input);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('pending');
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should handle errors during job creation', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const input = {
        shardId: 'shard-123',
        enrichmentTypes: ['ai_summary'],
      };

      mockContainer.items.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createEnrichmentJob(tenantId, userId, input)
      ).rejects.toThrow();
    });
  });

  describe('executeEnrichmentJob', () => {
    it('should execute an enrichment job successfully', async () => {
      const tenantId = 'tenant-123';
      const jobId = 'job-123';

      const mockJob = {
        id: jobId,
        tenantId,
        shardId: 'shard-123',
        status: 'pending',
        enrichmentTypes: ['ai_summary'],
      };

      mockContainer.items.read.mockResolvedValue({
        resource: mockJob,
      });

      // Mock AI service response
      mockAiServiceClient.post.mockResolvedValue({
        summary: 'Test summary',
        keywords: ['test', 'example'],
      });

      // Mock shard update
      mockShardManagerClient.post.mockResolvedValue({
        id: 'shard-123',
        data: {
          enriched: true,
          summary: 'Test summary',
        },
      });

      // Mock job update
      mockContainer.items.replace.mockResolvedValue({
        resource: {
          ...mockJob,
          status: 'completed',
          completedAt: new Date(),
        },
      });

      const result = await service.executeEnrichmentJob(tenantId, jobId);

      expect(result.status).toBe('completed');
      expect(mockAiServiceClient.post).toHaveBeenCalled();
      expect(mockContainer.items.replace).toHaveBeenCalled();
    });

    it('should handle job not found', async () => {
      const tenantId = 'tenant-123';
      const jobId = 'non-existent';

      mockContainer.items.read.mockResolvedValue({
        resource: null,
      });

      await expect(
        service.executeEnrichmentJob(tenantId, jobId)
      ).rejects.toThrow();
    });
  });

  describe('vectorizeShard', () => {
    it('should vectorize a shard successfully', async () => {
      const tenantId = 'tenant-123';
      const shardId = 'shard-123';

      // Mock shard data
      mockShardManagerClient.get.mockResolvedValue({
        id: shardId,
        tenantId,
        data: {
          content: 'Test content to vectorize',
        },
      });

      // Mock embeddings service
      mockEmbeddingsClient.post.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        model: 'text-embedding-ada-002',
      });

      // Mock shard update
      mockShardManagerClient.post.mockResolvedValue({
        id: shardId,
        data: {
          vectorized: true,
          embedding: [0.1, 0.2, 0.3],
        },
      });

      const result = await service.vectorizeShard(tenantId, shardId);

      expect(result).toHaveProperty('vectorized');
      expect(result.vectorized).toBe(true);
      expect(mockEmbeddingsClient.post).toHaveBeenCalled();
    });

    it('should handle vectorization errors', async () => {
      const tenantId = 'tenant-123';
      const shardId = 'shard-123';

      mockShardManagerClient.get.mockRejectedValue(new Error('Shard not found'));

      await expect(
        service.vectorizeShard(tenantId, shardId)
      ).rejects.toThrow();
    });
  });

  describe('getEnrichmentJob', () => {
    it('should retrieve an enrichment job successfully', async () => {
      const tenantId = 'tenant-123';
      const jobId = 'job-123';

      const mockJob = {
        id: jobId,
        tenantId,
        shardId: 'shard-123',
        status: 'completed',
        enrichmentTypes: ['ai_summary'],
        createdAt: new Date(),
        completedAt: new Date(),
      };

      mockContainer.items.read.mockResolvedValue({
        resource: mockJob,
      });

      const result = await service.getEnrichmentJob(tenantId, jobId);

      expect(result).toEqual(mockJob);
      expect(mockContainer.items.read).toHaveBeenCalledWith(
        jobId,
        { partitionKey: tenantId }
      );
    });
  });

  describe('listEnrichmentJobs', () => {
    it('should list enrichment jobs successfully', async () => {
      const tenantId = 'tenant-123';
      const shardId = 'shard-123';

      const mockJobs = [
        {
          id: 'job-1',
          tenantId,
          shardId,
          status: 'completed',
        },
        {
          id: 'job-2',
          tenantId,
          shardId,
          status: 'pending',
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: mockJobs,
        }),
      });

      const result = await service.listEnrichmentJobs(tenantId, { shardId });

      expect(result).toHaveProperty('jobs');
      expect(result.jobs.length).toBe(2);
    });
  });
});
