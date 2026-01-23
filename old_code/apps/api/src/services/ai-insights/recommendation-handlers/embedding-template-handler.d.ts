import { RecommendationContext, RecommendationOption, EmbeddingTemplateRecommendation } from '@castiel/shared-types';
import { BaseRecommendationHandler } from './base-handler.js';
/**
 * Handler for embedding template recommendations
 * Suggests field weights, preprocessing options, and model configurations
 */
export declare class EmbeddingTemplateRecommendationHandler extends BaseRecommendationHandler<EmbeddingTemplateRecommendation> {
    readonly type: "embeddingTemplate";
    /**
     * Validate embedding template recommendation
     */
    validate(recommendation: EmbeddingTemplateRecommendation): Promise<{
        valid: boolean;
        errors?: string[];
    }>;
    /**
     * Embedding templates are medium risk
     */
    shouldAutoApply(_option: RecommendationOption<EmbeddingTemplateRecommendation>, _context: RecommendationContext): boolean;
    /**
     * No next action for embedding templates
     */
    suggestNextAction(): Promise<null>;
    /**
     * Parse AI response into embedding template recommendations
     */
    protected parseAIResponse(response: string): RecommendationOption<EmbeddingTemplateRecommendation>[];
    /**
     * Normalize option to standard format
     */
    private normalizeOption;
    /**
     * Build prompt context with embedding-specific variables
     */
    protected buildPromptContext(context: RecommendationContext): Record<string, any>;
}
//# sourceMappingURL=embedding-template-handler.d.ts.map