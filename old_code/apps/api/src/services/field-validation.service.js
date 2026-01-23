/**
 * Field Validation Service
 *
 * Validates shard structured data against RichFieldDefinition schemas.
 * Supports all rich field types with comprehensive validation rules.
 */
import { RichFieldType as FieldType } from '@castiel/shared-types';
import { isRichSchema } from '../types/shard-type.types.js';
// ============================================================================
// Field Validation Service
// ============================================================================
export class FieldValidationService {
    optionListProvider;
    constructor(optionListProvider) {
        this.optionListProvider = optionListProvider;
    }
    /**
     * Set the option list provider for resolving option references
     */
    setOptionListProvider(provider) {
        this.optionListProvider = provider;
    }
    /**
     * Validate data against a rich schema
     */
    async validateSchema(data, schema, context) {
        if (!isRichSchema(schema)) {
            // For non-rich schemas, return valid (use JSON Schema validation elsewhere)
            return { valid: true, errors: [] };
        }
        return this.validateRichSchema(data, schema, context);
    }
    /**
     * Validate data against a rich schema definition
     */
    async validateRichSchema(data, schema, context) {
        const errors = [];
        // Validate each field definition
        for (const fieldDef of schema.fields) {
            // Skip system fields and check write permissions
            if (fieldDef.system) {
                continue;
            }
            if (fieldDef.writeRoles && context.userRoles) {
                const hasWriteAccess = fieldDef.writeRoles.some(role => context.userRoles.includes(role));
                if (!hasWriteAccess) {
                    continue;
                }
            }
            // Check immutability on update
            if (!context.isCreate && fieldDef.immutable) {
                // Skip validation for immutable fields on update
                continue;
            }
            const value = data[fieldDef.name];
            const fieldErrors = await this.validateField(fieldDef, value, context);
            errors.push(...fieldErrors);
        }
        // Run cross-field validation rules
        for (const fieldDef of schema.fields) {
            if (fieldDef.validation) {
                const crossFieldErrors = await this.validateCrossFieldRules(fieldDef, data, context);
                errors.push(...crossFieldErrors);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Validate a single field
     */
    async validateField(fieldDef, value, context) {
        const errors = [];
        // Check required
        if (fieldDef.required && this.isEmpty(value)) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} is required`,
                code: 'REQUIRED',
            });
            return errors; // Skip other validations if required field is empty
        }
        // Skip validation for empty optional fields
        if (this.isEmpty(value)) {
            return errors;
        }
        // Type-specific validation
        switch (fieldDef.type) {
            case FieldType.TEXT:
                errors.push(...this.validateTextField(fieldDef, value));
                break;
            case FieldType.TEXTAREA:
                errors.push(...this.validateTextareaField(fieldDef, value));
                break;
            case FieldType.RICHTEXT:
                errors.push(...this.validateRichTextField(fieldDef, value));
                break;
            case FieldType.SELECT:
                errors.push(...await this.validateSelectField(fieldDef, value, context));
                break;
            case FieldType.MULTISELECT:
                errors.push(...await this.validateMultiselectField(fieldDef, value, context));
                break;
            case FieldType.DATE:
                errors.push(...this.validateDateField(fieldDef, value));
                break;
            case FieldType.DATETIME:
                errors.push(...this.validateDateTimeField(fieldDef, value));
                break;
            case FieldType.DATERANGE:
                errors.push(...this.validateDateRangeField(fieldDef, value));
                break;
            case FieldType.INTEGER:
                errors.push(...this.validateIntegerField(fieldDef, value));
                break;
            case FieldType.FLOAT:
                errors.push(...this.validateFloatField(fieldDef, value));
                break;
            case FieldType.CURRENCY:
                errors.push(...this.validateCurrencyField(fieldDef, value));
                break;
            case FieldType.PERCENTAGE:
                errors.push(...this.validatePercentageField(fieldDef, value));
                break;
            case FieldType.BOOLEAN:
                errors.push(...this.validateBooleanField(fieldDef, value));
                break;
            case FieldType.EMAIL:
                errors.push(...this.validateEmailField(fieldDef, value));
                break;
            case FieldType.URL:
                errors.push(...this.validateUrlField(fieldDef, value));
                break;
            case FieldType.PHONE:
                errors.push(...this.validatePhoneField(fieldDef, value));
                break;
            case FieldType.USER:
                errors.push(...this.validateUserRefField(fieldDef, value));
                break;
            case FieldType.SHARD:
                errors.push(...this.validateShardRefField(fieldDef, value));
                break;
            case FieldType.FILE:
                errors.push(...this.validateFileField(fieldDef, value));
                break;
            case FieldType.IMAGE:
                errors.push(...this.validateImageField(fieldDef, value));
                break;
            default:
                // Unknown field type, skip validation
                break;
        }
        return errors;
    }
    // ============================================================================
    // Text Field Validators
    // ============================================================================
    validateTextField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'string') {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a string`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        if (config.minLength !== undefined && value.length < config.minLength) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at least ${config.minLength} characters`,
                code: 'MIN_LENGTH',
                value: value.length,
                constraint: config.minLength,
            });
        }
        if (config.maxLength !== undefined && value.length > config.maxLength) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at most ${config.maxLength} characters`,
                code: 'MAX_LENGTH',
                value: value.length,
                constraint: config.maxLength,
            });
        }
        if (config.pattern) {
            try {
                const regex = new RegExp(config.pattern);
                if (!regex.test(value)) {
                    errors.push({
                        field: fieldDef.name,
                        message: config.patternMessage || `${fieldDef.label} format is invalid`,
                        code: 'PATTERN',
                        value,
                        constraint: config.pattern,
                    });
                }
            }
            catch (regexError) {
                // Invalid regex pattern - log error but don't fail validation
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} has an invalid validation pattern`,
                    code: 'INVALID_PATTERN',
                    value,
                    constraint: config.pattern,
                });
            }
        }
        return errors;
    }
    validateTextareaField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'string') {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a string`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        if (config.minLength !== undefined && value.length < config.minLength) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at least ${config.minLength} characters`,
                code: 'MIN_LENGTH',
                value: value.length,
                constraint: config.minLength,
            });
        }
        if (config.maxLength !== undefined && value.length > config.maxLength) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at most ${config.maxLength} characters`,
                code: 'MAX_LENGTH',
                value: value.length,
                constraint: config.maxLength,
            });
        }
        return errors;
    }
    validateRichTextField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'string') {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a string`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        // Check byte size
        const byteSize = Buffer.byteLength(value, 'utf8');
        const maxSize = config.maxSize || 102400; // Default 100KB
        if (byteSize > maxSize) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} exceeds maximum size of ${Math.round(maxSize / 1024)}KB`,
                code: 'MAX_SIZE',
                value: byteSize,
                constraint: maxSize,
            });
        }
        return errors;
    }
    // ============================================================================
    // Selection Field Validators
    // ============================================================================
    async validateSelectField(fieldDef, value, context) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'string') {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a string`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        // Get valid options
        const options = await this.getOptions(config, context.tenantId);
        const validValues = options.map(opt => opt.value);
        if (!validValues.includes(value)) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} has an invalid value`,
                code: 'INVALID_OPTION',
                value,
                constraint: validValues,
            });
        }
        return errors;
    }
    async validateMultiselectField(fieldDef, value, context) {
        const errors = [];
        const config = fieldDef.config;
        if (!Array.isArray(value)) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be an array`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        // Check min/max selection
        if (config.minSelection !== undefined && value.length < config.minSelection) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} requires at least ${config.minSelection} selection(s)`,
                code: 'MIN_SELECTION',
                value: value.length,
                constraint: config.minSelection,
            });
        }
        if (config.maxSelection !== undefined && value.length > config.maxSelection) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} allows at most ${config.maxSelection} selection(s)`,
                code: 'MAX_SELECTION',
                value: value.length,
                constraint: config.maxSelection,
            });
        }
        // Validate each value
        const options = await this.getOptions(config, context.tenantId);
        const validValues = options.map(opt => opt.value);
        for (const v of value) {
            if (typeof v !== 'string') {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} contains a non-string value`,
                    code: 'INVALID_TYPE',
                    value: v,
                });
            }
            else if (!validValues.includes(v)) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} contains an invalid option: ${v}`,
                    code: 'INVALID_OPTION',
                    value: v,
                    constraint: validValues,
                });
            }
        }
        return errors;
    }
    async getOptions(config, tenantId) {
        // If inline options are provided, use them
        if (config.options && config.options.length > 0) {
            return config.options;
        }
        // If optionsRef is provided, fetch from option list
        if (config.optionsRef && this.optionListProvider) {
            return this.optionListProvider.getOptions(config.optionsRef, tenantId);
        }
        return [];
    }
    // ============================================================================
    // Date Field Validators
    // ============================================================================
    validateDateField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        // Accept ISO date string
        if (typeof value !== 'string') {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a date string`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} is not a valid date`,
                code: 'INVALID_DATE',
                value,
            });
            return errors;
        }
        // Check min date
        if (config.minDate) {
            const minDate = this.resolveDate(config.minDate);
            if (minDate && date < minDate) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be on or after ${minDate.toISOString().split('T')[0]}`,
                    code: 'MIN_DATE',
                    value,
                    constraint: config.minDate,
                });
            }
        }
        // Check max date
        if (config.maxDate) {
            const maxDate = this.resolveDate(config.maxDate);
            if (maxDate && date > maxDate) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be on or before ${maxDate.toISOString().split('T')[0]}`,
                    code: 'MAX_DATE',
                    value,
                    constraint: config.maxDate,
                });
            }
        }
        // Check disabled days of week
        if (config.disabledDaysOfWeek && config.disabledDaysOfWeek.includes(date.getDay())) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} cannot be on this day of the week`,
                code: 'DISABLED_DAY',
                value,
                constraint: config.disabledDaysOfWeek,
            });
        }
        return errors;
    }
    validateDateTimeField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'string') {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a datetime string`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} is not a valid datetime`,
                code: 'INVALID_DATETIME',
                value,
            });
            return errors;
        }
        // Check min/max date
        if (config.minDate) {
            const minDate = this.resolveDate(config.minDate);
            if (minDate && date < minDate) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be on or after ${minDate.toISOString()}`,
                    code: 'MIN_DATE',
                    value,
                    constraint: config.minDate,
                });
            }
        }
        if (config.maxDate) {
            const maxDate = new Date(config.maxDate);
            if (!isNaN(maxDate.getTime()) && date > maxDate) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be on or before ${maxDate.toISOString()}`,
                    code: 'MAX_DATE',
                    value,
                    constraint: config.maxDate,
                });
            }
        }
        return errors;
    }
    validateDateRangeField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'object' || value === null) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be an object with start and end dates`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        const range = value;
        if (!range.start || !range.end) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} requires both start and end dates`,
                code: 'INCOMPLETE_RANGE',
                value,
            });
            return errors;
        }
        const startDate = new Date(range.start);
        const endDate = new Date(range.end);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} contains invalid dates`,
                code: 'INVALID_DATE',
                value,
            });
            return errors;
        }
        if (startDate > endDate) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} start date must be before end date`,
                code: 'INVALID_RANGE',
                value,
            });
        }
        // Check same day constraint
        if (!config.allowSameDay && startDate.toDateString() === endDate.toDateString()) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} start and end dates cannot be the same`,
                code: 'SAME_DAY_NOT_ALLOWED',
                value,
            });
        }
        // Check min/max range days
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (config.minRangeDays !== undefined && daysDiff < config.minRangeDays) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must span at least ${config.minRangeDays} days`,
                code: 'MIN_RANGE_DAYS',
                value: daysDiff,
                constraint: config.minRangeDays,
            });
        }
        if (config.maxRangeDays !== undefined && daysDiff > config.maxRangeDays) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} cannot span more than ${config.maxRangeDays} days`,
                code: 'MAX_RANGE_DAYS',
                value: daysDiff,
                constraint: config.maxRangeDays,
            });
        }
        return errors;
    }
    resolveDate(dateConfig) {
        if (dateConfig === 'today') {
            return new Date();
        }
        if (dateConfig === 'startOfMonth') {
            const d = new Date();
            return new Date(d.getFullYear(), d.getMonth(), 1);
        }
        if (dateConfig === 'endOfMonth') {
            const d = new Date();
            return new Date(d.getFullYear(), d.getMonth() + 1, 0);
        }
        if (dateConfig === 'startOfYear') {
            return new Date(new Date().getFullYear(), 0, 1);
        }
        if (dateConfig === 'endOfYear') {
            return new Date(new Date().getFullYear(), 11, 31);
        }
        const parsed = new Date(dateConfig);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    // ============================================================================
    // Number Field Validators
    // ============================================================================
    validateIntegerField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'number' || !Number.isInteger(value)) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be an integer`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        if (config.min !== undefined && value < config.min) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at least ${config.min}`,
                code: 'MIN_VALUE',
                value,
                constraint: config.min,
            });
        }
        if (config.max !== undefined && value > config.max) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at most ${config.max}`,
                code: 'MAX_VALUE',
                value,
                constraint: config.max,
            });
        }
        return errors;
    }
    validateFloatField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'number' || isNaN(value)) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a number`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        if (config.min !== undefined && value < config.min) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at least ${config.min}`,
                code: 'MIN_VALUE',
                value,
                constraint: config.min,
            });
        }
        if (config.max !== undefined && value > config.max) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at most ${config.max}`,
                code: 'MAX_VALUE',
                value,
                constraint: config.max,
            });
        }
        // Check decimal places
        if (config.decimalPlaces !== undefined) {
            const decimalPart = value.toString().split('.')[1] || '';
            if (decimalPart.length > config.decimalPlaces) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} can have at most ${config.decimalPlaces} decimal places`,
                    code: 'DECIMAL_PLACES',
                    value,
                    constraint: config.decimalPlaces,
                });
            }
        }
        return errors;
    }
    validateCurrencyField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'number' || isNaN(value)) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a number`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        if (config.min !== undefined && value < config.min) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at least ${config.min}`,
                code: 'MIN_VALUE',
                value,
                constraint: config.min,
            });
        }
        if (config.max !== undefined && value > config.max) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at most ${config.max}`,
                code: 'MAX_VALUE',
                value,
                constraint: config.max,
            });
        }
        return errors;
    }
    validatePercentageField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'number' || isNaN(value)) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a number`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        const min = config.min ?? 0;
        const max = config.max ?? 100;
        if (value < min) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at least ${min}%`,
                code: 'MIN_VALUE',
                value,
                constraint: min,
            });
        }
        if (value > max) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be at most ${max}%`,
                code: 'MAX_VALUE',
                value,
                constraint: max,
            });
        }
        return errors;
    }
    // ============================================================================
    // Boolean Field Validator
    // ============================================================================
    validateBooleanField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        // Allow null for three-state
        if (config.allowNull && value === null) {
            return errors;
        }
        if (typeof value !== 'boolean') {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a boolean`,
                code: 'INVALID_TYPE',
                value,
            });
        }
        return errors;
    }
    // ============================================================================
    // Contact Field Validators
    // ============================================================================
    validateEmailField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'string') {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a string`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} is not a valid email address`,
                code: 'INVALID_EMAIL',
                value,
            });
            return errors;
        }
        const domain = value.split('@')[1].toLowerCase();
        // Check allowed domains
        if (config.allowedDomains && config.allowedDomains.length > 0) {
            if (!config.allowedDomains.some(d => d.toLowerCase() === domain)) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be from an allowed domain`,
                    code: 'DOMAIN_NOT_ALLOWED',
                    value,
                    constraint: config.allowedDomains,
                });
            }
        }
        // Check blocked domains
        if (config.blockedDomains && config.blockedDomains.length > 0) {
            if (config.blockedDomains.some(d => d.toLowerCase() === domain)) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} cannot be from this domain`,
                    code: 'DOMAIN_BLOCKED',
                    value,
                });
            }
        }
        return errors;
    }
    validateUrlField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'string') {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a string`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        try {
            const url = new URL(value);
            const allowedProtocols = config.allowedProtocols || ['http', 'https'];
            // Check protocol
            const protocol = url.protocol.replace(':', '');
            if (!allowedProtocols.includes(protocol)) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must use a valid protocol (${allowedProtocols.join(', ')})`,
                    code: 'INVALID_PROTOCOL',
                    value,
                    constraint: allowedProtocols,
                });
            }
            // Check allowed domains
            if (config.allowedDomains && config.allowedDomains.length > 0) {
                if (!config.allowedDomains.includes(url.hostname)) {
                    errors.push({
                        field: fieldDef.name,
                        message: `${fieldDef.label} must be from an allowed domain`,
                        code: 'DOMAIN_NOT_ALLOWED',
                        value,
                        constraint: config.allowedDomains,
                    });
                }
            }
        }
        catch {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} is not a valid URL`,
                code: 'INVALID_URL',
                value,
            });
        }
        return errors;
    }
    validatePhoneField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (typeof value !== 'string') {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must be a string`,
                code: 'INVALID_TYPE',
                value,
            });
            return errors;
        }
        // Basic phone validation (digits, spaces, dashes, parentheses, plus sign)
        const phoneRegex = /^[\d\s\-().+]+$/;
        if (!phoneRegex.test(value)) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} is not a valid phone number`,
                code: 'INVALID_PHONE',
                value,
            });
        }
        // Must have at least some digits
        const digits = value.replace(/\D/g, '');
        if (digits.length < 7) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} must have at least 7 digits`,
                code: 'PHONE_TOO_SHORT',
                value,
            });
        }
        return errors;
    }
    // ============================================================================
    // Reference Field Validators
    // ============================================================================
    validateUserRefField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (config.multiple) {
            if (!Array.isArray(value)) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be an array of user IDs`,
                    code: 'INVALID_TYPE',
                    value,
                });
                return errors;
            }
            // Check min/max selection
            if (config.minSelection !== undefined && value.length < config.minSelection) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} requires at least ${config.minSelection} user(s)`,
                    code: 'MIN_SELECTION',
                    value: value.length,
                    constraint: config.minSelection,
                });
            }
            if (config.maxSelection !== undefined && value.length > config.maxSelection) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} allows at most ${config.maxSelection} user(s)`,
                    code: 'MAX_SELECTION',
                    value: value.length,
                    constraint: config.maxSelection,
                });
            }
            // Validate each ID is a string
            for (const v of value) {
                if (typeof v !== 'string') {
                    errors.push({
                        field: fieldDef.name,
                        message: `${fieldDef.label} contains an invalid user ID`,
                        code: 'INVALID_TYPE',
                        value: v,
                    });
                }
            }
        }
        else {
            if (typeof value !== 'string' && value !== null) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be a user ID`,
                    code: 'INVALID_TYPE',
                    value,
                });
            }
        }
        return errors;
    }
    validateShardRefField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        if (config.multiple) {
            if (!Array.isArray(value)) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be an array of shard IDs`,
                    code: 'INVALID_TYPE',
                    value,
                });
                return errors;
            }
            // Check min/max selection
            if (config.minSelection !== undefined && value.length < config.minSelection) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} requires at least ${config.minSelection} selection(s)`,
                    code: 'MIN_SELECTION',
                    value: value.length,
                    constraint: config.minSelection,
                });
            }
            if (config.maxSelection !== undefined && value.length > config.maxSelection) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} allows at most ${config.maxSelection} selection(s)`,
                    code: 'MAX_SELECTION',
                    value: value.length,
                    constraint: config.maxSelection,
                });
            }
            // Validate each ID is a string
            for (const v of value) {
                if (typeof v !== 'string') {
                    errors.push({
                        field: fieldDef.name,
                        message: `${fieldDef.label} contains an invalid shard ID`,
                        code: 'INVALID_TYPE',
                        value: v,
                    });
                }
            }
        }
        else {
            if (typeof value !== 'string' && value !== null) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be a shard ID`,
                    code: 'INVALID_TYPE',
                    value,
                });
            }
        }
        return errors;
    }
    // ============================================================================
    // File Field Validators
    // ============================================================================
    validateFileField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        // File validation expects an array of file metadata objects
        if (config.multiple) {
            if (!Array.isArray(value)) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be an array of files`,
                    code: 'INVALID_TYPE',
                    value,
                });
                return errors;
            }
            if (config.maxFiles !== undefined && value.length > config.maxFiles) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} allows at most ${config.maxFiles} file(s)`,
                    code: 'MAX_FILES',
                    value: value.length,
                    constraint: config.maxFiles,
                });
            }
            // Validate each file
            for (const file of value) {
                errors.push(...this.validateSingleFile(fieldDef, file, config));
            }
        }
        else {
            if (typeof value !== 'object' || value === null) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be a file object`,
                    code: 'INVALID_TYPE',
                    value,
                });
                return errors;
            }
            errors.push(...this.validateSingleFile(fieldDef, value, config));
        }
        return errors;
    }
    validateSingleFile(fieldDef, file, config) {
        const errors = [];
        if (typeof file !== 'object' || file === null) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} contains an invalid file`,
                code: 'INVALID_TYPE',
                value: file,
            });
            return errors;
        }
        const f = file;
        // Check size
        if (config.maxSize !== undefined && f.size !== undefined && f.size > config.maxSize) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} file size exceeds ${Math.round(config.maxSize / 1024 / 1024)}MB`,
                code: 'FILE_TOO_LARGE',
                value: f.size,
                constraint: config.maxSize,
            });
        }
        // Check allowed types
        if (config.allowedTypes && config.allowedTypes.length > 0 && f.type) {
            const isAllowed = config.allowedTypes.some(t => {
                // Support MIME types and extensions
                if (t.includes('/')) {
                    return f.type === t || (t.endsWith('/*') && f.type.startsWith(t.replace('/*', '/')));
                }
                return f.name?.toLowerCase().endsWith(t.toLowerCase());
            });
            if (!isAllowed) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} file type is not allowed`,
                    code: 'FILE_TYPE_NOT_ALLOWED',
                    value: f.type,
                    constraint: config.allowedTypes,
                });
            }
        }
        return errors;
    }
    validateImageField(fieldDef, value) {
        const errors = [];
        const config = fieldDef.config;
        // Similar to file validation but with image-specific checks
        if (config.multiple) {
            if (!Array.isArray(value)) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be an array of images`,
                    code: 'INVALID_TYPE',
                    value,
                });
                return errors;
            }
            if (config.maxImages !== undefined && value.length > config.maxImages) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} allows at most ${config.maxImages} image(s)`,
                    code: 'MAX_IMAGES',
                    value: value.length,
                    constraint: config.maxImages,
                });
            }
            // Validate each image
            for (const img of value) {
                errors.push(...this.validateSingleImage(fieldDef, img, config));
            }
        }
        else {
            if (typeof value !== 'object' || value === null) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} must be an image object`,
                    code: 'INVALID_TYPE',
                    value,
                });
                return errors;
            }
            errors.push(...this.validateSingleImage(fieldDef, value, config));
        }
        return errors;
    }
    validateSingleImage(fieldDef, image, config) {
        const errors = [];
        if (typeof image !== 'object' || image === null) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} contains an invalid image`,
                code: 'INVALID_TYPE',
                value: image,
            });
            return errors;
        }
        const img = image;
        // Check size
        if (config.maxSize !== undefined && img.size !== undefined && img.size > config.maxSize) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} image size exceeds ${Math.round(config.maxSize / 1024 / 1024)}MB`,
                code: 'IMAGE_TOO_LARGE',
                value: img.size,
                constraint: config.maxSize,
            });
        }
        // Check dimensions
        if (config.maxWidth !== undefined && img.width !== undefined && img.width > config.maxWidth) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} image width exceeds ${config.maxWidth}px`,
                code: 'IMAGE_WIDTH_EXCEEDED',
                value: img.width,
                constraint: config.maxWidth,
            });
        }
        if (config.maxHeight !== undefined && img.height !== undefined && img.height > config.maxHeight) {
            errors.push({
                field: fieldDef.name,
                message: `${fieldDef.label} image height exceeds ${config.maxHeight}px`,
                code: 'IMAGE_HEIGHT_EXCEEDED',
                value: img.height,
                constraint: config.maxHeight,
            });
        }
        // Check allowed formats
        if (config.allowedFormats && config.allowedFormats.length > 0) {
            const format = img.type?.split('/')[1]?.toLowerCase() ||
                img.name?.split('.').pop()?.toLowerCase();
            if (format && !config.allowedFormats.includes(format)) {
                errors.push({
                    field: fieldDef.name,
                    message: `${fieldDef.label} image format must be one of: ${config.allowedFormats.join(', ')}`,
                    code: 'IMAGE_FORMAT_NOT_ALLOWED',
                    value: format,
                    constraint: config.allowedFormats,
                });
            }
        }
        return errors;
    }
    // ============================================================================
    // Cross-Field Validation
    // ============================================================================
    async validateCrossFieldRules(fieldDef, data, context) {
        const errors = [];
        if (!fieldDef.validation) {
            return errors;
        }
        for (const rule of fieldDef.validation) {
            const ruleError = await this.validateRule(rule, fieldDef, data, context);
            if (ruleError) {
                errors.push(ruleError);
            }
        }
        return errors;
    }
    async validateRule(rule, fieldDef, data, context) {
        const value = data[fieldDef.name];
        switch (rule.type) {
            case 'equalTo':
                if (rule.params?.field) {
                    const otherValue = data[rule.params.field];
                    if (value !== otherValue) {
                        return {
                            field: fieldDef.name,
                            message: rule.message || `${fieldDef.label} must match ${rule.params.field}`,
                            code: 'EQUAL_TO',
                            value,
                            constraint: rule.params.field,
                        };
                    }
                }
                break;
            case 'notEqualTo':
                if (rule.params?.field) {
                    const otherValue = data[rule.params.field];
                    if (value === otherValue) {
                        return {
                            field: fieldDef.name,
                            message: rule.message || `${fieldDef.label} must not match ${rule.params.field}`,
                            code: 'NOT_EQUAL_TO',
                            value,
                            constraint: rule.params.field,
                        };
                    }
                }
                break;
            case 'greaterThan':
                if (rule.params?.field && typeof value === 'number') {
                    const otherValue = data[rule.params.field];
                    if (typeof otherValue === 'number' && value <= otherValue) {
                        return {
                            field: fieldDef.name,
                            message: rule.message || `${fieldDef.label} must be greater than ${rule.params.field}`,
                            code: 'GREATER_THAN',
                            value,
                            constraint: rule.params.field,
                        };
                    }
                }
                break;
            case 'lessThan':
                if (rule.params?.field && typeof value === 'number') {
                    const otherValue = data[rule.params.field];
                    if (typeof otherValue === 'number' && value >= otherValue) {
                        return {
                            field: fieldDef.name,
                            message: rule.message || `${fieldDef.label} must be less than ${rule.params.field}`,
                            code: 'LESS_THAN',
                            value,
                            constraint: rule.params.field,
                        };
                    }
                }
                break;
            case 'requiredIf':
                if (rule.params?.field) {
                    const conditionValue = data[rule.params.field];
                    if (conditionValue === rule.params?.value && this.isEmpty(value)) {
                        return {
                            field: fieldDef.name,
                            message: rule.message || `${fieldDef.label} is required when ${rule.params.field} is ${rule.params.value}`,
                            code: 'REQUIRED_IF',
                            value,
                        };
                    }
                }
                break;
            case 'requiredUnless':
                if (rule.params?.field) {
                    const conditionValue = data[rule.params.field];
                    if (conditionValue !== rule.params?.value && this.isEmpty(value)) {
                        return {
                            field: fieldDef.name,
                            message: rule.message || `${fieldDef.label} is required unless ${rule.params.field} is ${rule.params.value}`,
                            code: 'REQUIRED_UNLESS',
                            value,
                        };
                    }
                }
                break;
            // Note: 'unique' validation requires database checks and should be handled separately
        }
        return null;
    }
    // ============================================================================
    // Helpers
    // ============================================================================
    isEmpty(value) {
        if (value === null || value === undefined) {
            return true;
        }
        if (typeof value === 'string' && value.trim() === '') {
            return true;
        }
        if (Array.isArray(value) && value.length === 0) {
            return true;
        }
        return false;
    }
}
// ============================================================================
// Export singleton instance
// ============================================================================
export const fieldValidationService = new FieldValidationService();
//# sourceMappingURL=field-validation.service.js.map