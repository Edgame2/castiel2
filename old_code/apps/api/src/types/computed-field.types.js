/**
 * Computed/Derived Field Types
 * Auto-calculated fields based on other data
 */
/**
 * Computed field data source
 */
export var ComputedFieldSource;
(function (ComputedFieldSource) {
    /** Value from the shard itself */
    ComputedFieldSource["SELF"] = "self";
    /** Aggregation across related shards */
    ComputedFieldSource["RELATED"] = "related";
    /** Value from a lookup/reference */
    ComputedFieldSource["LOOKUP"] = "lookup";
    /** Combined from multiple sources */
    ComputedFieldSource["FORMULA"] = "formula";
    /** From external API */
    ComputedFieldSource["EXTERNAL"] = "external";
})(ComputedFieldSource || (ComputedFieldSource = {}));
/**
 * Aggregation operations for related shards
 */
export var AggregationOperation;
(function (AggregationOperation) {
    AggregationOperation["COUNT"] = "count";
    AggregationOperation["SUM"] = "sum";
    AggregationOperation["AVG"] = "avg";
    AggregationOperation["MIN"] = "min";
    AggregationOperation["MAX"] = "max";
    AggregationOperation["FIRST"] = "first";
    AggregationOperation["LAST"] = "last";
    AggregationOperation["CONCAT"] = "concat";
    AggregationOperation["DISTINCT"] = "distinct";
    AggregationOperation["EXISTS"] = "exists";
})(AggregationOperation || (AggregationOperation = {}));
/**
 * Data type for computed field output
 */
export var ComputedFieldType;
(function (ComputedFieldType) {
    ComputedFieldType["STRING"] = "string";
    ComputedFieldType["NUMBER"] = "number";
    ComputedFieldType["BOOLEAN"] = "boolean";
    ComputedFieldType["DATE"] = "date";
    ComputedFieldType["ARRAY"] = "array";
    ComputedFieldType["OBJECT"] = "object";
})(ComputedFieldType || (ComputedFieldType = {}));
/**
 * Built-in formula functions
 */
export const FORMULA_FUNCTIONS = {
    // Math functions
    round: (value, decimals = 0) => Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals),
    floor: Math.floor,
    ceil: Math.ceil,
    abs: Math.abs,
    min: (...args) => Math.min(...args),
    max: (...args) => Math.max(...args),
    pow: Math.pow,
    sqrt: Math.sqrt,
    // String functions
    concat: (...args) => args.join(''),
    upper: (s) => String(s).toUpperCase(),
    lower: (s) => String(s).toLowerCase(),
    trim: (s) => String(s).trim(),
    substring: (s, start, end) => {
        const str = String(s ?? '');
        const startIdx = Math.max(0, Math.min(start, str.length));
        const endIdx = end !== undefined ? Math.max(startIdx, Math.min(end, str.length)) : str.length;
        return str.substring(startIdx, endIdx);
    },
    length: (s) => (Array.isArray(s) ? s : String(s)).length,
    replace: (s, search, replace) => {
        try {
            // Escape special regex characters to prevent ReDoS
            const escapedSearch = String(search ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return String(s ?? '').replace(new RegExp(escapedSearch, 'g'), String(replace ?? ''));
        }
        catch (error) {
            // If regex construction fails, fall back to simple string replacement
            return String(s ?? '').split(String(search ?? '')).join(String(replace ?? ''));
        }
    },
    // Date functions
    now: () => new Date(),
    daysAgo: (days) => {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date;
    },
    daysBetween: (date1, date2) => {
        const d1 = new Date(date1).getTime();
        const d2 = new Date(date2).getTime();
        return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    },
    formatDate: (date, format) => {
        const d = new Date(date);
        return format
            .replace('YYYY', d.getFullYear().toString())
            .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
            .replace('DD', String(d.getDate()).padStart(2, '0'));
    },
    addDays: (date, days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    },
    // Conditional functions
    if: (condition, trueValue, falseValue) => condition ? trueValue : falseValue,
    coalesce: (...args) => args.find(a => a !== null && a !== undefined),
    default: (value, defaultValue) => value ?? defaultValue,
    // Array functions
    first: (arr) => arr?.[0],
    last: (arr) => arr?.[arr?.length - 1],
    sum: (arr) => arr?.reduce((a, b) => a + b, 0) ?? 0,
    avg: (arr) => arr?.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
    count: (arr) => arr?.length ?? 0,
    join: (arr, sep = ', ') => arr?.join(sep) ?? '',
    includes: (arr, value) => arr?.includes(value) ?? false,
    filter: (arr, field, value) => arr?.filter(item => item?.[field] === value) ?? [],
    // Type conversion
    toNumber: (value) => Number(value) || 0,
    toString: (value) => String(value ?? ''),
    toBoolean: (value) => Boolean(value),
    toDate: (value) => new Date(value),
};
/**
 * Predefined computed field templates
 */
export const COMPUTED_FIELD_TEMPLATES = {
    /** Age in days since creation */
    ageInDays: {
        name: 'ageInDays',
        label: 'Age (Days)',
        type: ComputedFieldType.NUMBER,
        source: ComputedFieldSource.FORMULA,
        config: {
            type: 'formula',
            formula: 'daysBetween(${createdAt}, now())',
            variables: [
                { name: 'createdAt', source: 'field', value: 'createdAt' },
            ],
        },
    },
    /** Days since last update */
    daysSinceUpdate: {
        name: 'daysSinceUpdate',
        label: 'Days Since Update',
        type: ComputedFieldType.NUMBER,
        source: ComputedFieldSource.FORMULA,
        config: {
            type: 'formula',
            formula: 'daysBetween(${updatedAt}, now())',
            variables: [
                { name: 'updatedAt', source: 'field', value: 'updatedAt' },
            ],
        },
    },
    /** Count of related items */
    relatedCount: {
        name: 'relatedCount',
        label: 'Related Items',
        type: ComputedFieldType.NUMBER,
        source: ComputedFieldSource.RELATED,
        config: {
            type: 'related',
            relationshipType: '*',
            direction: 'both',
            aggregation: AggregationOperation.COUNT,
        },
    },
    /** Full name from first + last */
    fullName: {
        name: 'fullName',
        label: 'Full Name',
        type: ComputedFieldType.STRING,
        source: ComputedFieldSource.SELF,
        config: {
            type: 'self',
            expression: 'concat(${firstName}, " ", ${lastName})',
            dependsOn: ['firstName', 'lastName'],
        },
    },
    /** Total value from quantity * price */
    totalValue: {
        name: 'totalValue',
        label: 'Total Value',
        type: ComputedFieldType.NUMBER,
        source: ComputedFieldSource.SELF,
        config: {
            type: 'self',
            expression: '${quantity} * ${unitPrice}',
            dependsOn: ['quantity', 'unitPrice'],
        },
    },
    /** Days until due date */
    daysUntilDue: {
        name: 'daysUntilDue',
        label: 'Days Until Due',
        type: ComputedFieldType.NUMBER,
        source: ComputedFieldSource.FORMULA,
        config: {
            type: 'formula',
            formula: 'daysBetween(now(), ${dueDate})',
            variables: [
                { name: 'dueDate', source: 'field', value: 'dueDate' },
            ],
        },
    },
    /** Is overdue check */
    isOverdue: {
        name: 'isOverdue',
        label: 'Overdue',
        type: ComputedFieldType.BOOLEAN,
        source: ComputedFieldSource.FORMULA,
        config: {
            type: 'formula',
            formula: 'if(${dueDate} !== null && daysBetween(${dueDate}, now()) > 0, true, false)',
            variables: [
                { name: 'dueDate', source: 'field', value: 'dueDate' },
            ],
        },
    },
    /** Completion percentage */
    completionPercentage: {
        name: 'completionPercentage',
        label: 'Completion %',
        type: ComputedFieldType.NUMBER,
        source: ComputedFieldSource.FORMULA,
        config: {
            type: 'formula',
            formula: 'round((${completed} / max(${total}, 1)) * 100, 1)',
            variables: [
                { name: 'completed', source: 'field', value: 'completedCount' },
                { name: 'total', source: 'field', value: 'totalCount' },
            ],
        },
    },
};
/**
 * Apply a computed field template
 */
export function applyComputedFieldTemplate(templateName, overrides) {
    const template = COMPUTED_FIELD_TEMPLATES[templateName];
    return {
        ...template,
        ...overrides,
        config: {
            ...template.config,
            ...(overrides?.config || {}),
        },
    };
}
//# sourceMappingURL=computed-field.types.js.map