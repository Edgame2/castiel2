/**
 * Smart Model Router Service
 * Routes AI requests to the most appropriate model based on:
 * - Query complexity
 * - Cost optimization
 * - Performance requirements
 * - Model capabilities
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { AIConfigService } from './ai-config.service.js';
export interface AIModel {
    id: string;
    name: string;
    modelId: string;
    modelType: 'LLM' | 'EMBEDDING' | 'IMAGE_GENERATION';
    provider: string;
    contextWindow: number;
    maxOutputTokens: number;
    supportsStreaming: boolean;
    supportsVision: boolean;
    supportsFunctionCalling: boolean;
    supportsJSON: boolean;
    inputPricePerMillion: number;
    outputPricePerMillion: number;
    isActive: boolean;
    isDefault: boolean;
    qualityTier: 'economy' | 'standard' | 'premium';
}
export interface RoutingRequest {
    tenantId: string;
    query: string;
    insightType?: string;
    contextSize?: number;
    requiresVision?: boolean;
    requiresFunctionCalling?: boolean;
    requiresJSON?: boolean;
    preferStreaming?: boolean;
    maxLatencyMs?: number;
    maxCostPerRequest?: number;
    forcedModelId?: string;
}
export interface RoutingResult {
    model: AIModel;
    reason: string;
    alternativeModels: AIModel[];
    estimatedCost: number;
    estimatedLatencyMs: number;
    complexityScore: number;
}
export interface QueryComplexity {
    score: number;
    factors: {
        length: number;
        technicalTerms: number;
        questionComplexity: number;
        contextRequirement: number;
        reasoningDepth: number;
    };
    recommendation: 'economy' | 'standard' | 'premium';
}
export interface ModelPerformance {
    modelId: string;
    avgLatencyMs: number;
    avgTokensPerSecond: number;
    errorRate: number;
    successRate: number;
    avgSatisfactionScore: number;
    totalRequests: number;
}
export interface RoutingConfig {
    enableSmartRouting: boolean;
    defaultTier: 'economy' | 'standard' | 'premium';
    costOptimizationWeight: number;
    qualityWeight: number;
    latencyWeight: number;
    economyThreshold: number;
    premiumThreshold: number;
}
export declare class ModelRouterService {
    private readonly shardRepository;
    private readonly shardTypeRepository;
    private readonly redis;
    private readonly monitoring;
    private readonly aiConfigService?;
    private config;
    private modelCache;
    private performanceCache;
    private readonly CACHE_TTL;
    private lastCacheRefresh;
    private configCache;
    private readonly CONFIG_CACHE_TTL;
    constructor(shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, redis: Redis | null, monitoring: IMonitoringProvider, aiConfigService?: AIConfigService | undefined, config?: Partial<RoutingConfig>);
    /**
     * Get complexity thresholds from configuration
     */
    private getComplexityThresholds;
    /**
     * Route a request to the best model
     */
    route(request: RoutingRequest): Promise<RoutingResult>;
    /**
     * Analyze query complexity
     */
    analyzeComplexity(query: string): Promise<QueryComplexity>;
    /**
     * Get performance metrics for a model
     */
    getModelPerformance(modelId: string): Promise<ModelPerformance | null>;
    /**
     * Record model performance
     */
    recordPerformance(modelId: string, metrics: {
        latencyMs: number;
        tokensPerSecond?: number;
        success: boolean;
        satisfactionScore?: number;
    }): Promise<void>;
    private getAvailableModels;
    private getModelById;
    private filterByCapabilities;
    private scoreModels;
    private getTierMatchScore;
    private getCostScore;
    private getLatencyScore;
    private estimateLatency;
    private estimateCost;
    private determineQualityTier;
}
export declare function createModelRouterService(shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, redis: Redis | null, monitoring: IMonitoringProvider, config?: Partial<RoutingConfig>): ModelRouterService;
//# sourceMappingURL=model-router.service.d.ts.map