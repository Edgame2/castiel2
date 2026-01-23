import { AIRecommendationRequest, AIRecommendationResponse, RecommendationType, RateLimitState, RateLimitConfig, CostTrackingEntry } from '@castiel/shared-types';
import { AzureOpenAIService } from '../azure-openai.service.js';
import { PromptResolverService } from './prompt-resolver.service.js';
import { PromptRendererService } from './prompt-renderer.service.js';
import { MonitoringService } from '@castiel/monitoring';
/**
 * Unified AI Recommendation Service
 *
 * Orchestrates all recommendation types using specialized handlers.
 * Provides rate limiting, cost tracking, and unified interface.
 */
export declare class AIRecommendationService {
    private azureOpenAI;
    private promptResolver;
    private promptRenderer;
    private monitoring;
    private handlers;
    private rateLimitStates;
    private costTracking;
    private rateLimitConfig;
    constructor(azureOpenAI: AzureOpenAIService, promptResolver: PromptResolverService, promptRenderer: PromptRendererService, monitoring: MonitoringService);
    /**
     * Register all recommendation handlers
     */
    private registerHandlers;
    /**
     * Generate a recommendation
     */
    generate(request: AIRecommendationRequest): Promise<AIRecommendationResponse>;
    /**
     * Check if a recommendation should auto-apply
     */
    shouldAutoApply(response: AIRecommendationResponse, optionIndex?: number): boolean;
    /**
     * Get list of supported recommendation types
     */
    getSupportedTypes(): RecommendationType[];
    /**
     * Check if a recommendation type is supported
     */
    isSupported(type: RecommendationType): boolean;
    /**
     * Configure rate limits
     */
    configureRateLimits(config: Partial<RateLimitConfig>): void;
    /**
     * Get rate limit status for user
     */
    getRateLimitStatus(tenantId: string, userId?: string): RateLimitState;
    /**
     * Get cost tracking data for tenant
     */
    getCostTracking(tenantId: string, startDate?: Date, endDate?: Date): CostTrackingEntry[];
    /**
     * Get total cost for tenant in current month
     */
    getMonthlyTotal(tenantId: string): number;
    /**
     * Check rate limits
     */
    private checkRateLimits;
    /**
     * Increment rate limit counter
     */
    private incrementRateLimit;
    /**
     * Track cost
     */
    private trackCost;
    /**
     * Estimate cost based on token usage
     * Using GPT-4o pricing: $2.50 / 1M input tokens, $10.00 / 1M output tokens
     */
    private estimateCost;
    /**
     * Check budget alerts
     */
    private checkBudgetAlerts;
}
//# sourceMappingURL=ai-recommendation.service.d.ts.map