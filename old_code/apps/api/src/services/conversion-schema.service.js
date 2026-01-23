/**
 * Conversion Schema Service
 * Manages data transformation schemas and executes transformations
 */
export class ConversionSchemaService {
    repository;
    monitoring;
    constructor(repository, monitoring) {
        this.repository = repository;
        this.monitoring = monitoring;
    }
    // =====================
    // CRUD Operations
    // =====================
    async create(input) {
        // Validate field mappings
        this.validateFieldMappings(input.fieldMappings);
        const schema = await this.repository.create(input);
        this.monitoring.trackEvent('conversionSchema.created', {
            schemaId: schema.id,
            tenantId: schema.tenantId,
            sourceEntity: schema.source.entity,
            targetShardType: schema.target.shardTypeId,
            fieldMappingsCount: schema.fieldMappings.length,
        });
        return schema;
    }
    async update(id, tenantId, input) {
        if (input.fieldMappings) {
            this.validateFieldMappings(input.fieldMappings);
        }
        const schema = await this.repository.update(id, tenantId, input);
        if (schema) {
            this.monitoring.trackEvent('conversionSchema.updated', {
                schemaId: schema.id,
                tenantId: schema.tenantId,
            });
        }
        return schema;
    }
    async delete(id, tenantId) {
        const deleted = await this.repository.delete(id, tenantId);
        if (deleted) {
            this.monitoring.trackEvent('conversionSchema.deleted', {
                schemaId: id,
                tenantId,
            });
        }
        return deleted;
    }
    async findById(id, tenantId) {
        return this.repository.findById(id, tenantId);
    }
    async list(options) {
        return this.repository.list(options);
    }
    // =====================
    // Transformation Engine
    // =====================
    /**
     * Transform source data using schema
     */
    async transform(schema, sourceData, context) {
        const errors = [];
        const result = {};
        for (const mapping of schema.fieldMappings) {
            try {
                const transformResult = await this.transformField(mapping, sourceData, context);
                if (transformResult.success && transformResult.value !== undefined) {
                    result[mapping.targetField] = transformResult.value;
                }
                else if (transformResult.error) {
                    if (mapping.required) {
                        errors.push(`${mapping.targetField}: ${transformResult.error}`);
                    }
                }
            }
            catch (error) {
                if (mapping.required) {
                    errors.push(`${mapping.targetField}: ${error.message}`);
                }
            }
        }
        return {
            success: errors.length === 0,
            data: errors.length === 0 ? result : undefined,
            errors,
        };
    }
    /**
     * Transform a single field
     */
    async transformField(mapping, sourceData, context) {
        const config = mapping.config;
        try {
            let value;
            switch (config.type) {
                case 'direct':
                    value = this.getNestedValue(sourceData, config.sourceField);
                    break;
                case 'transform':
                    value = this.getNestedValue(sourceData, config.sourceField);
                    for (const transformation of config.transformations) {
                        value = this.applyTransformation(value, transformation, context);
                    }
                    break;
                case 'conditional':
                    value = this.evaluateConditional(config.conditions, config.default, sourceData, context);
                    break;
                case 'default':
                    value = this.resolveDefaultValue(config.value, context);
                    break;
                case 'composite':
                    value = this.buildComposite(config, sourceData);
                    break;
                case 'flatten':
                    value = this.getNestedValue(sourceData, `${config.sourceField}.${config.path}`);
                    break;
                case 'lookup':
                    // Lookup would require external data - placeholder for now
                    value = this.getNestedValue(sourceData, config.sourceField);
                    break;
                default:
                    return { success: false, error: `Unknown mapping type` };
            }
            // Apply validation rules if any
            if (mapping.validation && value !== undefined && value !== null) {
                const validationError = this.validateValue(value, mapping.validation);
                if (validationError) {
                    return { success: false, error: validationError };
                }
            }
            return { success: true, value };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Apply a transformation to a value
     */
    applyTransformation(value, transformation, context) {
        if (value === null || value === undefined) {
            return value;
        }
        const config = transformation.config || {};
        switch (transformation.type) {
            // String transformations
            case 'uppercase':
                return String(value).toUpperCase();
            case 'lowercase':
                return String(value).toLowerCase();
            case 'trim':
                return String(value).trim();
            case 'truncate':
                const strValue = String(value);
                const maxLength = typeof config.maxLength === 'number' && config.maxLength > 0 ? Math.min(config.maxLength, 10000) : 100; // Cap at 10KB
                return strValue.length > maxLength ? strValue.substring(0, maxLength) : strValue;
            case 'replace':
                try {
                    return String(value).replace(new RegExp(config.search || '', 'g'), config.replace || '');
                }
                catch (error) {
                    // Invalid regex pattern - return original value
                    if (context.monitoring) {
                        context.monitoring.trackException(error, {
                            operation: 'conversion-schema.replace',
                            search: config.search,
                        });
                    }
                    return value;
                }
            case 'regex_replace':
                try {
                    return String(value).replace(new RegExp(config.pattern || '', config.flags || 'g'), config.replace || '');
                }
                catch (error) {
                    // Invalid regex pattern - return original value
                    if (context.monitoring) {
                        context.monitoring.trackException(error, {
                            operation: 'conversion-schema.regex_replace',
                            pattern: config.pattern,
                        });
                    }
                    return value;
                }
            case 'split':
                const parts = String(value).split(config.separator || ',');
                if (config.index !== undefined) {
                    // Validate index is within bounds
                    const index = config.index;
                    if (index >= 0 && index < parts.length) {
                        return parts[index];
                    }
                    // Return undefined if index is out of bounds
                    return undefined;
                }
                return parts;
            case 'concat':
                return `${config.prefix || ''}${value}${config.suffix || ''}`;
            // Number transformations
            case 'round': {
                const numValue = Number(value);
                if (!isFinite(numValue)) {
                    return value; // Return original if not a valid number
                }
                const decimals = Math.max(0, Math.min(20, config.decimals || 0)); // Limit decimals to 0-20
                const multiplier = Math.pow(10, decimals);
                const result = Math.round(numValue * multiplier) / multiplier;
                return isFinite(result) ? result : value;
            }
            case 'floor': {
                const numValue = Number(value);
                if (!isFinite(numValue)) {
                    return value;
                }
                const result = Math.floor(numValue);
                return isFinite(result) ? result : value;
            }
            case 'ceil': {
                const numValue = Number(value);
                if (!isFinite(numValue)) {
                    return value;
                }
                const result = Math.ceil(numValue);
                return isFinite(result) ? result : value;
            }
            case 'multiply': {
                const numValue = Number(value);
                if (!isFinite(numValue)) {
                    return value;
                }
                const factor = typeof config.factor === 'number' && isFinite(config.factor) ? config.factor : 1;
                const result = numValue * factor;
                return isFinite(result) ? result : value;
            }
            case 'divide': {
                const numValue = Number(value);
                if (!isFinite(numValue)) {
                    return value;
                }
                const divisor = typeof config.divisor === 'number' && isFinite(config.divisor) ? config.divisor : 1;
                if (divisor === 0 || !isFinite(divisor)) {
                    if (context.monitoring) {
                        context.monitoring.trackException(new Error('Division by zero or invalid divisor in conversion schema'), {
                            operation: 'conversion-schema.divide',
                            value,
                            divisor,
                        });
                    }
                    return value; // Return original value on division by zero
                }
                const result = numValue / divisor;
                return isFinite(result) ? result : value;
            }
            case 'add': {
                const numValue = Number(value);
                if (!isFinite(numValue)) {
                    return value;
                }
                const amount = typeof config.amount === 'number' && isFinite(config.amount) ? config.amount : 0;
                const result = numValue + amount;
                return isFinite(result) ? result : value;
            }
            case 'subtract': {
                const numValue = Number(value);
                if (!isFinite(numValue)) {
                    return value;
                }
                const amount = typeof config.amount === 'number' && isFinite(config.amount) ? config.amount : 0;
                const result = numValue - amount;
                return isFinite(result) ? result : value;
            }
            case 'abs': {
                const numValue = Number(value);
                if (!isFinite(numValue)) {
                    return value;
                }
                const result = Math.abs(numValue);
                return isFinite(result) ? result : value;
            }
            case 'currency_convert':
                // Simplified - would need actual rates
                return Number(value);
            // Date transformations
            case 'parse_date': {
                const parsedDate = new Date(value);
                if (isNaN(parsedDate.getTime())) {
                    if (context.monitoring) {
                        context.monitoring.trackException(new Error('Invalid date value in parse_date'), {
                            operation: 'conversion-schema.parse_date',
                            value,
                        });
                    }
                    return value; // Return original value if date is invalid
                }
                return parsedDate;
            }
            case 'format_date': {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    if (context.monitoring) {
                        context.monitoring.trackException(new Error('Invalid date value in format_date'), {
                            operation: 'conversion-schema.format_date',
                            value,
                        });
                    }
                    return String(value); // Return stringified value if date is invalid
                }
                return this.formatDate(date, config.format || 'YYYY-MM-DD');
            }
            case 'add_days': {
                const d1 = new Date(value);
                if (isNaN(d1.getTime())) {
                    if (context.monitoring) {
                        context.monitoring.trackException(new Error('Invalid date value in add_days'), {
                            operation: 'conversion-schema.add_days',
                            value,
                        });
                    }
                    return value; // Return original value if date is invalid
                }
                d1.setDate(d1.getDate() + (config.days || 0));
                return d1;
            }
            case 'subtract_days': {
                const d2 = new Date(value);
                if (isNaN(d2.getTime())) {
                    if (context.monitoring) {
                        context.monitoring.trackException(new Error('Invalid date value in subtract_days'), {
                            operation: 'conversion-schema.subtract_days',
                            value,
                        });
                    }
                    return value; // Return original value if date is invalid
                }
                d2.setDate(d2.getDate() - (config.days || 0));
                return d2;
            }
            case 'to_timestamp': {
                const timestampDate = new Date(value);
                if (isNaN(timestampDate.getTime())) {
                    if (context.monitoring) {
                        context.monitoring.trackException(new Error('Invalid date value in to_timestamp'), {
                            operation: 'conversion-schema.to_timestamp',
                            value,
                        });
                    }
                    return 0; // Return 0 if date is invalid
                }
                return timestampDate.getTime();
            }
            case 'to_iso_string': {
                const isoDate = new Date(value);
                if (isNaN(isoDate.getTime())) {
                    if (context.monitoring) {
                        context.monitoring.trackException(new Error('Invalid date value in to_iso_string'), {
                            operation: 'conversion-schema.to_iso_string',
                            value,
                        });
                    }
                    return String(value); // Return stringified value if date is invalid
                }
                return isoDate.toISOString();
            }
            case 'extract_year': {
                const yearDate = new Date(value);
                if (isNaN(yearDate.getTime())) {
                    if (context.monitoring) {
                        context.monitoring.trackException(new Error('Invalid date value in extract_year'), {
                            operation: 'conversion-schema.extract_year',
                            value,
                        });
                    }
                    return 0; // Return 0 if date is invalid
                }
                return yearDate.getFullYear();
            }
            case 'extract_month': {
                const monthDate = new Date(value);
                if (isNaN(monthDate.getTime())) {
                    if (context.monitoring) {
                        context.monitoring.trackException(new Error('Invalid date value in extract_month'), {
                            operation: 'conversion-schema.extract_month',
                            value,
                        });
                    }
                    return 0; // Return 0 if date is invalid
                }
                return monthDate.getMonth() + 1;
            }
            case 'extract_day': {
                const dayDate = new Date(value);
                if (isNaN(dayDate.getTime())) {
                    if (context.monitoring) {
                        context.monitoring.trackException(new Error('Invalid date value in extract_day'), {
                            operation: 'conversion-schema.extract_day',
                            value,
                        });
                    }
                    return 0; // Return 0 if date is invalid
                }
                return dayDate.getDate();
            }
            // Type conversions
            case 'to_string':
                return String(value);
            case 'to_number':
                return Number(value);
            case 'to_boolean':
                if (value === null || value === undefined) {
                    return false;
                }
                if (typeof value === 'string') {
                    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
                }
                return Boolean(value);
            case 'to_array':
                return Array.isArray(value) ? value : [value];
            case 'to_date':
                return new Date(value);
            case 'parse_json':
                if (typeof value !== 'string') {
                    return value;
                }
                try {
                    return JSON.parse(value);
                }
                catch (error) {
                    // Invalid JSON - return original value or log error
                    if (context.monitoring) {
                        context.monitoring.trackException(error, {
                            operation: 'conversion-schema.parse_json',
                            valueLength: value.length,
                        });
                    }
                    return value; // Return original string if JSON parsing fails
                }
            case 'stringify_json':
                return JSON.stringify(value);
            // Custom transformation
            case 'custom':
                if (config.expression) {
                    return this.evaluateExpression(config.expression, { value, ...context });
                }
                return value;
            default:
                return value;
        }
    }
    /**
     * Evaluate conditional rules
     */
    evaluateConditional(conditions, defaultValue, sourceData, context) {
        for (const rule of conditions) {
            const fieldValue = this.getNestedValue(sourceData, rule.condition.field);
            const matches = this.evaluateCondition(fieldValue, rule.condition.operator, rule.condition.value);
            if (matches) {
                switch (rule.then.type) {
                    case 'value':
                        return rule.then.value;
                    case 'field':
                        let result = this.getNestedValue(sourceData, rule.then.sourceField);
                        if (rule.then.transformations) {
                            for (const t of rule.then.transformations) {
                                result = this.applyTransformation(result, t, context);
                            }
                        }
                        return result;
                    case 'transform':
                        let val = this.getNestedValue(sourceData, rule.then.sourceField);
                        if (rule.then.transformations) {
                            for (const t of rule.then.transformations) {
                                val = this.applyTransformation(val, t, context);
                            }
                        }
                        return val;
                }
            }
        }
        return defaultValue;
    }
    /**
     * Evaluate a single condition
     */
    evaluateCondition(fieldValue, operator, conditionValue) {
        switch (operator) {
            case 'eq':
                return fieldValue === conditionValue;
            case 'neq':
                return fieldValue !== conditionValue;
            case 'gt':
                return fieldValue > conditionValue;
            case 'gte':
                return fieldValue >= conditionValue;
            case 'lt':
                return fieldValue < conditionValue;
            case 'lte':
                return fieldValue <= conditionValue;
            case 'contains':
                return String(fieldValue).includes(String(conditionValue));
            case 'starts_with':
                return String(fieldValue).startsWith(String(conditionValue));
            case 'ends_with':
                return String(fieldValue).endsWith(String(conditionValue));
            case 'in':
                return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
            case 'not_in':
                return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
            case 'exists':
                return fieldValue !== undefined && fieldValue !== null;
            case 'not_exists':
                return fieldValue === undefined || fieldValue === null;
            case 'is_null':
                return fieldValue === null;
            case 'is_not_null':
                return fieldValue !== null;
            case 'regex':
                try {
                    return new RegExp(String(conditionValue)).test(String(fieldValue));
                }
                catch (error) {
                    // Invalid regex pattern - return false
                    return false;
                }
            default:
                return false;
        }
    }
    /**
     * Build composite value from multiple fields
     */
    buildComposite(config, sourceData) {
        const values = config.sourceFields.map(f => this.getNestedValue(sourceData, f) ?? '');
        if (config.template) {
            let result = config.template;
            config.sourceFields.forEach((field, index) => {
                result = result.replace(`\${${field}}`, values[index]);
            });
            return result;
        }
        return values.filter(v => v !== '').join(config.separator || ' ');
    }
    /**
     * Resolve default value (supports template variables)
     */
    resolveDefaultValue(value, context) {
        if (typeof value !== 'string') {
            return value;
        }
        // Replace {{task.xxx}} with task config values
        return value.replace(/\{\{task\.(\w+)\}\}/g, (match, key) => {
            return context.taskConfig?.[key] ?? match;
        });
    }
    /**
     * Test schema with sample data
     */
    async testSchema(schemaId, tenantId, sampleData) {
        const schema = await this.findById(schemaId, tenantId);
        if (!schema) {
            return {
                success: false,
                fieldResults: [],
                errors: ['Schema not found'],
            };
        }
        const context = {
            sourceData: sampleData,
            tenantId,
            integrationId: '',
        };
        const fieldResults = [];
        const errors = [];
        const transformedData = {};
        for (const mapping of schema.fieldMappings) {
            const sourceValue = this.getSourceValueForMapping(mapping, sampleData);
            const result = await this.transformField(mapping, sampleData, context);
            fieldResults.push({
                targetField: mapping.targetField,
                sourceValue,
                transformedValue: result.value,
                success: result.success,
                error: result.error,
            });
            if (result.success && result.value !== undefined) {
                transformedData[mapping.targetField] = result.value;
            }
            else if (result.error && mapping.required) {
                errors.push(`${mapping.targetField}: ${result.error}`);
            }
        }
        return {
            success: errors.length === 0,
            transformedData: errors.length === 0 ? transformedData : undefined,
            fieldResults,
            errors,
        };
    }
    // =====================
    // Helper Methods
    // =====================
    /**
     * Get nested value from object
     */
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    /**
     * Get source value for a mapping (for display purposes)
     */
    getSourceValueForMapping(mapping, sourceData) {
        const config = mapping.config;
        switch (config.type) {
            case 'direct':
            case 'transform':
                return this.getNestedValue(sourceData, config.sourceField);
            case 'flatten':
                return this.getNestedValue(sourceData, config.sourceField);
            case 'composite':
                return config.sourceFields.map(f => this.getNestedValue(sourceData, f));
            case 'conditional':
                return config.conditions.map(c => ({
                    field: c.condition.field,
                    value: this.getNestedValue(sourceData, c.condition.field),
                }));
            case 'default':
                return config.value;
            case 'lookup':
                return this.getNestedValue(sourceData, config.sourceField);
            default:
                return undefined;
        }
    }
    /**
     * Format date with pattern
     */
    formatDate(date, format) {
        const pad = (n) => n.toString().padStart(2, '0');
        return format
            .replace('YYYY', date.getFullYear().toString())
            .replace('MM', pad(date.getMonth() + 1))
            .replace('DD', pad(date.getDate()))
            .replace('HH', pad(date.getHours()))
            .replace('mm', pad(date.getMinutes()))
            .replace('ss', pad(date.getSeconds()));
    }
    /**
     * Evaluate custom expression
     * WARNING: Uses Function constructor - expressions should be validated and sanitized
     * In production, consider using a safe expression library like 'expr-eval' or 'mathjs'
     */
    evaluateExpression(expression, context) {
        // Validate expression is safe (no function calls, no dangerous keywords)
        if (!this.isExpressionSafe(expression)) {
            if (context.monitoring) {
                context.monitoring.trackException(new Error('Unsafe expression detected'), {
                    operation: 'conversion-schema.evaluateExpression',
                    expression: expression.substring(0, 100), // Log first 100 chars only
                });
            }
            return undefined;
        }
        try {
            // Limit expression length to prevent DoS
            if (expression.length > 1000) {
                if (context.monitoring) {
                    context.monitoring.trackException(new Error('Expression too long'), {
                        operation: 'conversion-schema.evaluateExpression',
                        length: expression.length,
                    });
                }
                return undefined;
            }
            const fn = new Function(...Object.keys(context), `return ${expression}`);
            return fn(...Object.values(context));
        }
        catch (error) {
            if (context.monitoring) {
                context.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                    operation: 'conversion-schema.evaluateExpression',
                    expression: expression.substring(0, 100),
                });
            }
            return undefined;
        }
    }
    /**
     * Validate expression is safe (basic check - not comprehensive)
     * Blocks function calls, require, import, eval, and other dangerous patterns
     */
    isExpressionSafe(expression) {
        if (!expression || typeof expression !== 'string') {
            return false;
        }
        // Block dangerous patterns
        const dangerousPatterns = [
            /require\s*\(/i,
            /import\s+/i,
            /eval\s*\(/i,
            /Function\s*\(/i,
            /new\s+Function/i,
            /\.constructor/i,
            /__proto__/i,
            /prototype/i,
            /process\./i,
            /global\./i,
            /window\./i,
            /document\./i,
            /XMLHttpRequest/i,
            /fetch\s*\(/i,
            /setTimeout\s*\(/i,
            /setInterval\s*\(/i,
        ];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(expression)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Validate value against rules
     */
    validateValue(value, rules) {
        for (const rule of rules) {
            switch (rule.type) {
                case 'required':
                    if (value === undefined || value === null || value === '') {
                        return rule.message;
                    }
                    break;
                case 'min':
                    if (Number(value) < rule.value) {
                        return rule.message;
                    }
                    break;
                case 'max':
                    if (Number(value) > rule.value) {
                        return rule.message;
                    }
                    break;
                case 'minLength':
                    if (String(value).length < rule.value) {
                        return rule.message;
                    }
                    break;
                case 'maxLength':
                    if (String(value).length > rule.value) {
                        return rule.message;
                    }
                    break;
                case 'pattern':
                    if (!new RegExp(rule.value).test(String(value))) {
                        return rule.message;
                    }
                    break;
                case 'enum':
                    if (!Array.isArray(rule.value) || !rule.value.includes(value)) {
                        return rule.message;
                    }
                    break;
            }
        }
        return null;
    }
    /**
     * Validate field mappings
     */
    validateFieldMappings(mappings) {
        const targetFields = new Set();
        for (const mapping of mappings) {
            if (targetFields.has(mapping.targetField)) {
                throw new Error(`Duplicate target field: ${mapping.targetField}`);
            }
            targetFields.add(mapping.targetField);
            // Validate config based on type
            this.validateMappingConfig(mapping);
        }
    }
    /**
     * Validate mapping config
     */
    validateMappingConfig(mapping) {
        const config = mapping.config;
        switch (config.type) {
            case 'direct':
                if (!config.sourceField) {
                    throw new Error(`Direct mapping for ${mapping.targetField} requires sourceField`);
                }
                break;
            case 'transform':
                if (!config.sourceField || !config.transformations?.length) {
                    throw new Error(`Transform mapping for ${mapping.targetField} requires sourceField and transformations`);
                }
                break;
            case 'conditional':
                if (!config.conditions?.length) {
                    throw new Error(`Conditional mapping for ${mapping.targetField} requires conditions`);
                }
                break;
            case 'composite':
                if (!config.sourceFields?.length) {
                    throw new Error(`Composite mapping for ${mapping.targetField} requires sourceFields`);
                }
                break;
            case 'flatten':
                if (!config.sourceField || !config.path) {
                    throw new Error(`Flatten mapping for ${mapping.targetField} requires sourceField and path`);
                }
                break;
        }
    }
}
//# sourceMappingURL=conversion-schema.service.js.map