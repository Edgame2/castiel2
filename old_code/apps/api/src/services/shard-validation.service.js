/**
 * Shard Validation Service
 *
 * Integrates field validation with shard operations.
 * Validates shard structured data against ShardType schemas.
 */
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { FieldValidationService, } from './field-validation.service.js';
import { OptionListService } from './option-list.service.js';
import { OptionListRepository } from '../repositories/option-list.repository.js';
import { isRichSchema, isJSONSchema, isLegacySchema, } from '../types/shard-type.types.js';
// @ts-ignore - ajv and ajv-formats need to be installed: npm install ajv ajv-formats
import Ajv from 'ajv';
// @ts-ignore
import addFormats from 'ajv-formats';
/**
 * Shard Validation Service
 */
export class ShardValidationService {
    shardTypeRepository;
    fieldValidationService;
    optionListService;
    monitoring;
    ajv;
    schemaCache = new Map();
    shardTypeCache = new Map();
    CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    constructor(monitoring) {
        this.monitoring = monitoring;
        // Initialize repositories
        this.shardTypeRepository = new ShardTypeRepository(monitoring);
        const optionListRepository = new OptionListRepository(monitoring);
        // Initialize services
        this.optionListService = new OptionListService(optionListRepository, monitoring);
        this.fieldValidationService = new FieldValidationService(this.optionListService);
        // Initialize AJV for JSON Schema validation
        this.ajv = new Ajv({
            allErrors: true,
            verbose: true,
            coerceTypes: false,
            useDefaults: true,
        });
        addFormats(this.ajv);
    }
    /**
     * Initialize the service
     */
    async initialize() {
        await this.shardTypeRepository.ensureContainer();
        await this.optionListService.initialize();
    }
    /**
     * Validate shard structured data
     */
    async validateShardData(structuredData, shardTypeId, tenantId, options = {}) {
        const startTime = Date.now();
        const mode = options.mode || 'strict';
        if (mode === 'skip') {
            return { valid: true, errors: [] };
        }
        try {
            // Get ShardType
            const shardType = await this.getShardType(shardTypeId, tenantId);
            if (!shardType) {
                return {
                    valid: false,
                    errors: [{
                            field: 'shardTypeId',
                            message: `ShardType not found: ${shardTypeId}`,
                            code: 'SHARD_TYPE_NOT_FOUND',
                        }],
                };
            }
            // Determine schema format and validate accordingly
            const schema = shardType.schema;
            if (isRichSchema(schema)) {
                // Use new rich field validation
                const context = {
                    tenantId,
                    shardTypeId,
                    allData: structuredData,
                    userRoles: options.userRoles,
                    isCreate: options.isCreate,
                };
                const result = await this.fieldValidationService.validateRichSchema(structuredData, schema, context);
                this.trackValidation(shardTypeId, 'rich', result.valid, Date.now() - startTime);
                return result;
            }
            else if (isJSONSchema(schema)) {
                // Use JSON Schema validation
                const result = this.validateWithJSONSchema(structuredData, schema, shardType);
                this.trackValidation(shardTypeId, 'jsonschema', result.valid, Date.now() - startTime);
                return result;
            }
            else if (isLegacySchema(schema)) {
                // Use legacy FieldDefinition validation
                const result = this.validateWithLegacySchema(structuredData, schema, options);
                this.trackValidation(shardTypeId, 'legacy', result.valid, Date.now() - startTime);
                return result;
            }
            // Unknown schema format
            return {
                valid: mode === 'lenient',
                errors: mode === 'lenient' ? [] : [{
                        field: '_schema',
                        message: 'Unknown schema format',
                        code: 'UNKNOWN_SCHEMA_FORMAT',
                    }],
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                service: 'ShardValidationService',
                operation: 'validateShardData',
                shardTypeId,
                tenantId,
            });
            return {
                valid: false,
                errors: [{
                        field: '_error',
                        message: `Validation error: ${error.message}`,
                        code: 'VALIDATION_ERROR',
                    }],
            };
        }
    }
    /**
     * Validate with JSON Schema
     */
    validateWithJSONSchema(data, schema, shardType) {
        const cacheKey = `${shardType.id}:${shardType.version}`;
        let validate = this.schemaCache.get(cacheKey);
        if (!validate) {
            try {
                validate = this.ajv.compile(schema);
                this.schemaCache.set(cacheKey, validate);
            }
            catch (error) {
                return {
                    valid: false,
                    errors: [{
                            field: '_schema',
                            message: `Invalid JSON Schema: ${error.message}`,
                            code: 'INVALID_SCHEMA',
                        }],
                };
            }
        }
        const valid = validate(data);
        if (!valid && validate.errors) {
            const errors = validate.errors.map((err) => ({
                field: err.instancePath.replace(/^\//, '').replace(/\//g, '.') || err.params?.missingProperty || '_root',
                message: err.message || 'Validation failed',
                code: err.keyword?.toUpperCase() || 'VALIDATION_FAILED',
                value: err.data,
                constraint: err.params,
            }));
            return { valid: false, errors };
        }
        return { valid: true, errors: [] };
    }
    /**
     * Validate with legacy FieldDefinition schema
     */
    validateWithLegacySchema(data, schema, options) {
        const errors = [];
        const fields = schema.fields || {};
        for (const [fieldName, fieldDef] of Object.entries(fields)) {
            const value = data[fieldName];
            // Check required
            if (fieldDef.required && !options.skip?.required) {
                if (value === undefined || value === null || value === '') {
                    errors.push({
                        field: fieldName,
                        message: `${fieldDef.label || fieldName} is required`,
                        code: 'REQUIRED',
                    });
                    continue;
                }
            }
            // Skip validation for empty optional fields
            if (value === undefined || value === null) {
                continue;
            }
            // Basic type validation
            const typeError = this.validateLegacyFieldType(fieldName, fieldDef, value);
            if (typeError) {
                errors.push(typeError);
                continue;
            }
            // Constraint validation
            const constraintErrors = this.validateLegacyConstraints(fieldName, fieldDef, value);
            errors.push(...constraintErrors);
        }
        return { valid: errors.length === 0, errors };
    }
    /**
     * Validate legacy field type
     */
    validateLegacyFieldType(fieldName, fieldDef, value) {
        const type = fieldDef.type;
        const label = fieldDef.label || fieldName;
        switch (type) {
            case 'string':
            case 'email':
            case 'phone':
            case 'url':
            case 'rich_text':
                if (typeof value !== 'string') {
                    return {
                        field: fieldName,
                        message: `${label} must be a string`,
                        code: 'INVALID_TYPE',
                        value,
                    };
                }
                break;
            case 'number':
            case 'currency':
            case 'percentage':
                if (typeof value !== 'number') {
                    return {
                        field: fieldName,
                        message: `${label} must be a number`,
                        code: 'INVALID_TYPE',
                        value,
                    };
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    return {
                        field: fieldName,
                        message: `${label} must be a boolean`,
                        code: 'INVALID_TYPE',
                        value,
                    };
                }
                break;
            case 'date':
            case 'datetime':
                if (typeof value !== 'string' || isNaN(Date.parse(value))) {
                    return {
                        field: fieldName,
                        message: `${label} must be a valid date`,
                        code: 'INVALID_DATE',
                        value,
                    };
                }
                break;
            case 'array':
            case 'references':
                if (!Array.isArray(value)) {
                    return {
                        field: fieldName,
                        message: `${label} must be an array`,
                        code: 'INVALID_TYPE',
                        value,
                    };
                }
                break;
            case 'object':
                if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                    return {
                        field: fieldName,
                        message: `${label} must be an object`,
                        code: 'INVALID_TYPE',
                        value,
                    };
                }
                break;
        }
        return null;
    }
    /**
     * Validate legacy field constraints
     */
    validateLegacyConstraints(fieldName, fieldDef, value) {
        const errors = [];
        const label = fieldDef.label || fieldName;
        // String constraints
        if (typeof value === 'string') {
            if (fieldDef.minLength !== undefined && value.length < fieldDef.minLength) {
                errors.push({
                    field: fieldName,
                    message: `${label} must be at least ${fieldDef.minLength} characters`,
                    code: 'MIN_LENGTH',
                    value: value.length,
                    constraint: fieldDef.minLength,
                });
            }
            if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
                errors.push({
                    field: fieldName,
                    message: `${label} must be at most ${fieldDef.maxLength} characters`,
                    code: 'MAX_LENGTH',
                    value: value.length,
                    constraint: fieldDef.maxLength,
                });
            }
            if (fieldDef.pattern) {
                const regex = new RegExp(fieldDef.pattern);
                if (!regex.test(value)) {
                    errors.push({
                        field: fieldName,
                        message: `${label} format is invalid`,
                        code: 'PATTERN',
                        value,
                        constraint: fieldDef.pattern,
                    });
                }
            }
            // Email validation
            if (fieldDef.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    errors.push({
                        field: fieldName,
                        message: `${label} must be a valid email address`,
                        code: 'INVALID_EMAIL',
                        value,
                    });
                }
            }
            // URL validation
            if (fieldDef.type === 'url') {
                try {
                    new URL(value);
                }
                catch {
                    errors.push({
                        field: fieldName,
                        message: `${label} must be a valid URL`,
                        code: 'INVALID_URL',
                        value,
                    });
                }
            }
        }
        // Number constraints
        if (typeof value === 'number') {
            if (fieldDef.min !== undefined && value < fieldDef.min) {
                errors.push({
                    field: fieldName,
                    message: `${label} must be at least ${fieldDef.min}`,
                    code: 'MIN_VALUE',
                    value,
                    constraint: fieldDef.min,
                });
            }
            if (fieldDef.max !== undefined && value > fieldDef.max) {
                errors.push({
                    field: fieldName,
                    message: `${label} must be at most ${fieldDef.max}`,
                    code: 'MAX_VALUE',
                    value,
                    constraint: fieldDef.max,
                });
            }
        }
        // Enum/options validation
        if (fieldDef.options && Array.isArray(fieldDef.options)) {
            const validValues = fieldDef.options.map((opt) => typeof opt === 'string' ? opt : opt.value);
            const checkValues = Array.isArray(value) ? value : [value];
            for (const v of checkValues) {
                if (!validValues.includes(v)) {
                    errors.push({
                        field: fieldName,
                        message: `${label} has an invalid value: ${v}`,
                        code: 'INVALID_OPTION',
                        value: v,
                        constraint: validValues,
                    });
                }
            }
        }
        return errors;
    }
    /**
     * Get ShardType with caching
     */
    async getShardType(id, tenantId) {
        const cacheKey = `${tenantId}:${id}`;
        const cached = this.shardTypeCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.shardType;
        }
        // Try tenant-specific first, then global
        let shardType = await this.shardTypeRepository.findById(id, tenantId);
        if (!shardType) {
            shardType = await this.shardTypeRepository.findById(id, 'system');
        }
        if (shardType) {
            this.shardTypeCache.set(cacheKey, {
                shardType,
                expiresAt: Date.now() + this.CACHE_TTL_MS,
            });
        }
        return shardType;
    }
    /**
     * Track validation metrics
     */
    trackValidation(shardTypeId, schemaFormat, valid, durationMs) {
        this.monitoring.trackMetric('shard.validation', 1, {
            shardTypeId,
            schemaFormat,
            valid,
            durationMs,
        });
    }
    /**
     * Clear caches
     */
    clearCaches() {
        this.schemaCache.clear();
        this.shardTypeCache.clear();
        this.optionListService.clearCache();
    }
    /**
     * Get the underlying FieldValidationService
     */
    getFieldValidationService() {
        return this.fieldValidationService;
    }
    /**
     * Get the underlying OptionListService
     */
    getOptionListService() {
        return this.optionListService;
    }
}
// Export singleton factory
let instance = null;
export function getShardValidationService(monitoring) {
    if (!instance) {
        instance = new ShardValidationService(monitoring);
    }
    return instance;
}
//# sourceMappingURL=shard-validation.service.js.map