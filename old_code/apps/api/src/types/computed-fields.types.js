/**
 * Computed Fields Types
 *
 * Types for computed/derived fields that are calculated from other field values
 */
/**
 * When to compute the field
 */
export var ComputeTrigger;
(function (ComputeTrigger) {
    ComputeTrigger["ON_READ"] = "on_read";
    ComputeTrigger["ON_WRITE"] = "on_write";
    ComputeTrigger["ON_DEMAND"] = "on_demand";
    ComputeTrigger["SCHEDULED"] = "scheduled";
})(ComputeTrigger || (ComputeTrigger = {}));
/**
 * Computation method
 */
export var ComputeMethod;
(function (ComputeMethod) {
    ComputeMethod["FORMULA"] = "formula";
    ComputeMethod["TEMPLATE"] = "template";
    ComputeMethod["AGGREGATE"] = "aggregate";
    ComputeMethod["LOOKUP"] = "lookup";
    ComputeMethod["CONDITIONAL"] = "conditional";
    ComputeMethod["CUSTOM"] = "custom";
})(ComputeMethod || (ComputeMethod = {}));
/**
 * Aggregate function type
 */
export var AggregateFunction;
(function (AggregateFunction) {
    AggregateFunction["COUNT"] = "count";
    AggregateFunction["SUM"] = "sum";
    AggregateFunction["AVG"] = "avg";
    AggregateFunction["MIN"] = "min";
    AggregateFunction["MAX"] = "max";
    AggregateFunction["CONCAT"] = "concat";
    AggregateFunction["FIRST"] = "first";
    AggregateFunction["LAST"] = "last";
})(AggregateFunction || (AggregateFunction = {}));
/**
 * Built-in formula functions available in expressions
 */
export const FORMULA_FUNCTIONS = {
    // Math
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    round: Math.round,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
    sqrt: Math.sqrt,
    // String
    upper: (s) => String(s).toUpperCase(),
    lower: (s) => String(s).toLowerCase(),
    trim: (s) => String(s).trim(),
    len: (s) => String(s).length,
    concat: (...args) => args.join(''),
    substr: (s, start, len) => String(s).substr(start, len),
    // Date
    now: () => new Date().toISOString(),
    today: () => new Date().toISOString().split('T')[0],
    year: (d) => new Date(d).getFullYear(),
    month: (d) => new Date(d).getMonth() + 1,
    day: (d) => new Date(d).getDate(),
    daysBetween: (d1, d2) => {
        const diff = new Date(d2).getTime() - new Date(d1).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    },
    // Array
    count: (arr) => Array.isArray(arr) ? arr.length : 0,
    sum: (arr) => Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0,
    avg: (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) {
            return 0;
        }
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    },
    first: (arr) => Array.isArray(arr) && arr.length > 0 ? arr[0] : null,
    last: (arr) => Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null,
    join: (arr, sep = ', ') => Array.isArray(arr) ? arr.join(sep) : '',
    // Conditional
    if: (condition, ifTrue, ifFalse) => condition ? ifTrue : ifFalse,
    coalesce: (...args) => args.find((a) => a !== null && a !== undefined),
    // Type conversion
    num: (v) => Number(v) || 0,
    str: (v) => String(v),
    bool: (v) => Boolean(v),
};
//# sourceMappingURL=computed-fields.types.js.map