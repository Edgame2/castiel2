import { BaseRecommendationHandler } from './base-handler.js';
/**
 * Handler for embedding template recommendations
 * Suggests field weights, preprocessing options, and model configurations
 */
export class EmbeddingTemplateRecommendationHandler extends BaseRecommendationHandler {
    type = 'embeddingTemplate';
    /**
     * Validate embedding template recommendation
     */
    async validate(recommendation) {
        const errors = [];
        // 1. Check required fields
        if (!recommendation.name || typeof recommendation.name !== 'string') {
            errors.push('Template name is required');
        }
        if (!recommendation.fields || recommendation.fields.length === 0) {
            errors.push('Template must have at least one field');
        }
        // 2. Validate each field
        for (const field of recommendation.fields || []) {
            if (!field.name) {
                errors.push('Field name is required');
            }
            // Validate weight (should be 0-100 or 0-1)
            if (field.weight === undefined || field.weight === null) {
                errors.push(`Field ${field.name} missing weight`);
            }
            else if (field.weight < 0 || field.weight > 100) {
                errors.push(`Field ${field.name} weight must be between 0 and 100 (got ${field.weight})`);
            }
            if (field.include === undefined) {
                errors.push(`Field ${field.name} missing include flag`);
            }
        }
        // 3. Validate preprocessing if present
        if (recommendation.preprocessing?.chunking) {
            const chunking = recommendation.preprocessing.chunking;
            if (chunking.enabled) {
                if (chunking.size && (chunking.size < 100 || chunking.size > 10000)) {
                    errors.push('Chunking size must be between 100 and 10000');
                }
                if (chunking.overlap && (chunking.overlap < 0 || chunking.overlap > 500)) {
                    errors.push('Chunking overlap must be between 0 and 500');
                }
            }
        }
        // 4. Validate model config
        if (recommendation.modelConfig?.strategy) {
            const validStrategies = ['default', 'fast', 'quality', 'custom'];
            if (!validStrategies.includes(recommendation.modelConfig.strategy)) {
                errors.push(`Invalid model strategy: ${recommendation.modelConfig.strategy}`);
            }
        }
        // 5. Validate parent context
        if (recommendation.parentContext) {
            const validModes = ['prepend', 'append', 'none'];
            if (!validModes.includes(recommendation.parentContext.mode)) {
                errors.push(`Invalid parent context mode: ${recommendation.parentContext.mode}`);
            }
            if (recommendation.parentContext.weight < 0 || recommendation.parentContext.weight > 100) {
                errors.push(`Parent context weight must be between 0 and 100`);
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    /**
     * Embedding templates are medium risk
     */
    shouldAutoApply(_option, _context) {
        // Embedding templates should be reviewed, not auto-applied
        return false;
    }
    /**
     * No next action for embedding templates
     */
    async suggestNextAction() {
        return null;
    }
    /**
     * Parse AI response into embedding template recommendations
     */
    parseAIResponse(response) {
        try {
            const parsed = JSON.parse(response);
            // Handle different formats
            if (Array.isArray(parsed)) {
                return parsed.map((item, index) => this.normalizeOption(item, index));
            }
            else if (parsed.options && Array.isArray(parsed.options)) {
                return parsed.options.map((item, index) => this.normalizeOption(item, index));
            }
            else {
                return [this.normalizeOption(parsed, 0)];
            }
        }
        catch (error) {
            // Try markdown code block extraction
            const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[1]);
                    return [this.normalizeOption(parsed, 0)];
                }
                catch (e) {
                    // Fall through
                }
            }
            this.monitoring.trackEvent('aiRecommendation.parseError', {
                type: this.type,
                error: error.message,
            });
            // Fallback: basic template with equal weights
            return [
                {
                    recommendation: {
                        name: 'Default Template',
                        fields: [],
                        preprocessing: {
                            chunking: { enabled: false },
                            normalization: {
                                lowercase: true,
                                removeSpecialChars: false,
                                removeStopWords: false,
                            },
                        },
                        modelConfig: {
                            strategy: 'default',
                        },
                        parentContext: {
                            mode: 'none',
                            weight: 0,
                        },
                    },
                    confidence: 0.1,
                    reasoning: 'Failed to parse AI response, using default template',
                    riskLevel: 'low',
                },
            ];
        }
    }
    /**
     * Normalize option to standard format
     */
    normalizeOption(item, index) {
        let recommendation;
        if (item.recommendation) {
            recommendation = item.recommendation;
        }
        else if (item.fields) {
            recommendation = item;
        }
        else {
            recommendation = {
                name: 'Generated Template',
                fields: [],
            };
        }
        // Ensure name
        if (!recommendation.name) {
            recommendation.name = `Template Option ${index + 1}`;
        }
        // Normalize fields
        recommendation.fields = (recommendation.fields || []).map((field) => ({
            name: field.name,
            weight: field.weight ?? 50, // Default 50%
            include: field.include ?? true,
        }));
        // Set defaults for preprocessing
        if (!recommendation.preprocessing) {
            recommendation.preprocessing = {
                chunking: { enabled: false },
                normalization: {
                    lowercase: true,
                    removeSpecialChars: false,
                    removeStopWords: false,
                },
                fieldSeparator: ' ',
            };
        }
        // Set defaults for model config
        if (!recommendation.modelConfig) {
            recommendation.modelConfig = {
                strategy: 'default',
            };
        }
        // Set defaults for parent context
        if (!recommendation.parentContext) {
            recommendation.parentContext = {
                mode: 'none',
                weight: 0,
            };
        }
        // Determine risk level
        let riskLevel = 'medium';
        if (recommendation.preprocessing?.chunking?.enabled) {
            riskLevel = 'high'; // Chunking can affect results significantly
        }
        return {
            recommendation,
            confidence: item.confidence ?? (0.9 - index * 0.1),
            reasoning: item.reasoning || `Embedding template based on field analysis`,
            riskLevel,
            editable: true,
        };
    }
    /**
     * Build prompt context with embedding-specific variables
     */
    buildPromptContext(context) {
        const base = super.buildPromptContext(context);
        // Extract field names and types from schema
        const schemaFields = context.shardType?.schema?.properties
            ? Object.entries(context.shardType.schema.properties).map(([name, def]) => ({
                name,
                type: def.type || 'unknown',
                description: def.description,
            }))
            : [];
        return {
            ...base,
            fields: schemaFields,
            fieldNames: schemaFields.map((f) => f.name),
            stringFields: schemaFields.filter((f) => f.type === 'string').map((f) => f.name),
        };
    }
}
//# sourceMappingURL=embedding-template-handler.js.map