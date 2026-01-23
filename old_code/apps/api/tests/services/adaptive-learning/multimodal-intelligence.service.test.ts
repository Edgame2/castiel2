/**
 * Multi-Modal Intelligence Service Tests
 * Tests for cross-modal insight generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiModalIntelligenceService } from '../../../src/services/multimodal-intelligence.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { MultimodalAsset } from '../../../src/services/multimodal-asset.service';

const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
} as any;

const mockCosmosClient = {
  database: vi.fn().mockReturnValue({
    container: vi.fn().mockReturnValue({
      items: {
        create: vi.fn().mockResolvedValue({ resource: {} }),
      },
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
} as unknown as Redis;

const mockMultimodalAssetService = {
  getAsset: vi.fn(),
} as any;

describe('MultiModalIntelligenceService', () => {
  let service: MultiModalIntelligenceService;
  const tenantId = 'tenant-1';
  const assetIds = ['asset-1', 'asset-2', 'asset-3'];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MultiModalIntelligenceService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockMultimodalAssetService
    );
  });

  describe('analyzeMultimodal', () => {
    it('should analyze multiple modalities', async () => {
      const assets: MultimodalAsset[] = [
        {
          id: 'asset-1',
          tenantId,
          userId: 'user-1',
          assetType: 'image',
          url: 'https://example.com/image.jpg',
          fileName: 'image.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          extracted: {
            text: 'Extracted text from image',
            description: 'Image description',
            tags: ['product', 'demo'],
          },
          analysis: {
            summary: 'Product demo image',
            keyInsights: ['product', 'demo'],
          },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
        {
          id: 'asset-2',
          tenantId,
          userId: 'user-1',
          assetType: 'audio',
          url: 'https://example.com/audio.mp3',
          fileName: 'audio.mp3',
          mimeType: 'audio/mpeg',
          size: 500000,
          extracted: {
            text: 'Transcribed audio text',
          },
          analysis: {
            transcription: 'Meeting transcription',
            summary: 'Sales meeting discussion',
            keyInsights: ['meeting', 'discussion'],
          },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
      ];

      (mockMultimodalAssetService.getAsset as any)
        .mockResolvedValueOnce(assets[0])
        .mockResolvedValueOnce(assets[1]);

      const request = {
        tenantId,
        assetIds: ['asset-1', 'asset-2'],
        analysisType: 'comprehensive',
      };

      const insight = await service.analyzeMultimodal(request);

      expect(insight).toBeDefined();
      expect(insight.insightId).toBeDefined();
      expect(insight.tenantId).toBe(tenantId);
      expect(insight.modalities).toContain('image');
      expect(insight.modalities).toContain('audio');
      expect(insight.combinedInsight).toBeDefined();
      expect(insight.sources).toBeDefined();
    });

    it('should combine insights from multiple modalities', async () => {
      const assets: MultimodalAsset[] = [
        {
          id: 'asset-1',
          tenantId,
          userId: 'user-1',
          assetType: 'image',
          url: 'https://example.com/image.jpg',
          fileName: 'image.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          analysis: {
            summary: 'First summary',
            keyInsights: ['insight1', 'insight2'],
          },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
        {
          id: 'asset-2',
          tenantId,
          userId: 'user-1',
          assetType: 'document',
          url: 'https://example.com/doc.pdf',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          size: 200000,
          analysis: {
            summary: 'Second summary',
            keyInsights: ['insight2', 'insight3'],
          },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
      ];

      (mockMultimodalAssetService.getAsset as any)
        .mockResolvedValueOnce(assets[0])
        .mockResolvedValueOnce(assets[1]);

      const insight = await service.analyzeMultimodal({
        tenantId,
        assetIds: ['asset-1', 'asset-2'],
      });

      expect(insight.combinedInsight.summary).toContain('First summary');
      expect(insight.combinedInsight.summary).toContain('Second summary');
      expect(insight.combinedInsight.keyFindings).toContain('insight2'); // Common insight
    });

    it('should identify contradictions across modalities', async () => {
      const assets: MultimodalAsset[] = [
        {
          id: 'asset-1',
          tenantId,
          userId: 'user-1',
          assetType: 'text',
          url: 'https://example.com/text.txt',
          fileName: 'text.txt',
          mimeType: 'text/plain',
          size: 1000,
          analysis: {
            sentiment: 'positive',
            summary: 'Positive sentiment',
          },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
        {
          id: 'asset-2',
          tenantId,
          userId: 'user-1',
          assetType: 'audio',
          url: 'https://example.com/audio.mp3',
          fileName: 'audio.mp3',
          mimeType: 'audio/mpeg',
          size: 500000,
          analysis: {
            sentiment: 'negative',
            summary: 'Negative sentiment',
          },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
      ];

      (mockMultimodalAssetService.getAsset as any)
        .mockResolvedValueOnce(assets[0])
        .mockResolvedValueOnce(assets[1]);

      const insight = await service.analyzeMultimodal({
        tenantId,
        assetIds: ['asset-1', 'asset-2'],
      });

      expect(insight.combinedInsight.contradictions).toBeDefined();
      if (insight.combinedInsight.contradictions) {
        expect(insight.combinedInsight.contradictions.length).toBeGreaterThan(0);
      }
    });

    it('should identify synergies across modalities', async () => {
      const assets: MultimodalAsset[] = [
        {
          id: 'asset-1',
          tenantId,
          userId: 'user-1',
          assetType: 'image',
          url: 'https://example.com/image.jpg',
          fileName: 'image.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          analysis: {
            keyInsights: ['product', 'demo', 'feature'],
          },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
        {
          id: 'asset-2',
          tenantId,
          userId: 'user-1',
          assetType: 'document',
          url: 'https://example.com/doc.pdf',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          size: 200000,
          analysis: {
            keyInsights: ['product', 'demo', 'pricing'],
          },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
      ];

      (mockMultimodalAssetService.getAsset as any)
        .mockResolvedValueOnce(assets[0])
        .mockResolvedValueOnce(assets[1]);

      const insight = await service.analyzeMultimodal({
        tenantId,
        assetIds: ['asset-1', 'asset-2'],
      });

      expect(insight.combinedInsight.synergies).toBeDefined();
      if (insight.combinedInsight.synergies) {
        // Should find 'product' and 'demo' as synergies (appear in both)
        expect(insight.combinedInsight.synergies.length).toBeGreaterThan(0);
      }
    });

    it('should calculate contribution for each source', async () => {
      const assets: MultimodalAsset[] = [
        {
          id: 'asset-1',
          tenantId,
          userId: 'user-1',
          assetType: 'image',
          url: 'https://example.com/image.jpg',
          fileName: 'image.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          extracted: {
            text: 'Extracted text',
            description: 'Description',
          },
          analysis: {
            summary: 'Summary',
            keyInsights: ['insight1'],
            sentiment: 'positive',
          },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
      ];

      (mockMultimodalAssetService.getAsset as any).mockResolvedValue(assets[0]);

      const insight = await service.analyzeMultimodal({
        tenantId,
        assetIds: ['asset-1'],
      });

      expect(insight.sources.length).toBe(1);
      expect(insight.sources[0].contribution).toBeGreaterThan(0);
      expect(insight.sources[0].contribution).toBeLessThanOrEqual(1);
    });

    it('should save insight to Cosmos DB', async () => {
      const assets: MultimodalAsset[] = [
        {
          id: 'asset-1',
          tenantId,
          userId: 'user-1',
          assetType: 'image',
          url: 'https://example.com/image.jpg',
          fileName: 'image.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          analysis: { summary: 'Summary' },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
      ];

      (mockMultimodalAssetService.getAsset as any).mockResolvedValue(assets[0]);

      await service.analyzeMultimodal({
        tenantId,
        assetIds: ['asset-1'],
      });

      expect(mockCosmosClient.database().container().items.create).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing assets gracefully', async () => {
      (mockMultimodalAssetService.getAsset as any).mockResolvedValue(null);

      const insight = await service.analyzeMultimodal({
        tenantId,
        assetIds: ['missing-asset'],
      });

      expect(insight).toBeDefined();
      expect(insight.sources.length).toBe(0);
    });

    it('should handle asset service errors gracefully', async () => {
      (mockMultimodalAssetService.getAsset as any).mockRejectedValue(
        new Error('Asset service error')
      );

      const insight = await service.analyzeMultimodal({
        tenantId,
        assetIds: ['asset-1'],
      });

      expect(insight).toBeDefined();
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle Cosmos DB errors gracefully', async () => {
      const assets: MultimodalAsset[] = [
        {
          id: 'asset-1',
          tenantId,
          userId: 'user-1',
          assetType: 'image',
          url: 'https://example.com/image.jpg',
          fileName: 'image.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          analysis: { summary: 'Summary' },
          processingStatus: 'completed',
          uploadedBy: 'user-1',
          uploadedAt: new Date(),
          updatedAt: new Date(),
          type: 'multimodal_asset',
          partitionKey: tenantId,
        },
      ];

      (mockMultimodalAssetService.getAsset as any).mockResolvedValue(assets[0]);
      (mockCosmosClient.database().container().items.create as any).mockRejectedValue(
        new Error('Cosmos DB error')
      );

      await expect(
        service.analyzeMultimodal({
          tenantId,
          assetIds: ['asset-1'],
        })
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});
