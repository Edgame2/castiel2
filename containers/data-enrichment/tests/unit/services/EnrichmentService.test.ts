/**
 * Enrichment Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrichmentService } from '../../../src/services/EnrichmentService';
import { getContainer } from '@coder/shared/database';
import {
  EnrichmentJobStatus,
  EnrichmentProcessorType,
} from '../../../src/types/enrichment.types';

const mockClients = vi.hoisted(() => ({
  shard: { get: vi.fn(), post: vi.fn() },
  embeddings: { post: vi.fn() },
  ai: { post: vi.fn() },
}));

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: unknown, config: { baseURL?: string }) {
    if (config?.baseURL?.includes('shard-manager')) return mockClients.shard;
    if (config?.baseURL?.includes('embeddings')) return mockClients.embeddings;
    if (config?.baseURL?.includes('ai-service')) return mockClients.ai;
    return { get: vi.fn(), post: vi.fn() };
  }),
  generateServiceToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      ai_service: { url: 'http://ai-service:3000' },
      embeddings: { url: 'http://embeddings:3000' },
      shard_manager: { url: 'http://shard-manager:3000' },
    },
    cosmos_db: {
      containers: {
        enrichment_jobs: 'enrichment_jobs',
        enrichment_results: 'enrichment_results',
        enrichment_configurations: 'enrichment_configurations',
      },
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

vi.mock('../../../src/events/publishers/EnrichmentEventPublisher', () => ({
  publishEnrichmentEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/services/ShardEmbeddingService', () => ({
  ShardEmbeddingService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../../src/services/processors', () => ({
  EntityExtractionProcessor: vi.fn().mockImplementation(() => ({ getType: () => 'entity-extraction', process: vi.fn() })),
  ClassificationProcessor: vi.fn().mockImplementation(() => ({ getType: () => 'classification', process: vi.fn() })),
  SummarizationProcessor: vi.fn().mockImplementation(() => ({ getType: () => 'summarization', process: vi.fn() })),
  SentimentAnalysisProcessor: vi.fn().mockImplementation(() => ({ getType: () => 'sentiment-analysis', process: vi.fn() })),
  KeyPhrasesProcessor: vi.fn().mockImplementation(() => ({ getType: () => 'key-phrases', process: vi.fn() })),
}));

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  let mockJobsContainer: { items: { query: ReturnType<typeof vi.fn> }; item: ReturnType<typeof vi.fn> };
  let mockConfigContainer: { items: { query: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    vi.clearAllMocks();

    mockJobsContainer = {
      items: {
        query: vi.fn().mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        }),
      },
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
      })),
    };

    mockConfigContainer = {
      items: {
        query: vi.fn().mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({
            resources: [
              {
                id: 'default',
                tenantId: 'tenant-123',
                enabled: true,
                processors: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          }),
        }),
        create: vi.fn().mockResolvedValue({}),
      },
    };

    (getContainer as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
      if (name === 'enrichment_configurations') return mockConfigContainer;
      if (name === 'enrichment_jobs') return mockJobsContainer;
      return mockJobsContainer;
    });

    service = new EnrichmentService();
  });

  describe('getEnrichmentJob', () => {
    it('should return job when found', async () => {
      const jobId = 'job-123';
      const tenantId = 'tenant-123';
      const mockJob = {
        id: jobId,
        tenantId,
        shardId: 'shard-123',
        status: EnrichmentJobStatus.COMPLETED,
        processors: [],
        createdAt: new Date(),
        completedAt: new Date(),
      };

      mockJobsContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: mockJob }),
      });

      const result = await service.getEnrichmentJob(jobId, tenantId);

      expect(result).toEqual(mockJob);
      expect(mockJobsContainer.item).toHaveBeenCalledWith(jobId, tenantId);
    });

    it('should return null when job not found', async () => {
      const jobId = 'non-existent';
      const tenantId = 'tenant-123';

      mockJobsContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      });

      const result = await service.getEnrichmentJob(jobId, tenantId);

      expect(result).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should return enrichment statistics for tenant', async () => {
      const tenantId = 'tenant-123';
      const mockJobs = [
        {
          id: 'job-1',
          tenantId,
          status: EnrichmentJobStatus.COMPLETED,
          processors: [EnrichmentProcessorType.ENTITY_EXTRACTION],
          completedAt: new Date(),
          processingTimeMs: 100,
        },
        {
          id: 'job-2',
          tenantId,
          status: EnrichmentJobStatus.PENDING,
          processors: [],
        },
      ];

      mockJobsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: mockJobs }),
      });

      const result = await service.getStatistics(tenantId);

      expect(result).toHaveProperty('tenantId', tenantId);
      expect(result.totalShards).toBe(2);
      expect(result.enrichedShards).toBe(1);
      expect(result.pendingShards).toBe(1);
      expect(result.failedShards).toBe(0);
    });
  });
});
