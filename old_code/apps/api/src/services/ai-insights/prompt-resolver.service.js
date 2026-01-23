import { PromptScope } from '../../types/ai-insights/prompt.types.js';
export class PromptResolverService {
    promptRepository;
    promptRenderer;
    abTestService;
    analyticsService;
    monitoring;
    // In-memory cache: tenantId:insightType:slug -> { prompt, expiresAt }
    cache = new Map();
    TTL_MS = 300 * 1000; // 5 minutes
    constructor(promptRepository, promptRenderer, abTestService, analyticsService, monitoring) {
        this.promptRepository = promptRepository;
        this.promptRenderer = promptRenderer;
        this.abTestService = abTestService;
        this.analyticsService = analyticsService;
        this.monitoring = monitoring;
    }
    /**
     * Resolve and render a prompt based on context
     */
    async resolveAndRender(request) {
        const { tenantId, userId, slug, variables, insightType } = request;
        const resolutionStartTime = Date.now();
        // 1. Check for active A/B test experiment
        let selectedPromptId;
        let experimentId;
        let variantId;
        if (this.abTestService && insightType) {
            const variant = await this.abTestService.selectVariant(tenantId, userId, insightType, slug);
            if (variant) {
                selectedPromptId = variant.promptId;
                experimentId = variant.experimentId;
                variantId = variant.variantId;
            }
        }
        // 2. Resolve the best matching prompt definition
        let prompt = null;
        const cacheKeyForCheck = `${tenantId}:${slug}:${userId}:${request.projectId || ''}`;
        const wasFromCache = this.getFromCache(cacheKeyForCheck) !== null;
        if (selectedPromptId) {
            // Use A/B test variant prompt
            prompt = await this.promptRepository.findById(selectedPromptId, tenantId);
        }
        else {
            // Use normal resolution (with project support)
            prompt = await this.resolvePromptDefinition(tenantId, userId, slug, request.projectId);
        }
        if (!prompt) {
            this.monitoring?.trackEvent('prompt-resolver.no-active-prompt', { slug, tenantId });
            // Record fallback
            if (this.analyticsService) {
                this.analyticsService.recordFallback(tenantId, userId, slug, insightType || 'unknown', 'prompt-not-found')
                    .catch((error) => {
                    this.monitoring.trackException(error, {
                        operation: 'prompt-resolver.recordFallback',
                        tenantId,
                        userId,
                        slug,
                    });
                });
            }
            return null;
        }
        // 3. Render the template
        const renderingStartTime = Date.now();
        const rendered = this.promptRenderer.render(prompt.template, variables || {});
        const renderingLatencyMs = Date.now() - renderingStartTime;
        const resolutionLatencyMs = Date.now() - resolutionStartTime;
        // 4. Record A/B test exposure if applicable
        if (this.abTestService && experimentId && variantId) {
            this.abTestService.recordEvent(tenantId, experimentId, userId, {
                eventType: 'exposure',
                metrics: {},
            }).catch((err) => {
                this.monitoring?.trackException(err, { operation: 'prompt-resolver.record-ab-test' });
            });
        }
        // 5. Record prompt usage analytics (non-blocking)
        if (this.analyticsService) {
            this.analyticsService.recordUsage({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                tenantId,
                userId,
                promptId: prompt.id,
                promptSlug: slug,
                promptScope: prompt.scope,
                insightType: insightType || 'unknown',
                resolutionLatencyMs,
                renderingLatencyMs,
                wasFromCache,
                wasABTestVariant: !!experimentId,
                experimentId,
                variantId,
            }).catch((error) => {
                this.monitoring.trackException(error, {
                    operation: 'prompt-resolver.recordUsage',
                    tenantId,
                    userId,
                    promptId: prompt.id,
                });
            });
        }
        return {
            prompt,
            renderedSystemPrompt: rendered.systemPrompt,
            renderedUserPrompt: rendered.userPrompt,
            sourceScope: prompt.scope,
            // Include A/B test metadata if applicable
            ...(experimentId && { experimentId, variantId }),
        };
    }
    /**
     * Resolve prompt definition with precedence: User > Project > Tenant > System
     */
    async resolvePromptDefinition(tenantId, userId, slug, projectId) {
        // Check cache first
        const cacheKey = `${tenantId}:${slug}:${userId}:${projectId || ''}`; // Include userId and projectId for cache key
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        // Parallel lookup: System (Global) vs Tenant/Project/User (Local)
        // Note: Repository methods need to support these specific lookups
        const [userPrompt, projectPrompt, tenantPrompt, systemPrompt] = await Promise.all([
            // 1. User Override
            this.promptRepository.list(tenantId, {
                slug,
                scope: PromptScope.User,
                status: 'active',
                ownerId: userId
            }).then(list => list[0] || null),
            // 2. Project Override (if projectId provided)
            projectId
                ? this.promptRepository.findActiveBySlugAndProject(tenantId, slug, projectId)
                : Promise.resolve(null),
            // 3. Tenant Override
            this.promptRepository.findActiveBySlug(tenantId, slug),
            // 4. System Default (Tenant = "SYSTEM")
            this.promptRepository.findActiveBySlug('SYSTEM', slug)
        ]);
        // Apply Precedence: User > Project > Tenant > System
        let resolved = null;
        if (userPrompt) {
            resolved = userPrompt;
        }
        else if (projectPrompt) {
            resolved = projectPrompt;
        }
        else if (tenantPrompt) {
            resolved = tenantPrompt;
        }
        else if (systemPrompt) {
            resolved = systemPrompt;
        }
        // Cache result
        if (resolved) {
            this.setCache(cacheKey, resolved);
        }
        return resolved;
    }
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.prompt;
    }
    setCache(key, prompt) {
        this.cache.set(key, {
            prompt,
            expiresAt: Date.now() + this.TTL_MS
        });
    }
    /**
     * Recommend prompts based on tags and insight type
     * (Basic implementation for now)
     */
    async recommendPrompts(tenantId, insightType, contextTags) {
        // TODO: specific recommendation logic
        // For now, return active tenant prompts matching the insight type
        return this.promptRepository.list(tenantId, {
            insightType,
            status: 'active'
        });
    }
    /**
     * Find active prompts by tags (supports multiple tags with OR logic)
     */
    async listByTags(tenantId, tags, userId) {
        // Normalize tags to array
        const tagArray = Array.isArray(tags) ? tags : [tags];
        if (tagArray.length === 0) {
            return [];
        }
        // Query repository with tags filter
        // The repository should support 'tags' in the filter object
        const prompts = await this.promptRepository.list(tenantId, {
            tags: tagArray,
            status: 'active',
            ...(userId && { ownerId: userId }) // Include user scope if provided
        });
        return prompts || [];
    }
    /**
     * Record A/B test metric (success, failure, or feedback)
     * This method wraps the abTestService.recordEvent call for convenience
     */
    async recordABTestMetric(tenantId, userId, experimentId, variantId, event) {
        if (!this.abTestService) {
            return; // No A/B test service available
        }
        await this.abTestService.recordEvent(tenantId, experimentId, userId, {
            eventType: event.eventType,
            metrics: event.metrics,
            context: event.context,
        });
    }
}
//# sourceMappingURL=prompt-resolver.service.js.map