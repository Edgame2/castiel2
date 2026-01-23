/**
 * Schema Migration Types
 * Handles schema evolution when ShardType schemas change
 */
/**
 * Migration strategy for applying schema changes
 */
export var MigrationStrategy;
(function (MigrationStrategy) {
    /** Apply migrations when Shards are read (on-demand) */
    MigrationStrategy["LAZY"] = "lazy";
    /** Apply migrations immediately to all affected Shards in background */
    MigrationStrategy["EAGER"] = "eager";
    /** Require manual migration via admin action */
    MigrationStrategy["MANUAL"] = "manual";
    /** No migration needed (additive changes only) */
    MigrationStrategy["NONE"] = "none";
})(MigrationStrategy || (MigrationStrategy = {}));
/**
 * Types of field changes that can occur in a schema migration
 */
export var FieldChangeType;
(function (FieldChangeType) {
    /** New field added to schema */
    FieldChangeType["ADDED"] = "added";
    /** Field removed from schema */
    FieldChangeType["REMOVED"] = "removed";
    /** Field renamed (requires mapping) */
    FieldChangeType["RENAMED"] = "renamed";
    /** Field type changed (may require transformation) */
    FieldChangeType["TYPE_CHANGED"] = "type_changed";
    /** Field configuration changed (e.g., min/max, options) */
    FieldChangeType["CONFIG_CHANGED"] = "config_changed";
    /** Field made required */
    FieldChangeType["MADE_REQUIRED"] = "made_required";
    /** Field made optional */
    FieldChangeType["MADE_OPTIONAL"] = "made_optional";
    /** Field default value changed */
    FieldChangeType["DEFAULT_CHANGED"] = "default_changed";
})(FieldChangeType || (FieldChangeType = {}));
/**
 * Migration status for tracking progress
 */
export var MigrationStatus;
(function (MigrationStatus) {
    /** Migration defined but not started */
    MigrationStatus["PENDING"] = "pending";
    /** Migration is currently running */
    MigrationStatus["IN_PROGRESS"] = "in_progress";
    /** Migration completed successfully */
    MigrationStatus["COMPLETED"] = "completed";
    /** Migration failed (may be partially applied) */
    MigrationStatus["FAILED"] = "failed";
    /** Migration was cancelled */
    MigrationStatus["CANCELLED"] = "cancelled";
    /** Migration is paused (can be resumed) */
    MigrationStatus["PAUSED"] = "paused";
})(MigrationStatus || (MigrationStatus = {}));
/**
 * Built-in transformation functions
 */
export const BUILT_IN_TRANSFORMATIONS = {
    /** Convert string to number */
    STRING_TO_NUMBER: 'stringToNumber',
    /** Convert number to string */
    NUMBER_TO_STRING: 'numberToString',
    /** Convert string to boolean */
    STRING_TO_BOOLEAN: 'stringToBoolean',
    /** Convert boolean to string */
    BOOLEAN_TO_STRING: 'booleanToString',
    /** Convert single value to array */
    VALUE_TO_ARRAY: 'valueToArray',
    /** Convert array to single value (first element) */
    ARRAY_TO_VALUE: 'arrayToValue',
    /** Convert date string to ISO format */
    DATE_TO_ISO: 'dateToISO',
    /** Parse JSON string */
    PARSE_JSON: 'parseJSON',
    /** Stringify to JSON */
    STRINGIFY_JSON: 'stringifyJSON',
    /** Convert to uppercase */
    TO_UPPERCASE: 'toUppercase',
    /** Convert to lowercase */
    TO_LOWERCASE: 'toLowercase',
    /** Trim whitespace */
    TRIM: 'trim',
};
//# sourceMappingURL=schema-migration.types.js.map