// @ts-nocheck - Optional AI service, not used by workers
import { IMonitoringProvider } from '@castiel/monitoring';
import { AIConnectionService } from './ai-connection.service.js';
import { ModelRouterService } from '../model-router.service.js';
import { AIConfigService } from '../ai-config.service.js';
import { DEFAULT_MODEL_SELECTION_CONFIG } from '../../types/ai-provider.types.js';
import type { 
  AIModel, 
  AIConnectionCredentials,
  QualityTier 
} from '@castiel/shared-types';
import type {
  ModelSelectionRequest,
  ModelSelectionResult,
  ModelUnavailableResult
} from '../../types/ai-insights.types.js';

type AIModelType = 'LLM' | 'Embedding' | 'ImageGeneration' | 'TextToSpeech' | 'SpeechToText' | 'Vision' | 'VideoGeneration' | 'Moderation';

/**
 * AI Model Selection Service
 * 
 * Intelligent model selection that:
 * - Uses AI Connections (with credentials from Key Vault)
 * - Applies cost/quality optimization
 * - Handles multi-modal requirements
 * - Provides graceful fallbacks
 */
export class AIModelSelectionService {
  constructor(
    private aiConnectionService: AIConnectionService,
    private modelRouter: ModelRouterService,
    private monitoring: IMonitoringProvider,
    private aiConfigService?: AIConfigService
  ) {}

  /**
   * Select optimal model based on requirements
   */
  async selectModel(
    request: ModelSelectionRequest
  ): Promise<ModelSelectionResult | ModelUnavailableResult> {
    const startTime = Date.now();
    
    try {
      // 1. Handle explicit model selection
      if (request.modelId) {
        return await this.selectExplicitModel(request);
      }
      
      // 2. Check content type requirements
      const modelType = this.mapContentTypeToModelType(request.requiredContentType);
      if (modelType && request.requiredContentType !== 'text') {
        return await this.selectByContentType(request, modelType);
      }
      
      // 3. Get available LLM connections
      const connections = await this.aiConnectionService.listConnections({
        tenantId: request.tenantId,
        status: 'active',
      });
      
      if (connections.connections.length === 0) {
        // Try system-wide connections if no tenant-specific ones found
        const systemConnections = await this.aiConnectionService.listConnections({
          tenantId: 'system',
          status: 'active',
        });
        
        if (systemConnections.connections.length === 0) {
          return await this.handleNoConnections(request);
        }
        
        connections.connections = systemConnections.connections;
      }
      
      // 4. Analyze query complexity (already async)
      const complexity = await this.modelRouter.analyzeComplexity(request.query);
      
      // 5. Score and rank connections
      const scored = await this.scoreConnections(
        connections.connections,
        complexity,
        request
      );
      
      if (scored.length === 0) {
        return await this.handleNoConnections(request);
      }
      
      // 6. Select best connection
      const best = scored[0];
      const connectionWithCreds = await this.aiConnectionService.getConnectionWithCredentials(
        best.connection.id
      );
      
      if (!connectionWithCreds) {
        throw new Error('Failed to get connection credentials');
      }
      
      const result: ModelSelectionResult = {
        success: true,
        connection: connectionWithCreds,
        model: best.model!,
        reason: best.reason,
        estimatedCost: best.estimatedCost,
        estimatedLatencyMs: best.estimatedLatency,
        alternatives: scored.slice(1, 4).map(s => ({
          modelId: s.model!.id,
          modelName: s.model!.name,
          reason: s.reason,
        })),
      };
      
      this.monitoring.trackEvent('ai-model-selection.success', {
        tenantId: request.tenantId,
        selectedModel: result.model.id,
        reason: result.reason,
        complexity: complexity.score,
        durationMs: Date.now() - startTime,
      });
      
      return result;
      
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'ai-model-selection.selectModel',
        tenantId: request.tenantId,
      });
      throw error;
    }
  }

  /**
   * Record model performance metrics for learning
   * This enables performance-based model selection when configured
   */
  async recordModelPerformance(
    modelId: string,
    metrics: {
      latencyMs: number;
      tokensPerSecond?: number;
      success: boolean;
      satisfactionScore?: number;
    }
  ): Promise<void> {
    try {
      // Record performance via ModelRouterService
      await this.modelRouter.recordPerformance(modelId, metrics);
      
      this.monitoring.trackEvent('ai-model-selection.performance-recorded', {
        modelId,
        latencyMs: metrics.latencyMs,
        success: metrics.success,
      });
    } catch (error: any) {
      // Don't throw - performance tracking is non-critical
      this.monitoring.trackException(error, {
        operation: 'ai-model-selection.recordModelPerformance',
        modelId,
      });
    }
  }
  
  /**
   * Handle explicit model selection by user
   */
  private async selectExplicitModel(
    request: ModelSelectionRequest
  ): Promise<ModelSelectionResult | ModelUnavailableResult> {
    // Find connection for this model
    const connections = await this.aiConnectionService.listConnections({
      tenantId: request.tenantId,
      modelId: request.modelId,
      status: 'active',
    });
    
    if (connections.connections.length === 0) {
      // Try system connections
      const systemConnections = await this.aiConnectionService.listConnections({
        tenantId: 'system',
        modelId: request.modelId,
        status: 'active',
      });
      
      if (systemConnections.connections.length === 0) {
        return {
          success: false,
          error: 'NO_CONNECTIONS',
          message: `No active connection found for model: ${request.modelId}`,
          availableTypes: [],
          suggestions: [
            'Create a connection for this model in Settings > AI Models',
            'Contact your administrator to enable this model',
            'Try using automatic model selection',
          ],
        };
      }
      
      connections.connections = systemConnections.connections;
    }
    
    const conn = connections.connections[0];
    const model = await this.aiConnectionService['getModelById'](conn.modelId);
    
    if (!model) {
      return {
        success: false,
        error: 'MODEL_UNAVAILABLE',
        message: `Model not found: ${request.modelId}`,
        availableTypes: [],
        suggestions: ['Use automatic model selection'],
      };
    }
    
    const connectionWithCreds = await this.aiConnectionService.getConnectionWithCredentials(conn.id);
    
    if (!connectionWithCreds) {
      throw new Error('Failed to get connection credentials');
    }
    
    return {
      success: true,
      connection: connectionWithCreds,
      model,
      reason: 'User explicitly selected this model',
      estimatedCost: this.estimateCost(model, request.contextSize || 1000, 500),
      estimatedLatencyMs: model.avgLatencyMs || 2000,
      alternatives: [],
    };
  }
  
  /**
   * Select model by content type (image, audio, video)
   */
  private async selectByContentType(
    request: ModelSelectionRequest,
    modelType: AIModelType
  ): Promise<ModelSelectionResult | ModelUnavailableResult> {
    // Find connections for this model type
    const connections = await this.aiConnectionService.listConnections({
      tenantId: request.tenantId,
      status: 'active',
    });
    
    // Filter by model type
    const matching = [];
    for (const conn of connections.connections) {
      const model = await this.aiConnectionService['getModelById'](conn.modelId);
      if (model && model.type === modelType) {
        matching.push({ connection: conn, model });
      }
    }
    
    // Try system connections if no tenant connections
    if (matching.length === 0) {
      const systemConnections = await this.aiConnectionService.listConnections({
        tenantId: 'system',
        status: 'active',
      });
      
      for (const conn of systemConnections.connections) {
        const model = await this.aiConnectionService['getModelById'](conn.modelId);
        if (model && model.type === modelType) {
          matching.push({ connection: conn, model });
        }
      }
    }
    
    if (matching.length === 0) {
      // No models available for this content type
      return this.handleContentTypeUnavailable(request, modelType);
    }
    
    // Select best by quality tier or default
    const best = matching.find(m => m.connection.isDefaultModel) || matching[0];
    
    const connectionWithCreds = await this.aiConnectionService.getConnectionWithCredentials(
      best.connection.id
    );
    
    if (!connectionWithCreds) {
      throw new Error('Failed to get connection credentials');
    }
    
    return {
      success: true,
      connection: connectionWithCreds,
      model: best.model,
      reason: `Selected for ${request.requiredContentType} generation`,
      estimatedCost: this.estimateCost(best.model, 1000, 0),
      estimatedLatencyMs: best.model.avgLatencyMs || 3000,
      alternatives: matching.slice(1, 4).map(m => ({
        modelId: m.model.id,
        modelName: m.model.name,
        reason: `Alternative ${request.requiredContentType} model`,
      })),
    };
  }
  
  /**
   * Score connections based on requirements
   */
  private async scoreConnections(
    connections: any[],
    complexity: any,
    request: ModelSelectionRequest
  ): Promise<Array<{
    connection: any;
    model: AIModel | null;
    score: number;
    reason: string;
    estimatedCost: number;
    estimatedLatency: number;
  }>> {
    // Get model selection configuration
    const config = await this.getModelSelectionConfig();
    const weights = config.scoringWeights;
    const thresholds = config.complexityThresholds;
    
    const scored = [];
    
    for (const conn of connections) {
      const model = await this.aiConnectionService['getModelById'](conn.modelId);
      if (!model || model.type !== 'LLM') {continue;}
      
      let score = 0;
      let reason = '';
      
      // 1. Complexity matching (configurable weight)
      const complexityFit = this.getComplexityFit(model.qualityTier, complexity.score, thresholds);
      score += complexityFit * weights.complexityMatching;
      
      // 2. Cost optimization (configurable weight)
      const costScore = this.getCostScore(model, request, config);
      score += costScore * weights.costOptimization;
      
      // 3. Capability matching (configurable weight)
      const capabilityScore = this.getCapabilityScore(model, request);
      score += capabilityScore * weights.capabilityMatching;
      
      // 4. Performance-based scoring (if enabled and data available)
      if (config.performanceBasedSelection?.enabled && weights.performanceHistory) {
        const performanceScore = await this.getPerformanceScore(model.id, config.performanceBasedSelection);
        score += performanceScore * weights.performanceHistory;
      }
      
      // Determine reason based on thresholds
      if (complexity.score <= thresholds.economyMax) {
        reason = `Economy model suitable for simple task (complexity: ${complexity.score})`;
      } else if (complexity.score >= thresholds.premiumMin) {
        reason = `Premium model for complex reasoning (complexity: ${complexity.score})`;
      } else {
        reason = `Balanced model for moderate complexity (complexity: ${complexity.score})`;
      }
      
      scored.push({
        connection: conn,
        model,
        score,
        reason,
        estimatedCost: this.estimateCost(model, request.contextSize || 1000, 500),
        estimatedLatency: model.avgLatencyMs || 2000,
      });
    }
    
    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Get model selection configuration
   */
  private async getModelSelectionConfig() {
    if (this.aiConfigService) {
      try {
        const systemConfig = await this.aiConfigService.getSystemConfig();
        return systemConfig.modelSelection || DEFAULT_MODEL_SELECTION_CONFIG;
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'ai-model-selection.getConfig',
        });
      }
    }
    return DEFAULT_MODEL_SELECTION_CONFIG;
  }
  
  /**
   * Get cost score based on model tier and request preferences
   */
  private getCostScore(model: AIModel, request: ModelSelectionRequest, config: any): number {
    const preferQuality = request.preferQuality || config.defaultQualityPreference;
    
    if (preferQuality === 'economy') {
      return model.qualityTier === 'economy' ? 30 : model.qualityTier === 'standard' ? 20 : 10;
    } else if (preferQuality === 'premium') {
      return model.qualityTier === 'premium' ? 30 : model.qualityTier === 'standard' ? 20 : 10;
    } else {
      // Balanced
      if (model.qualityTier === 'economy') {return 20;}
      else if (model.qualityTier === 'standard') {return 30;}
      else {return 20;}
    }
  }
  
  /**
   * Get capability matching score
   */
  private getCapabilityScore(model: AIModel, request: ModelSelectionRequest): number {
    let score = 0;
    const maxScore = 30;
    
    // Check for function calling requirement
    if (request.requiresFunctionCalling && model.supportsFunctionCalling) {
      score += 10;
    }
    
    // Check for vision requirement
    if (request.requiresVision && model.supportsVision) {
      score += 10;
    }
    
    // Check for JSON mode requirement
    if (request.requiresJSON && model.supportsJSON) {
      score += 10;
    }
    
    // If no specific requirements, give base score
    if (score === 0) {
      score = maxScore;
    }
    
    return score;
  }
  
  /**
   * Get complexity fit score (0-1)
   */
  private getComplexityFit(tier: QualityTier, complexity: number, thresholds: { economyMax: number; premiumMin: number }): number {
    if (complexity <= thresholds.economyMax) {
      // Simple task
      return tier === 'economy' ? 1.0 : tier === 'standard' ? 0.7 : 0.5;
    } else if (complexity >= thresholds.premiumMin) {
      // Complex task
      return tier === 'premium' ? 1.0 : tier === 'standard' ? 0.7 : 0.4;
    } else {
      // Moderate task
      return tier === 'standard' ? 1.0 : 0.8;
    }
  }

  /**
   * Get performance-based score for a model (0-1 scale)
   * Returns 0 if performance data is insufficient or disabled
   */
  private async getPerformanceScore(
    modelId: string,
    config: {
      enabled: boolean;
      minSampleSize: number;
      considerLatency: boolean;
      considerSuccessRate: boolean;
      considerUserSatisfaction: boolean;
    }
  ): Promise<number> {
    if (!config.enabled) {return 0;}

    try {
      const performance = await this.modelRouter.getModelPerformance(modelId);
      
      if (!performance || performance.totalRequests < config.minSampleSize) {
        // Not enough data yet
        return 0;
      }

      let score = 0;
      let factors = 0;

      // Latency score (lower is better, normalized to 0-1)
      if (config.considerLatency && performance.avgLatencyMs > 0) {
        // Normalize: 0ms = 1.0, 10000ms = 0.0 (linear)
        const latencyScore = Math.max(0, 1 - (performance.avgLatencyMs / 10000));
        score += latencyScore;
        factors++;
      }

      // Success rate (higher is better, already 0-1)
      if (config.considerSuccessRate) {
        score += performance.successRate;
        factors++;
      }

      // User satisfaction (if available, higher is better, already 0-1)
      if (config.considerUserSatisfaction && performance.avgSatisfactionScore > 0) {
        score += performance.avgSatisfactionScore;
        factors++;
      }

      // Average the factors
      return factors > 0 ? score / factors : 0;
    } catch (error: any) {
      // If performance data unavailable, return 0 (no penalty, just no bonus)
      this.monitoring.trackException(error, {
        operation: 'ai-model-selection.getPerformanceScore',
        modelId,
      });
      return 0;
    }
  }
  
  /**
   * Map content type to model type
   */
  private mapContentTypeToModelType(contentType?: string): AIModelType | null {
    switch (contentType) {
      case 'image': return 'ImageGeneration';
      case 'audio': return 'TextToSpeech';
      case 'video': return 'VideoGeneration';
      default: return null;
    }
  }
  
  /**
   * Handle case where no connections available
   */
  private async handleNoConnections(
    request: ModelSelectionRequest
  ): Promise<ModelUnavailableResult> {
    return {
      success: false,
      error: 'NO_CONNECTIONS',
      message: 'No AI model connections available for your organization',
      availableTypes: [],
      suggestions: [
        'Contact your administrator to set up AI model connections',
        'Visit Settings > AI Models to configure connections',
        'Ensure at least one model connection is active',
      ],
    };
  }
  
  /**
   * Handle content type unavailable
   */
  private async handleContentTypeUnavailable(
    request: ModelSelectionRequest,
    requestedType: AIModelType
  ): Promise<ModelUnavailableResult> {
    // Get available types
    const allConnections = await this.aiConnectionService.listConnections({
      tenantId: request.tenantId,
      status: 'active',
    });
    
    const availableTypes = new Set<string>();
    for (const conn of allConnections.connections) {
      const model = await this.aiConnectionService['getModelById'](conn.modelId);
      if (model) {
        availableTypes.add(this.modelTypeToContentType(model.type));
      }
    }
    
    return {
      success: false,
      error: 'NO_CAPABILITY',
      message: `No ${request.requiredContentType} generation models are currently available`,
      requestedContentType: request.requiredContentType,
      availableTypes: Array.from(availableTypes),
      suggestions: [
        `Connect a ${request.requiredContentType} generation model in Settings > AI Models`,
        `Available capabilities: ${Array.from(availableTypes).join(', ')}`,
        request.allowFallback 
          ? 'Using text response as fallback' 
          : 'Set allowFallback=true to use text response instead',
      ],
    };
  }
  
  /**
   * Model type to content type
   */
  private modelTypeToContentType(type: AIModelType): string {
    switch (type) {
      case 'LLM': return 'text';
      case 'ImageGeneration': return 'image';
      case 'TextToSpeech': return 'audio';
      case 'VideoGeneration': return 'video';
      case 'Embedding': return 'embedding';
      default: return 'other';
    }
  }
  
  /**
   * Estimate cost
   */
  private estimateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    if (!model.pricing) {return 0;}
    
    const inputCost = (inputTokens / 1_000_000) * (model.pricing.inputPricePerMillion || 0);
    const outputCost = (outputTokens / 1_000_000) * (model.pricing.outputPricePerMillion || 0);
    
    return inputCost + outputCost;
  }
}
