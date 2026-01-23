import { IMonitoringProvider } from '@castiel/monitoring';
import { ConversionSchemaRepository } from '../repositories/conversion-schema.repository.js';
import { ConversionSchema, CreateConversionSchemaInput, UpdateConversionSchemaInput, ConversionSchemaListOptions, ConversionSchemaListResult, FieldMapping, Transformation, ConditionalRule, TransformationContext, TransformationResult, SchemaTestResult } from '../types/conversion-schema.types.js';
/**
 * Conversion Schema Service
 * Manages data transformation schemas and executes transformations
 */
export declare class ConversionSchemaService {
    private repository;
    private monitoring;
    constructor(repository: ConversionSchemaRepository, monitoring: IMonitoringProvider);
    create(input: CreateConversionSchemaInput): Promise<ConversionSchema>;
    update(id: string, tenantId: string, input: UpdateConversionSchemaInput): Promise<ConversionSchema | null>;
    delete(id: string, tenantId: string): Promise<boolean>;
    findById(id: string, tenantId: string): Promise<ConversionSchema | null>;
    list(options: ConversionSchemaListOptions): Promise<ConversionSchemaListResult>;
    /**
     * Transform source data using schema
     */
    transform(schema: ConversionSchema, sourceData: Record<string, any>, context: TransformationContext): Promise<{
        success: boolean;
        data?: Record<string, any>;
        errors: string[];
    }>;
    /**
     * Transform a single field
     */
    transformField(mapping: FieldMapping, sourceData: Record<string, any>, context: TransformationContext & {
        monitoring?: IMonitoringProvider;
    }): Promise<TransformationResult>;
    /**
     * Apply a transformation to a value
     */
    applyTransformation(value: any, transformation: Transformation, context: TransformationContext & {
        monitoring?: IMonitoringProvider;
    }): any;
    /**
     * Evaluate conditional rules
     */
    evaluateConditional(conditions: ConditionalRule[], defaultValue: any, sourceData: Record<string, any>, context: TransformationContext): any;
    /**
     * Evaluate a single condition
     */
    evaluateCondition(fieldValue: any, operator: string, conditionValue: any): boolean;
    /**
     * Build composite value from multiple fields
     */
    buildComposite(config: {
        sourceFields: string[];
        separator?: string;
        template?: string;
    }, sourceData: Record<string, any>): string;
    /**
     * Resolve default value (supports template variables)
     */
    resolveDefaultValue(value: any, context: TransformationContext): any;
    /**
     * Test schema with sample data
     */
    testSchema(schemaId: string, tenantId: string, sampleData: Record<string, any>): Promise<SchemaTestResult>;
    /**
     * Get nested value from object
     */
    private getNestedValue;
    /**
     * Get source value for a mapping (for display purposes)
     */
    private getSourceValueForMapping;
    /**
     * Format date with pattern
     */
    private formatDate;
    /**
     * Evaluate custom expression
     * WARNING: Uses Function constructor - expressions should be validated and sanitized
     * In production, consider using a safe expression library like 'expr-eval' or 'mathjs'
     */
    private evaluateExpression;
    /**
     * Validate expression is safe (basic check - not comprehensive)
     * Blocks function calls, require, import, eval, and other dangerous patterns
     */
    private isExpressionSafe;
    /**
     * Validate value against rules
     */
    private validateValue;
    /**
     * Validate field mappings
     */
    private validateFieldMappings;
    /**
     * Validate mapping config
     */
    private validateMappingConfig;
}
//# sourceMappingURL=conversion-schema.service.d.ts.map