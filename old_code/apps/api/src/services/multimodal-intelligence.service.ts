/**
 * Multi-Modal Intelligence Service
 * Combines insights from text, images, audio, and documents
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { MultimodalAssetService } from './multimodal-asset.service.js';
import { MultimodalAsset } from '../types/multimodal-asset.types.js';
import { InsightService } from './insight.service.js';
import { VectorSearchService } from './vector-search.service.js';

export interface CrossModalInsight {
  insightId: string;
  tenantId: string;
  opportunityId?: string;
  shardId?: string;
  modalities: Array<'text' | 'image' | 'audio' | 'document'>;
  combinedInsight: {
    summary: string;
    keyFindings: string[];
    confidence: number; // 0-1
    contradictions?: Array<{
      modality: string;
      finding: string;
      confidence: number;
    }>;
    synergies?: Array<{
      modalities: string[];
      finding: string;
      strength: number;
    }>;
  };
  sources: Array<{
    assetId: string;
    modality: 'text' | 'image' | 'audio' | 'document';
    contribution: number; // 0-1: How much this source contributed
    extractedContent?: string;
  }>;
  createdAt: Date;
}

export interface MultimodalAnalysisRequest {
  tenantId: string;
  opportunityId?: string;
  shardId?: string;
  assetIds: string[];
  analysisType?: 'risk' | 'opportunity' | 'sentiment' | 'comprehensive';
}

/**
 * Multi-Modal Intelligence Service
 */
export class MultiModalIntelligenceService {
  private client: CosmosClient;
  private database: Database;
  private insightsContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private multimodalAssetService?: MultimodalAssetService;
  private insightService?: InsightService;
  private vectorSearchService?: VectorSearchService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    multimodalAssetService?: MultimodalAssetService,
    insightService?: InsightService,
    vectorSearchService?: VectorSearchService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.multimodalAssetService = multimodalAssetService;
    this.insightService = insightService;
    this.vectorSearchService = vectorSearchService;

    // Initialize Cosmos client
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
      requestTimeout: 30000,
      enableEndpointDiscovery: true,
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0,
        maxWaitTimeInSeconds: 30,
      } as RetryOptions,
    };

    this.client = cosmosClient || new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
      connectionPolicy,
    });

    this.database = this.client.database(config.cosmosDb.databaseId);
    // Using media container for multimodal insights
    this.insightsContainer = this.database.container(config.cosmosDb.containers.media);
  }

  /**
   * Analyze multiple modalities and generate combined insights
   */
  async analyzeMultimodal(
    request: MultimodalAnalysisRequest
  ): Promise<CrossModalInsight> {
    const { tenantId, assetIds, analysisType = 'comprehensive' } = request;

    // Load all assets
    const assets: MultimodalAsset[] = [];
    for (const assetId of assetIds) {
      if (this.multimodalAssetService) {
        try {
          const asset = await this.multimodalAssetService.getAsset(assetId, tenantId);
          if (asset) {
            assets.push(asset);
          }
        } catch (error) {
          this.monitoring?.trackException(error as Error, {
            operation: 'analyzeMultimodal.getAsset',
            assetId,
          });
        }
      }
    }

    // Extract content from each modality
    const extractedContent = await this.extractContentFromAssets(assets);

    // Generate combined insight
    const combinedInsight = await this.generateCombinedInsight(
      extractedContent,
      analysisType
    );

    // Identify contradictions and synergies
    const contradictions = this.identifyContradictions(extractedContent);
    const synergies = this.identifySynergies(extractedContent);

    // Build sources array
    const sources = assets.map((asset, index) => ({
      assetId: asset.id,
      modality: (asset.assetType === 'video' ? 'document' : asset.assetType) as 'text' | 'image' | 'audio' | 'document',
      contribution: this.calculateContribution(asset, extractedContent[index]),
      extractedContent: extractedContent[index]?.text || extractedContent[index]?.summary,
    }));

    const insight: CrossModalInsight = {
      insightId: uuidv4(),
      tenantId,
      opportunityId: request.opportunityId,
      shardId: request.shardId,
      modalities: [...new Set(assets.map((a) => a.assetType))] as Array<'text' | 'image' | 'audio' | 'document'>,
      combinedInsight: {
        ...combinedInsight,
        contradictions,
        synergies,
      },
      sources,
      createdAt: new Date(),
    };

    // Save insight
    await this.insightsContainer.items.create({
      ...insight,
      type: 'multimodal_insight',
      partitionKey: tenantId,
    });

    this.monitoring?.trackEvent('multimodal_intelligence.insight_generated', {
      tenantId,
      assetCount: assets.length,
      modalities: insight.modalities.join(','),
    });

    return insight;
  }

  /**
   * Extract content from assets
   */
  private async extractContentFromAssets(
    assets: MultimodalAsset[]
  ): Promise<Array<{ text?: string; summary?: string; tags?: string[]; sentiment?: string }>> {
    const extracted: Array<{ text?: string; summary?: string; tags?: string[]; sentiment?: string }> = [];

    for (const asset of assets) {
      const content: { text?: string; summary?: string; tags?: string[]; sentiment?: string } = {};

      // Extract text
      if (asset.extracted?.text) {
        content.text = asset.extracted.text;
      }

      // Extract summary
      if (asset.analysis?.summary) {
        content.summary = asset.analysis.summary;
      }

      // Extract tags
      if (asset.analysis?.keyInsights) {
        content.tags = asset.analysis.keyInsights;
      }

      // Extract sentiment
      if (asset.analysis?.sentiment) {
        content.sentiment = asset.analysis.sentiment;
      }

      extracted.push(content);
    }

    return extracted;
  }

  /**
   * Generate combined insight from extracted content
   */
  private async generateCombinedInsight(
    extractedContent: Array<{ text?: string; summary?: string; tags?: string[]; sentiment?: string }>,
    analysisType: string
  ): Promise<{ summary: string; keyFindings: string[]; confidence: number }> {
    // Combine summaries
    const summaries = extractedContent
      .map((c) => c.summary)
      .filter((s): s is string => !!s);

    const combinedSummary = summaries.length > 0
      ? summaries.join(' ')
      : 'No summary available from multimodal sources';

    // Extract key findings
    const allTags = extractedContent
      .flatMap((c) => c.tags || [])
      .filter((tag, index, self) => self.indexOf(tag) === index); // Unique

    const keyFindings = allTags.slice(0, 10); // Top 10

    // Calculate confidence (more sources = higher confidence)
    const confidence = Math.min(1, 0.5 + (extractedContent.length * 0.1));

    return {
      summary: combinedSummary,
      keyFindings,
      confidence,
    };
  }

  /**
   * Identify contradictions across modalities
   */
  private identifyContradictions(
    extractedContent: Array<{ text?: string; summary?: string; tags?: string[]; sentiment?: string }>
  ): Array<{ modality: string; finding: string; confidence: number }> {
    const contradictions: Array<{ modality: string; finding: string; confidence: number }> = [];

    // Check sentiment contradictions
    const sentiments = extractedContent
      .map((c, index) => ({ sentiment: c.sentiment, index }))
      .filter((s) => s.sentiment);

    if (sentiments.length >= 2) {
      const positive = sentiments.filter((s) => s.sentiment === 'positive').length;
      const negative = sentiments.filter((s) => s.sentiment === 'negative').length;

      if (positive > 0 && negative > 0) {
        contradictions.push({
          modality: 'sentiment',
          finding: 'Mixed sentiment detected across modalities',
          confidence: 0.7,
        });
      }
    }

    return contradictions;
  }

  /**
   * Identify synergies across modalities
   */
  private identifySynergies(
    extractedContent: Array<{ text?: string; summary?: string; tags?: string[]; sentiment?: string }>
  ): Array<{ modalities: string[]; finding: string; strength: number }> {
    const synergies: Array<{ modalities: string[]; finding: string; strength: number }> = [];

    // Find common tags across modalities
    const tagCounts = new Map<string, number>();
    extractedContent.forEach((content, index) => {
      (content.tags || []).forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Tags mentioned in multiple modalities = synergy
    for (const [tag, count] of tagCounts.entries()) {
      if (count >= 2) {
        synergies.push({
          modalities: ['multiple'],
          finding: `"${tag}" appears across multiple modalities`,
          strength: Math.min(1, count / extractedContent.length),
        });
      }
    }

    return synergies;
  }

  /**
   * Calculate contribution of an asset to the overall insight
   */
  private calculateContribution(
    asset: MultimodalAsset,
    extractedContent: { text?: string; summary?: string; tags?: string[]; sentiment?: string }
  ): number {
    let contribution = 0.1; // Base contribution

    // More extracted content = higher contribution
    if (extractedContent.text) contribution += 0.2;
    if (extractedContent.summary) contribution += 0.2;
    if (extractedContent.tags && extractedContent.tags.length > 0) contribution += 0.2;
    if (extractedContent.sentiment) contribution += 0.1;

    // Processed assets contribute more
    if (asset.processingStatus === 'completed') contribution += 0.2;

    return Math.min(1, contribution);
  }
}
