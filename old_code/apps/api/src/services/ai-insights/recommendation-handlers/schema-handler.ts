// @ts-nocheck
import {
  RecommendationContext,
  RecommendationOption,
  SchemaRecommendation,
  RiskLevel,
} from '@castiel/shared-types';
import { BaseRecommendationHandler } from './base-handler.js';

/**
 * Handler for schema recommendations
 * Suggests field types, validation rules, and complete schemas
 */
export class SchemaRecommendationHandler extends BaseRecommendationHandler<SchemaRecommendation> {
  readonly type = 'schemaRecommendation' as const;

  /**
   * Enrich context with related shard types in same category
   */
  async enrichContext(context: RecommendationContext): Promise<RecommendationContext> {
    // TODO: In future, fetch related shard types from database
    // For now, pass through
    return context;
  }

  /**
   * Validate generated schema recommendation
   */
  async validate(recommendation: SchemaRecommendation): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // 1. Check that we have at least one field
    if (!recommendation.fields || recommendation.fields.length === 0) {
      errors.push('Schema must have at least one field');
    }

    // 2. Validate each field
    for (const field of recommendation.fields || []) {
      if (!field.name || typeof field.name !== 'string') {
        errors.push(`Invalid field name: ${field.name}`);
      }

      if (!field.type) {
        errors.push(`Field ${field.name} missing type`);
      }

      // Validate field name format (alphanumeric + underscore)
      if (field.name && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
        errors.push(
          `Field name "${field.name}" must start with letter and contain only alphanumeric characters and underscores`
        );
      }

      // Validate regex patterns
      if (field.validation?.pattern) {
        try {
          new RegExp(field.validation.pattern);
        } catch (e) {
          errors.push(`Invalid regex pattern for field ${field.name}: ${field.validation.pattern}`);
        }
      }

      // Validate min/max
      if (
        field.validation?.min !== undefined &&
        field.validation?.max !== undefined &&
        field.validation.min > field.validation.max
      ) {
        errors.push(`Field ${field.name}: min (${field.validation.min}) cannot be greater than max (${field.validation.max})`);
      }
    }

    // 3. Check for duplicate field names
    const fieldNames = new Set<string>();
    for (const field of recommendation.fields || []) {
      if (fieldNames.has(field.name)) {
        errors.push(`Duplicate field name: ${field.name}`);
      }
      fieldNames.add(field.name);
    }

    // 4. Validate suggested relationships
    for (const relationship of recommendation.suggestedRelationships || []) {
      if (!relationship.targetShardType || !relationship.fieldName || !relationship.relationship) {
        errors.push('Invalid relationship suggestion: missing required fields');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Determine risk level based on schema complexity
   */
  shouldAutoApply(_option: RecommendationOption<SchemaRecommendation>, _context: RecommendationContext): boolean {
    // Schema recommendations are medium-to-high risk, never auto-apply
    return false;
  }

  /**
   * Suggest embedding template after schema is applied
   */
  async suggestNextAction(
    appliedRecommendation: SchemaRecommendation,
    context: RecommendationContext
  ): Promise<{ type: any; context: Partial<RecommendationContext>; message: string } | null> {
    // Only suggest if schema has at least 2 string fields (good for embeddings)
    const stringFields = appliedRecommendation.fields.filter((f) => f.type === 'string');

    if (stringFields.length >= 2) {
      return {
        type: 'embeddingTemplate' as any,
        context: {
          shardType: context.shardType,
        },
        message: 'Generate an embedding template for better semantic search?',
      };
    }

    return null;
  }

  /**
   * Parse AI response into schema recommendations
   */
  protected parseAIResponse(response: string): RecommendationOption<SchemaRecommendation>[] {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response);

      // Handle different response formats
      if (Array.isArray(parsed)) {
        // Array of options
        return parsed.map((item, index) => this.normalizeOption(item, index));
      } else if (parsed.options && Array.isArray(parsed.options)) {
        // Structured format with options array
        return parsed.options.map((item: any, index: number) => this.normalizeOption(item, index));
      } else {
        // Single option
        return [this.normalizeOption(parsed, 0)];
      }
    } catch (error) {
      // Fallback: try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return [this.normalizeOption(parsed, 0)];
        } catch (e) {
          // Fall through to error
        }
      }

      this.monitoring.trackEvent('aiRecommendation.parseError', {
        type: this.type,
        error: (error as Error).message,
        response: response.substring(0, 200),
      });

      // Return fallback empty schema
      return [
        {
          recommendation: {
            fields: [],
          },
          confidence: 0.1,
          reasoning: 'Failed to parse AI response',
          riskLevel: 'high',
        },
      ];
    }
  }

  /**
   * Normalize a single option into standard format
   */
  private normalizeOption(item: any, index: number): RecommendationOption<SchemaRecommendation> {
    // Extract the actual recommendation
    let recommendation: SchemaRecommendation;

    if (item.recommendation) {
      recommendation = item.recommendation;
    } else if (item.fields) {
      recommendation = item;
    } else {
      // Assume the entire item is the schema
      recommendation = { fields: [] };
    }

    // Ensure fields array exists and normalize each field
    recommendation.fields = (recommendation.fields || []).map((field: any) => ({
      name: field.name,
      type: field.type || 'string',
      required: field.required ?? false,
      description: field.description,
      validation: field.validation,
      defaultValue: field.defaultValue,
      items: field.items,
      properties: field.properties,
    }));

    // Calculate risk level based on number of fields and complexity
    let riskLevel: RiskLevel = 'medium';
    if (recommendation.fields.length > 10) {
      riskLevel = 'high';
    } else if (recommendation.fields.length <= 3) {
      riskLevel = 'medium';
    }

    // Check for complex validations
    const hasComplexValidations = recommendation.fields.some(
      (f) => f.validation?.pattern || f.type === 'array' || f.type === 'object'
    );
    if (hasComplexValidations) {
      riskLevel = 'high';
    }

    return {
      recommendation,
      confidence: item.confidence ?? (1 - index * 0.1), // Descending confidence
      reasoning: item.reasoning || `Schema suggestion ${index + 1}`,
      riskLevel,
      editable: true,
    };
  }

  /**
   * Build prompt context with schema-specific variables
   */
  protected buildPromptContext(context: RecommendationContext): Record<string, any> {
    const base = super.buildPromptContext(context);

    return {
      ...base,
      // Add schema-specific context
      existingFieldsCount: context.shardType?.schema?.properties
        ? Object.keys(context.shardType.schema.properties).length
        : 0,
      category: context.shardType?.category,
      hasParent: !!context.parentShardType,
      relatedSchemasCount: context.relatedShardTypes?.length || 0,
    };
  }
}
