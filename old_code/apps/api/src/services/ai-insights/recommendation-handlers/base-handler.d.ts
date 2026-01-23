import { AIRecommendationResponse, AIRecommendationRequest, IRecommendationHandler, RecommendationContext, RecommendationOption, RecommendationType } from '@castiel/shared-types';
import { AzureOpenAIService } from '../../azure-openai.service.js';
import { PromptResolverService } from '../prompt-resolver.service.js';
import { PromptRendererService } from '../prompt-renderer.service.js';
import { MonitoringService } from '@castiel/monitoring';
/**
 * Base class for all recommendation handlers
 * Provides common functionality and enforces interface
 */
export declare abstract class BaseRecommendationHandler<T = any> implements IRecommendationHandler<T> {
    protected azureOpenAI: AzureOpenAIService;
    protected promptResolver: PromptResolverService;
    protected promptRenderer: PromptRendererService;
    protected monitoring: MonitoringService;
    abstract readonly type: RecommendationType;
    constructor(azureOpenAI: AzureOpenAIService, promptResolver: PromptResolverService, promptRenderer: PromptRendererService, monitoring: MonitoringService);
    /**
     * Enrich context with additional data
     * Override in subclasses to add type-specific enrichment
     */
    enrichContext(context: RecommendationContext): Promise<RecommendationContext>;
    /**
     * Validate the generated recommendation
     * Override in subclasses for type-specific validation
     */
    abstract validate(recommendation: T): Promise<{
        valid: boolean;
        errors?: string[];
    }>;
    /**
     * Generate the recommendation
     */
    generate(context: RecommendationContext, options?: AIRecommendationRequest['options']): Promise<AIRecommendationResponse<T>>;
    /**
     * Determine if recommendation should auto-apply
     * Override in subclasses for type-specific logic
     */
    shouldAutoApply(option: RecommendationOption<T>, context: RecommendationContext): boolean;
    /**
     * Suggest next action (optional)
     * Override in subclasses to enable chaining
     */
    suggestNextAction?(appliedRecommendation: T, context: RecommendationContext): Promise<AIRecommendationResponse['suggestedNextAction'] | null>;
    /**
     * Build context object for prompt rendering
     * Override to add type-specific context variables
     */
    protected buildPromptContext(context: RecommendationContext): Record<string, any>;
    /**
     * Parse AI response into recommendation options
     * Override in subclasses for type-specific parsing
     */
    protected abstract parseAIResponse(response: string): RecommendationOption<T>[];
    /**
     * Estimate token count (rough approximation)
     */
    protected estimateTokens(text: string): number;
}
//# sourceMappingURL=base-handler.d.ts.map