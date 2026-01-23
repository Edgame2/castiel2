import { IMonitoringProvider } from '@castiel/monitoring';
import { AIConnectionService } from './ai-connection.service.js';
import { ModelRouterService } from '../model-router.service.js';
import { AIConfigService } from '../ai-config.service.js';
import type { ModelSelectionRequest, ModelSelectionResult, ModelUnavailableResult } from '../../types/ai-insights.types.js';
/**
 * AI Model Selection Service
 *
 * Intelligent model selection that:
 * - Uses AI Connections (with credentials from Key Vault)
 * - Applies cost/quality optimization
 * - Handles multi-modal requirements
 * - Provides graceful fallbacks
 */
export declare class AIModelSelectionService {
    private aiConnectionService;
    private modelRouter;
    private monitoring;
    private aiConfigService?;
    constructor(aiConnectionService: AIConnectionService, modelRouter: ModelRouterService, monitoring: IMonitoringProvider, aiConfigService?: AIConfigService | undefined);
    /**
     * Select optimal model based on requirements
     */
    selectModel(request: ModelSelectionRequest): Promise<ModelSelectionResult | ModelUnavailableResult>;
    /**
     * Record model performance metrics for learning
     * This enables performance-based model selection when configured
     */
    recordModelPerformance(modelId: string, metrics: {
        latencyMs: number;
        tokensPerSecond?: number;
        success: boolean;
        satisfactionScore?: number;
    }): Promise<void>;
    /**
     * Handle explicit model selection by user
     */
    private selectExplicitModel;
    /**
     * Select model by content type (image, audio, video)
     */
    private selectByContentType;
    /**
     * Score connections based on requirements
     */
    private scoreConnections;
    /**
     * Get model selection configuration
     */
    private getModelSelectionConfig;
    /**
     * Get cost score based on model tier and request preferences
     */
    private getCostScore;
    /**
     * Get capability matching score
     */
    private getCapabilityScore;
    /**
     * Get complexity fit score (0-1)
     */
    private getComplexityFit;
    /**
     * Get performance-based score for a model (0-1 scale)
     * Returns 0 if performance data is insufficient or disabled
     */
    private getPerformanceScore;
    /**
     * Map content type to model type
     */
    private mapContentTypeToModelType;
    /**
     * Handle case where no connections available
     */
    private handleNoConnections;
    /**
     * Handle content type unavailable
     */
    private handleContentTypeUnavailable;
    /**
     * Model type to content type
     */
    private modelTypeToContentType;
    /**
     * Estimate cost
     */
    private estimateCost;
}
//# sourceMappingURL=ai-model-selection.service.d.ts.map