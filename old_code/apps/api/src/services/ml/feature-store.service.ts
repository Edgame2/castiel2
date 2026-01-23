/**
 * Feature Store Service
 * 
 * Extracts, transforms, and stores features for ML models.
 * Implements feature versioning and lineage for production reliability.
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '@castiel/api-core';
import { Redis } from 'ioredis';
import { CosmosClient, Database, Container } from '@azure/cosmos';
import { createHash } from 'crypto';
import type {
  FeatureVector,
  FeatureVersion,
  FeatureSet,
  MLFeature,
} from '../../types/ml.types.js';
import type { Shard } from '../../types/shard.types.js';
import { CORE_SHARD_TYPE_NAMES } from '../../types/core-shard-types.js';

export class FeatureStoreService {
  private readonly FEATURE_CACHE_PREFIX = 'ml:features:';
  private readonly FEATURE_VERSION_CACHE_PREFIX = 'ml:feature-version:';
  private readonly FEATURE_CACHE_TTL = 15 * 60; // 15 minutes

  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private redis: Redis | null,
    private cosmosClient: CosmosClient,
    private database: Database
  ) {}

  /**
   * Extract features for an opportunity
   * Resolves feature versions based on model version compatibility
   */
  async extractFeatures(
    opportunityId: string,
    tenantId: string,
    modelVersion?: string
  ): Promise<FeatureSet> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `${this.FEATURE_CACHE_PREFIX}${tenantId}:${opportunityId}:${modelVersion || 'latest'}`;
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.monitoring.trackMetric('ml.features.cache_hit', 1, {
            opportunityId,
            tenantId,
          });
          return JSON.parse(cached) as FeatureSet;
        }
      }

      // Load opportunity and related shards
      const opportunity = await this.shardRepository.getById(
        opportunityId,
        tenantId
      );

      if (!opportunity) {
        throw new Error(`Opportunity ${opportunityId} not found`);
      }

      // Get related shards (risk snapshots, activities, etc.)
      const relatedShards = await this.getRelatedShards(opportunityId, tenantId);

      // Extract features
      const features = await this.engineerFeatures(
        opportunity,
        relatedShards,
        tenantId
      );

      // Resolve feature versions
      const featureVersions = await this.resolveFeatureVersions(
        Object.keys(features),
        modelVersion
      );

      const featureSet: FeatureSet = {
        opportunityId,
        tenantId,
        features,
        featureVersions,
        modelVersion,
        createdAt: new Date(),
      };

      // Cache the result
      if (this.redis) {
        await this.redis.setex(
          cacheKey,
          this.FEATURE_CACHE_TTL,
          JSON.stringify(featureSet)
        );
      }

      // Store features in Cosmos DB
      await this.storeFeatures(opportunityId, tenantId, features, featureVersions, modelVersion);

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('ml.features.extraction_duration_ms', duration, {
        opportunityId,
        tenantId,
        featureCount: Object.keys(features).length,
      });

      return featureSet;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'feature_store.extract_features',
        opportunityId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Get historical features for an opportunity
   */
  async getHistoricalFeatures(
    opportunityId: string,
    tenantId: string
  ): Promise<MLFeature[]> {
    try {
      const container = this.database.container('ml_features');
      const query = {
        query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId AND c.tenantId = @tenantId ORDER BY c.createdAt DESC',
        parameters: [
          { name: '@opportunityId', value: opportunityId },
          { name: '@tenantId', value: tenantId },
        ],
      };

      const { resources } = await container.items.query(query).fetchAll();
      return resources as MLFeature[];
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'feature_store.get_historical_features',
        opportunityId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Pin feature versions for a training job
   * This ensures training uses consistent feature versions
   */
  async pinFeatureVersions(
    trainingJobId: string,
    featureNames: string[]
  ): Promise<Record<string, string>> {
    try {
      const pinnedVersions: Record<string, string> = {};

      for (const featureName of featureNames) {
        // Get latest version
        const version = await this.getLatestFeatureVersion(featureName);
        pinnedVersions[featureName] = version;
      }

      // Store pinned versions (could be in Cosmos DB or Redis)
      if (this.redis) {
        const key = `ml:training:${trainingJobId}:feature-versions`;
        await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(pinnedVersions)); // 7 days
      }

      return pinnedVersions;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'feature_store.pin_feature_versions',
        trainingJobId,
      });
      throw error;
    }
  }

  /**
   * Get feature version for inference
   * Returns latest compatible version based on model version
   */
  async getFeatureVersionForInference(
    featureName: string,
    modelVersion?: string
  ): Promise<string> {
    // For Phase 1, return latest version
    // In Phase 2, implement compatibility checking based on computationLogicHash
    return await this.getLatestFeatureVersion(featureName);
  }

  /**
   * Check if feature version is compatible with required version
   */
  async isCompatibleVersion(
    featureVersion: string,
    requiredVersion: string
  ): Promise<boolean> {
    // For Phase 1, simple version comparison
    // In Phase 2, check computationLogicHash compatibility
    return featureVersion >= requiredVersion;
  }

  /**
   * Get feature schema and metadata
   */
  async getFeatureSchema(): Promise<Record<string, { type: string; description: string }>> {
    // Return feature schema definition
    return {
      dealValue: { type: 'number', description: 'Opportunity deal value' },
      probability: { type: 'number', description: 'Win probability' },
      daysToClose: { type: 'number', description: 'Days until expected close' },
      daysSinceActivity: { type: 'number', description: 'Days since last activity' },
      stage: { type: 'string', description: 'Opportunity stage' },
      industry: { type: 'string', description: 'Industry' },
      ownerWinRate: { type: 'number', description: 'Owner historical win rate' },
      accountHealth: { type: 'number', description: 'Account health score' },
      similarDealsWinRate: { type: 'number', description: 'Similar deals win rate' },
      stakeholderCount: { type: 'number', description: 'Number of stakeholders' },
      activityCount: { type: 'number', description: 'Number of activities' },
      documentCount: { type: 'number', description: 'Number of documents' },
      riskScore: { type: 'number', description: 'Current risk score' },
      detectedRisksCount: { type: 'number', description: 'Number of detected risks' },
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Engineer features from opportunity and related shards
   */
  private async engineerFeatures(
    opportunity: Shard,
    relatedShards: Shard[],
    tenantId: string
  ): Promise<FeatureVector> {
    const features: FeatureVector = {};
    const structuredData = opportunity.structuredData || {};

    // Opportunity features
    features.dealValue = structuredData.dealValue as number || 0;
    features.probability = structuredData.probability as number || 0;
    features.stage = structuredData.stage as string || '';
    features.industry = structuredData.industry as string || '';

    // Calculate temporal features
    const expectedCloseDate = structuredData.expectedCloseDate 
      ? new Date(structuredData.expectedCloseDate as string)
      : null;
    features.daysToClose = expectedCloseDate
      ? Math.max(0, Math.floor((expectedCloseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 365; // Default to 1 year if not set

    // Find latest activity
    const activities = relatedShards.filter(s => s.shardType === CORE_SHARD_TYPE_NAMES.ACTIVITY);
    const latestActivity = activities.sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    )[0];
    
    features.daysSinceActivity = latestActivity
      ? Math.floor((Date.now() - (latestActivity.createdAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24))
      : 999;

    // Relationship features
    features.stakeholderCount = relatedShards.filter(s => 
      s.shardType === CORE_SHARD_TYPE_NAMES.CONTACT
    ).length;
    features.activityCount = activities.length;
    features.documentCount = relatedShards.filter(s => 
      s.shardType === CORE_SHARD_TYPE_NAMES.DOCUMENT
    ).length;

    // Risk features
    const riskSnapshots = relatedShards.filter(s => 
      s.shardType === 'c_risk_snapshot'
    );
    if (riskSnapshots.length > 0) {
      const latestRisk = riskSnapshots[0];
      const riskData = latestRisk.structuredData || {};
      features.riskScore = riskData.riskScore as number || 0;
      features.detectedRisksCount = Array.isArray(riskData.risks) 
        ? riskData.risks.length 
        : 0;
    } else {
      features.riskScore = 0;
      features.detectedRisksCount = 0;
    }

    // Historical features (simplified for Phase 1)
    // In Phase 2, implement actual historical queries
    features.ownerWinRate = 0.5; // Placeholder
    features.accountHealth = 0.5; // Placeholder
    features.similarDealsWinRate = 0.5; // Placeholder

    return features;
  }

  /**
   * Get related shards for an opportunity
   */
  private async getRelatedShards(
    opportunityId: string,
    tenantId: string
  ): Promise<Shard[]> {
    // Get related shards via relationships
    // This is simplified - in production, use ShardRelationshipService
    const relatedShardIds: string[] = [];
    
    // For now, return empty array - relationships will be loaded separately
    // In production, query shard-relationships container
    return [];
  }

  /**
   * Resolve feature versions for inference
   */
  private async resolveFeatureVersions(
    featureNames: string[],
    modelVersion?: string
  ): Promise<Record<string, string>> {
    const versions: Record<string, string> = {};

    for (const featureName of featureNames) {
      const version = await this.getFeatureVersionForInference(featureName, modelVersion);
      versions[featureName] = version;
    }

    return versions;
  }

  /**
   * Get latest feature version
   */
  private async getLatestFeatureVersion(featureName: string): Promise<string> {
    // For Phase 1, use simple versioning (v1, v2, etc.)
    // In production, query Cosmos DB for latest version
    if (this.redis) {
      const cacheKey = `${this.FEATURE_VERSION_CACHE_PREFIX}${featureName}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Default to v1 for Phase 1
    const version = 'v1';
    
    if (this.redis) {
      const cacheKey = `${this.FEATURE_VERSION_CACHE_PREFIX}${featureName}`;
      await this.redis.setex(cacheKey, 3600, version); // Cache for 1 hour
    }

    return version;
  }

  /**
   * Store features in Cosmos DB
   */
  private async storeFeatures(
    opportunityId: string,
    tenantId: string,
    features: FeatureVector,
    featureVersions: Record<string, string>,
    modelVersion?: string
  ): Promise<void> {
    try {
      const container = this.database.container('ml_features');
      const timestamp = new Date();

      // Store each feature as a separate document for versioning
      const featureDocs: MLFeature[] = Object.entries(features).map(([featureName, value]) => {
        const computationLogicHash = this.computeLogicHash(featureName);
        
        return {
          id: `${opportunityId}:${featureName}:${timestamp.getTime()}`,
          tenantId,
          opportunityId,
          featureName,
          version: featureVersions[featureName] || 'v1',
          value,
          source: 'opportunity',
          computationLogicHash,
          modelVersion,
          createdAt: timestamp,
        };
      });

      // Batch insert (simplified - in production, use bulk operations)
      for (const doc of featureDocs) {
        await container.items.create(doc);
      }
    } catch (error) {
      // Log but don't fail - feature storage is not critical for inference
      this.monitoring.trackException(error as Error, {
        operation: 'feature_store.store_features',
        opportunityId,
        tenantId,
      });
    }
  }

  /**
   * Compute hash of feature computation logic
   * Used for version compatibility checking
   */
  private computeLogicHash(featureName: string): string {
    // For Phase 1, use feature name as hash
    // In Phase 2, hash the actual computation logic
    return createHash('sha256').update(featureName).digest('hex').substring(0, 16);
  }

  /**
   * Invalidate feature cache for an opportunity
   * Called when opportunity is updated
   */
  async invalidateFeatureCache(opportunityId: string, tenantId: string): Promise<void> {
    if (!this.redis) return;

    try {
      // Delete all cached features for this opportunity
      const pattern = `${this.FEATURE_CACHE_PREFIX}${tenantId}:${opportunityId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.monitoring.trackMetric('ml.features.cache_invalidated', keys.length, {
          opportunityId,
          tenantId,
        });
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'feature_store.invalidate_cache',
        opportunityId,
        tenantId,
      });
    }
  }
}
