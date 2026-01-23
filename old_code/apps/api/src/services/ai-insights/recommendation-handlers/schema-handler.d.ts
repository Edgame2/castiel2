import { RecommendationContext, RecommendationOption, SchemaRecommendation } from '@castiel/shared-types';
import { BaseRecommendationHandler } from './base-handler.js';
/**
 * Handler for schema recommendations
 * Suggests field types, validation rules, and complete schemas
 */
export declare class SchemaRecommendationHandler extends BaseRecommendationHandler<SchemaRecommendation> {
    readonly type: "schemaRecommendation";
    /**
     * Enrich context with related shard types in same category
     */
    enrichContext(context: RecommendationContext): Promise<RecommendationContext>;
    /**
     * Validate generated schema recommendation
     */
    validate(recommendation: SchemaRecommendation): Promise<{
        valid: boolean;
        errors?: string[];
    }>;
    /**
     * Determine risk level based on schema complexity
     */
    shouldAutoApply(_option: RecommendationOption<SchemaRecommendation>, _context: RecommendationContext): boolean;
    /**
     * Suggest embedding template after schema is applied
     */
    suggestNextAction(appliedRecommendation: SchemaRecommendation, context: RecommendationContext): Promise<{
        type: any;
        context: Partial<RecommendationContext>;
        message: string;
    } | null>;
    /**
     * Parse AI response into schema recommendations
     */
    protected parseAIResponse(response: string): RecommendationOption<SchemaRecommendation>[];
    /**
     * Normalize a single option into standard format
     */
    private normalizeOption;
    /**
     * Build prompt context with schema-specific variables
     */
    protected buildPromptContext(context: RecommendationContext): Record<string, any>;
}
//# sourceMappingURL=schema-handler.d.ts.map