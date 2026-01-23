import { PromptRepository } from './prompt.repository';
import { Prompt, PromptResolutionRequest, PromptResolutionResult, InsightType } from '../../types/ai-insights/prompt.types.js';
import { PromptRendererService } from './prompt-renderer.service';
import { PromptABTestService } from '../prompt-ab-test.service.js';
import { PromptAnalyticsService } from '../prompt-analytics.service.js';
export declare class PromptResolverService {
    private readonly promptRepository;
    private readonly promptRenderer;
    private readonly abTestService?;
    private readonly analyticsService?;
    private readonly monitoring?;
    private cache;
    private readonly TTL_MS;
    constructor(promptRepository: PromptRepository, promptRenderer: PromptRendererService, abTestService?: PromptABTestService | undefined, analyticsService?: PromptAnalyticsService | undefined, monitoring?: IMonitoringProvider);
    /**
     * Resolve and render a prompt based on context
     */
    resolveAndRender(request: PromptResolutionRequest): Promise<PromptResolutionResult | null>;
    /**
     * Resolve prompt definition with precedence: User > Project > Tenant > System
     */
    resolvePromptDefinition(tenantId: string, userId: string, slug: string, projectId?: string): Promise<Prompt | null>;
    private getFromCache;
    private setCache;
    /**
     * Recommend prompts based on tags and insight type
     * (Basic implementation for now)
     */
    recommendPrompts(tenantId: string, insightType?: InsightType, contextTags?: string[]): Promise<Prompt[]>;
    /**
     * Find active prompts by tags (supports multiple tags with OR logic)
     */
    listByTags(tenantId: string, tags: string | string[], userId?: string): Promise<Prompt[]>;
    /**
     * Record A/B test metric (success, failure, or feedback)
     * This method wraps the abTestService.recordEvent call for convenience
     */
    recordABTestMetric(tenantId: string, userId: string, experimentId: string, variantId: string, event: {
        eventType: 'exposure' | 'success' | 'failure' | 'feedback';
        metrics: {
            tokensUsed?: number;
            latencyMs?: number;
            cost?: number;
            quality?: number;
            userFeedback?: number;
            feedbackType?: 'positive' | 'negative' | 'neutral';
        };
        context?: {
            insightId?: string;
            conversationId?: string;
            intent?: string;
        };
    }): Promise<void>;
}
//# sourceMappingURL=prompt-resolver.service.d.ts.map