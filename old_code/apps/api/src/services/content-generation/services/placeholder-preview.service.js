/**
 * Placeholder Preview Service
 *
 * Generates preview/test content for individual placeholders using AI Insights
 * MANDATORY: Must use InsightService.generate() for placeholder content generation
 */
export class PlaceholderPreviewService {
    monitoring;
    insightService;
    contextTemplateService;
    templateService;
    constructor(monitoring, insightService, contextTemplateService, templateService) {
        this.monitoring = monitoring;
        this.insightService = insightService;
        this.contextTemplateService = contextTemplateService;
        this.templateService = templateService;
    }
    /**
     * Test/preview generation for a single placeholder
     * MANDATORY: Uses InsightService.generate() for AI content generation
     */
    async testPlaceholderGeneration(tenantId, userId, request) {
        const startTime = Date.now();
        try {
            // 1. Get template and placeholder configuration
            const template = await this.templateService.getTemplate(request.templateId, tenantId);
            if (!template) {
                throw new Error('Template not found');
            }
            const placeholder = template.placeholders.find(p => p.name === request.placeholderName);
            if (!placeholder) {
                throw new Error(`Placeholder ${request.placeholderName} not found`);
            }
            const config = template.placeholderConfigs.find(c => c.placeholderName === request.placeholderName);
            if (!config) {
                throw new Error(`Placeholder ${request.placeholderName} is not configured`);
            }
            // 2. Build prompt from configuration
            const prompt = this.buildPromptFromConfig(config, placeholder, request.context);
            // 3. Assemble context if contextTemplateId is linked
            let contextShardId;
            if (config.contextTemplateId) {
                // Use context template to gather related shards
                contextShardId = await this.assembleContextFromTemplate(tenantId, config.contextTemplateId, request.context?.projectId);
            }
            else if (request.context?.projectId) {
                // Use project ID directly if provided
                contextShardId = request.context.projectId;
            }
            // 4. Generate content using InsightService (MANDATORY)
            const insightRequest = {
                tenantId,
                userId,
                query: prompt,
                scope: contextShardId
                    ? {
                        shardId: contextShardId,
                        shardTypeId: 'project', // Default to project, could be inferred
                    }
                    : undefined,
                templateId: config.contextTemplateId, // Pass template ID so InsightService can use it for context assembly
                options: {
                    maxTokens: this.getMaxTokensForType(config.typeOverride || placeholder.type),
                    temperature: config.temperature ?? 0.7, // Use configurable temperature or default
                },
            };
            const insightResponse = await this.insightService.generate(tenantId, userId, insightRequest);
            // 5. Extract generated content
            // InsightResponse has 'content' field, not 'result'
            const generatedValue = insightResponse.content || insightResponse.result || '';
            const duration = Date.now() - startTime;
            // 6. Validate generated content against constraints
            const validation = this.validateGeneratedContent(generatedValue, config, placeholder);
            this.monitoring.trackEvent('content_generation.placeholder.preview', {
                tenantId,
                templateId: request.templateId,
                placeholderName: request.placeholderName,
                duration,
                tokensUsed: insightResponse.usage?.totalTokens || insightResponse.tokensUsed?.total || 0,
                model: insightResponse.model || 'unknown',
            });
            return {
                placeholderName: request.placeholderName,
                generatedValue,
                confidence: validation.valid ? 0.9 : 0.5, // Simple confidence scoring
                model: insightResponse.model,
                tokensUsed: insightResponse.usage?.totalTokens || insightResponse.tokensUsed?.total,
                duration,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'placeholder.preview',
                tenantId,
                templateId: request.templateId,
                placeholderName: request.placeholderName,
            });
            throw error;
        }
    }
    /**
     * Validate all placeholders in a template
     */
    async validateAllPlaceholders(templateId, tenantId) {
        try {
            const template = await this.templateService.getTemplate(templateId, tenantId);
            if (!template) {
                throw new Error('Template not found');
            }
            const errors = [];
            const warnings = [];
            // Check each placeholder
            for (const placeholder of template.placeholders) {
                const config = template.placeholderConfigs.find(c => c.placeholderName === placeholder.name);
                // Validate configuration exists
                if (!config) {
                    if (template.status === 'active') {
                        errors.push({
                            placeholderName: placeholder.name,
                            field: 'configuration',
                            message: 'Placeholder must be configured before template can be activated',
                        });
                    }
                    else {
                        warnings.push({
                            placeholderName: placeholder.name,
                            field: 'configuration',
                            message: 'Placeholder is not configured',
                            suggestion: 'Configure this placeholder before activating the template',
                        });
                    }
                    continue;
                }
                // Validate description (required)
                if (!config.description || config.description.trim().length === 0) {
                    errors.push({
                        placeholderName: placeholder.name,
                        field: 'description',
                        message: 'Description is required for AI generation',
                    });
                }
                // Validate constraints
                if (config.constraints) {
                    if (config.constraints.minLength !== undefined &&
                        config.constraints.maxLength !== undefined &&
                        config.constraints.minLength > config.constraints.maxLength) {
                        errors.push({
                            placeholderName: placeholder.name,
                            field: 'constraints',
                            message: 'minLength cannot be greater than maxLength',
                        });
                    }
                    if (config.constraints.minLength !== undefined &&
                        config.constraints.minLength < 0) {
                        errors.push({
                            placeholderName: placeholder.name,
                            field: 'constraints',
                            message: 'minLength must be non-negative',
                        });
                    }
                }
                // Validate chart configuration (if chart type)
                if (placeholder.type === 'chart' || config.typeOverride === 'chart') {
                    if (!config.chartConfig) {
                        errors.push({
                            placeholderName: placeholder.name,
                            field: 'chartConfig',
                            message: 'Chart configuration is required for chart placeholders',
                        });
                    }
                    else {
                        if (!config.chartConfig.chartType) {
                            errors.push({
                                placeholderName: placeholder.name,
                                field: 'chartConfig.chartType',
                                message: 'Chart type is required',
                            });
                        }
                    }
                }
                // Validate context template link (if provided)
                if (config.contextTemplateId) {
                    try {
                        const templateShard = await this.contextTemplateService.getTemplateById(config.contextTemplateId, tenantId);
                        if (!templateShard) {
                            warnings.push({
                                placeholderName: placeholder.name,
                                field: 'contextTemplateId',
                                message: `Context template "${config.contextTemplateId}" not found or is not a valid context template`,
                            });
                        }
                    }
                    catch (error) {
                        warnings.push({
                            placeholderName: placeholder.name,
                            field: 'contextTemplateId',
                            message: `Failed to verify context template: ${error.message}`,
                        });
                    }
                }
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'placeholder.validateAll',
                tenantId,
                templateId,
            });
            throw error;
        }
    }
    /**
     * Build prompt from placeholder configuration
     * MANDATORY: Must include description, tone, constraints
     */
    buildPromptFromConfig(config, placeholder, context) {
        const type = config.typeOverride || placeholder.type;
        const description = config.description;
        const tone = config.tone || 'neutral';
        const constraints = config.constraints;
        let prompt = `Generate ${type} content:\n\n`;
        prompt += `Description: ${description}\n`;
        prompt += `Tone: ${tone}\n`;
        // Add constraints
        if (constraints) {
            const constraintParts = [];
            if (constraints.minLength !== undefined) {
                constraintParts.push(`Minimum ${constraints.minLength} characters`);
            }
            if (constraints.maxLength !== undefined) {
                constraintParts.push(`Maximum ${constraints.maxLength} characters`);
            }
            if (constraints.pattern) {
                constraintParts.push(`Must match pattern: ${constraints.pattern}`);
            }
            if (constraintParts.length > 0) {
                prompt += `Constraints: ${constraintParts.join(', ')}\n`;
            }
        }
        // Add context if provided
        if (context && Object.keys(context).length > 0) {
            prompt += `\nContext:\n${JSON.stringify(context, null, 2)}\n`;
        }
        prompt += `\nOutput only the generated content, no explanations or markdown formatting.`;
        return prompt;
    }
    /**
     * Assemble context from context template
     * Uses ContextTemplateService to traverse relationships
     * Returns the shardId to use for scoping the generation
     */
    async assembleContextFromTemplate(tenantId, contextTemplateId, projectId) {
        try {
            // If no projectId is provided, we can't assemble context
            // ContextTemplateService requires a shardId to start from
            if (!projectId) {
                this.monitoring.trackEvent('content_generation.context_assembly.skipped', {
                    contextTemplateId,
                    reason: 'no_project_id',
                });
                return undefined;
            }
            // Verify context template exists
            const templateShard = await this.contextTemplateService.getTemplateById(contextTemplateId, tenantId);
            if (!templateShard) {
                this.monitoring.trackEvent('content_generation.context_assembly.failed', {
                    contextTemplateId,
                    projectId,
                    error: 'context_template_not_found',
                });
                // Fallback to using projectId directly
                return projectId;
            }
            // Use projectId as the shardId (projects are shards with type c_project)
            // Assemble context using ContextTemplateService
            const contextResult = await this.contextTemplateService.assembleContext(projectId, tenantId, {
                templateId: contextTemplateId,
            });
            if (!contextResult.success) {
                this.monitoring.trackEvent('content_generation.context_assembly.failed', {
                    contextTemplateId,
                    projectId,
                    error: contextResult.error,
                });
                // Fallback to using projectId directly
                return projectId;
            }
            // Context assembly successful - return the projectId as shardId
            // The assembled context will be used by InsightService when we pass it in scope
            this.monitoring.trackEvent('content_generation.context_assembly.success', {
                contextTemplateId,
                projectId,
                shardsIncluded: contextResult.context?.metadata?.totalShards || 0,
            });
            return projectId;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'placeholder.assembleContext',
                tenantId,
                contextTemplateId,
            });
            // Fallback to using projectId if available
            return projectId;
        }
    }
    /**
     * Get max tokens for placeholder type
     */
    getMaxTokensForType(type) {
        switch (type) {
            case 'text':
                return 500;
            case 'number':
                return 50;
            case 'email':
                return 100;
            case 'domain':
                return 100;
            case 'list':
                return 1000;
            case 'chart':
                return 200; // Chart data description
            case 'image':
                return 100; // Image description
            default:
                return 500;
        }
    }
    /**
     * Validate generated content against constraints
     */
    validateGeneratedContent(content, config, _placeholder) {
        const errors = [];
        const constraints = config.constraints;
        if (constraints) {
            // Check min length
            if (constraints.minLength !== undefined && content.length < constraints.minLength) {
                errors.push(`Content length (${content.length}) is less than minimum (${constraints.minLength})`);
            }
            // Check max length
            if (constraints.maxLength !== undefined && content.length > constraints.maxLength) {
                errors.push(`Content length (${content.length}) exceeds maximum (${constraints.maxLength})`);
            }
            // Check pattern
            if (constraints.pattern) {
                const regex = new RegExp(constraints.pattern);
                if (!regex.test(content)) {
                    errors.push(`Content does not match required pattern: ${constraints.pattern}`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
//# sourceMappingURL=placeholder-preview.service.js.map