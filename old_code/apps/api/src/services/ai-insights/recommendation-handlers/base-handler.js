/**
 * Base class for all recommendation handlers
 * Provides common functionality and enforces interface
 */
export class BaseRecommendationHandler {
    azureOpenAI;
    promptResolver;
    promptRenderer;
    monitoring;
    constructor(azureOpenAI, promptResolver, promptRenderer, monitoring) {
        this.azureOpenAI = azureOpenAI;
        this.promptResolver = promptResolver;
        this.promptRenderer = promptRenderer;
        this.monitoring = monitoring;
    }
    /**
     * Enrich context with additional data
     * Override in subclasses to add type-specific enrichment
     */
    async enrichContext(context) {
        return context; // Base implementation returns as-is
    }
    /**
     * Generate the recommendation
     */
    async generate(context, options) {
        const startTime = Date.now();
        try {
            // 1. Enrich context
            const enrichedContext = await this.enrichContext(context);
            // 2. Get prompts for this recommendation type
            const prompts = await this.promptResolver.listByTags(enrichedContext.tenantId, [this.type], enrichedContext.userId);
            if (prompts.length === 0) {
                this.monitoring.trackEvent('aiRecommendation.noPromptFound', {
                    type: this.type,
                    tenantId: enrichedContext.tenantId,
                });
                throw new Error(`No prompt found for recommendation type: ${this.type}`);
            }
            // Use the first prompt (highest precedence)
            const prompt = prompts[0];
            // 3. Render system and user prompts
            const systemPrompt = await this.promptRenderer.render(prompt.systemPrompt || '', this.buildPromptContext(enrichedContext));
            const userPrompt = await this.promptRenderer.render(prompt.userPromptTemplate || '', this.buildPromptContext(enrichedContext));
            // Validate prompts are not empty
            if (!systemPrompt.trim() && !userPrompt.trim()) {
                throw new Error('Both system and user prompts are empty after rendering');
            }
            // 4. Call Azure OpenAI
            const temperature = options?.temperature ?? 0.3;
            const maxTokens = options?.maxTokens ?? 2000;
            const model = options?.preferredModel || 'gpt-4o';
            const response = await this.azureOpenAI.chat(systemPrompt, userPrompt, {
                temperature,
                maxTokens,
                deploymentName: model,
            });
            // Validate response has content
            if (!response || !response.trim()) {
                throw new Error('AI model returned empty response');
            }
            // 5. Parse response and create options
            const rawOptions = this.parseAIResponse(response);
            const maxOptions = options?.maxOptions ?? 3;
            const limitedOptions = rawOptions.slice(0, maxOptions);
            // 6. Validate each option
            const validatedOptions = [];
            for (const option of limitedOptions) {
                const validation = await this.validate(option.recommendation);
                if (validation.valid) {
                    validatedOptions.push(option);
                }
                else {
                    this.monitoring.trackEvent('aiRecommendation.validationFailed', {
                        type: this.type,
                        errors: validation.errors,
                    });
                }
            }
            if (validatedOptions.length === 0) {
                throw new Error('All generated recommendations failed validation');
            }
            // 7. Build response
            const processingTime = (Date.now() - startTime) / 1000;
            const aiResponse = {
                type: this.type,
                options: validatedOptions,
                metadata: {
                    model,
                    tokens: {
                        prompt: this.estimateTokens(systemPrompt + userPrompt),
                        completion: this.estimateTokens(response),
                        total: this.estimateTokens(systemPrompt + userPrompt + response),
                    },
                    processingTime,
                    promptUsed: prompt.slug,
                    promptVersion: prompt.version,
                    temperature,
                    timestamp: new Date(),
                },
            };
            // 8. Suggest next action if applicable
            if (this.suggestNextAction) {
                const nextAction = await this.suggestNextAction(validatedOptions[0].recommendation, enrichedContext);
                if (nextAction) {
                    aiResponse.suggestedNextAction = nextAction;
                }
            }
            // 9. Track success
            this.monitoring.trackEvent('aiRecommendation.generated', {
                type: this.type,
                tenantId: enrichedContext.tenantId,
                userId: enrichedContext.userId,
                optionsCount: validatedOptions.length,
                processingTime,
            });
            return aiResponse;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                type: this.type,
                tenantId: context.tenantId,
                userId: context.userId,
            });
            throw error;
        }
    }
    /**
     * Determine if recommendation should auto-apply
     * Override in subclasses for type-specific logic
     */
    shouldAutoApply(option, context) {
        // Default: auto-apply only low-risk recommendations if user prefers it
        if (option.riskLevel !== 'low') {
            return false;
        }
        return context.userPreferences?.autoApplyLowRisk ?? false;
    }
    /**
     * Build context object for prompt rendering
     * Override to add type-specific context variables
     */
    buildPromptContext(context) {
        return {
            tenantId: context.tenantId,
            userId: context.userId,
            shardTypeName: context.shardType?.name,
            shardTypeDescription: context.shardType?.description,
            schema: context.shardType?.schema,
            parentShardTypeName: context.parentShardType?.name,
            parentSchema: context.parentShardType?.schema,
            relatedShardTypes: context.relatedShardTypes?.map((st) => ({
                name: st.name,
                schema: st.schema,
            })),
            tenantConventions: context.tenantConventions,
            userPreferences: context.userPreferences,
            fieldName: context.field?.name,
            fieldDescription: context.field?.description,
            ...context.additionalContext,
        };
    }
    /**
     * Estimate token count (rough approximation)
     */
    estimateTokens(text) {
        // Rough estimate: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }
}
//# sourceMappingURL=base-handler.js.map