/**
 * Advanced Search Types
 * Complex querying, facets, saved searches, and search analytics
 */
/**
 * Search field types for type-specific handling
 */
export var SearchFieldType;
(function (SearchFieldType) {
    SearchFieldType["TEXT"] = "text";
    SearchFieldType["KEYWORD"] = "keyword";
    SearchFieldType["NUMBER"] = "number";
    SearchFieldType["DATE"] = "date";
    SearchFieldType["BOOLEAN"] = "boolean";
    SearchFieldType["GEO"] = "geo";
    SearchFieldType["ARRAY"] = "array";
})(SearchFieldType || (SearchFieldType = {}));
/**
 * Search operators
 */
export var SearchOperator;
(function (SearchOperator) {
    // Text operators
    SearchOperator["CONTAINS"] = "contains";
    SearchOperator["NOT_CONTAINS"] = "not_contains";
    SearchOperator["STARTS_WITH"] = "starts_with";
    SearchOperator["ENDS_WITH"] = "ends_with";
    SearchOperator["EXACT"] = "exact";
    SearchOperator["FUZZY"] = "fuzzy";
    SearchOperator["REGEX"] = "regex";
    // Comparison operators
    SearchOperator["EQUALS"] = "eq";
    SearchOperator["NOT_EQUALS"] = "neq";
    SearchOperator["GREATER_THAN"] = "gt";
    SearchOperator["GREATER_OR_EQUAL"] = "gte";
    SearchOperator["LESS_THAN"] = "lt";
    SearchOperator["LESS_OR_EQUAL"] = "lte";
    SearchOperator["BETWEEN"] = "between";
    // Collection operators
    SearchOperator["IN"] = "in";
    SearchOperator["NOT_IN"] = "not_in";
    SearchOperator["ALL"] = "all";
    SearchOperator["ANY"] = "any";
    SearchOperator["NONE"] = "none";
    SearchOperator["SIZE"] = "size";
    // Existence operators
    SearchOperator["EXISTS"] = "exists";
    SearchOperator["NOT_EXISTS"] = "not_exists";
    SearchOperator["IS_NULL"] = "is_null";
    SearchOperator["IS_NOT_NULL"] = "is_not_null";
    SearchOperator["IS_EMPTY"] = "is_empty";
    SearchOperator["IS_NOT_EMPTY"] = "is_not_empty";
    // Date operators
    SearchOperator["DATE_BEFORE"] = "date_before";
    SearchOperator["DATE_AFTER"] = "date_after";
    SearchOperator["DATE_RANGE"] = "date_range";
    SearchOperator["DATE_RELATIVE"] = "date_relative";
})(SearchOperator || (SearchOperator = {}));
/**
 * Convert relative date to absolute date range
 */
export function resolveRelativeDate(relative) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (relative) {
        case 'today':
            return { from: today, to: now };
        case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return { from: yesterday, to: today };
        }
        case 'this_week': {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            return { from: weekStart, to: now };
        }
        case 'last_week': {
            const lastWeekEnd = new Date(today);
            lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
            const lastWeekStart = new Date(lastWeekEnd);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            return { from: lastWeekStart, to: lastWeekEnd };
        }
        case 'this_month':
            return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
        case 'last_month': {
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(lastMonthEnd);
            lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
            return { from: lastMonthStart, to: lastMonthEnd };
        }
        case 'this_quarter': {
            const quarter = Math.floor(now.getMonth() / 3);
            return { from: new Date(now.getFullYear(), quarter * 3, 1), to: now };
        }
        case 'last_quarter': {
            const quarter = Math.floor(now.getMonth() / 3);
            const lastQuarterEnd = new Date(now.getFullYear(), quarter * 3, 1);
            const lastQuarterStart = new Date(lastQuarterEnd);
            lastQuarterStart.setMonth(lastQuarterStart.getMonth() - 3);
            return { from: lastQuarterStart, to: lastQuarterEnd };
        }
        case 'this_year':
            return { from: new Date(now.getFullYear(), 0, 1), to: now };
        case 'last_year': {
            const lastYearEnd = new Date(now.getFullYear(), 0, 1);
            return { from: new Date(now.getFullYear() - 1, 0, 1), to: lastYearEnd };
        }
        case 'last_7_days': {
            const from = new Date(today);
            from.setDate(from.getDate() - 7);
            return { from, to: now };
        }
        case 'last_30_days': {
            const from = new Date(today);
            from.setDate(from.getDate() - 30);
            return { from, to: now };
        }
        case 'last_90_days': {
            const from = new Date(today);
            from.setDate(from.getDate() - 90);
            return { from, to: now };
        }
        case 'last_365_days': {
            const from = new Date(today);
            from.setDate(from.getDate() - 365);
            return { from, to: now };
        }
        default:
            return { from: today, to: now };
    }
}
/**
 * Check if a search condition group is empty
 */
export function isEmptyConditionGroup(group) {
    return !group.conditions || group.conditions.length === 0;
}
/**
 * Flatten nested condition groups
 */
export function flattenConditions(group) {
    const conditions = [];
    for (const item of group.conditions) {
        if ('logic' in item) {
            conditions.push(...flattenConditions(item));
        }
        else {
            conditions.push(item);
        }
    }
    return conditions;
}
//# sourceMappingURL=advanced-search.types.js.map