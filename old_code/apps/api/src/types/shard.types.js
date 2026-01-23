/**
 * Shard types for Cosmos DB
 * Shards are the core data entities in the system
 */
/**
 * Permission level for ACL entries
 */
export var PermissionLevel;
(function (PermissionLevel) {
    PermissionLevel["READ"] = "read";
    PermissionLevel["WRITE"] = "write";
    PermissionLevel["DELETE"] = "delete";
    PermissionLevel["ADMIN"] = "admin";
})(PermissionLevel || (PermissionLevel = {}));
/**
 * Shard status
 */
export var ShardStatus;
(function (ShardStatus) {
    ShardStatus["ACTIVE"] = "active";
    ShardStatus["ARCHIVED"] = "archived";
    ShardStatus["DELETED"] = "deleted";
    ShardStatus["DRAFT"] = "draft";
})(ShardStatus || (ShardStatus = {}));
/**
 * Source of shard creation
 */
export var ShardSource;
(function (ShardSource) {
    ShardSource["UI"] = "ui";
    ShardSource["API"] = "api";
    ShardSource["IMPORT"] = "import";
    ShardSource["INTEGRATION"] = "integration";
    ShardSource["SYSTEM"] = "system";
})(ShardSource || (ShardSource = {}));
/**
 * Sync status for external relationships
 */
export var SyncStatus;
(function (SyncStatus) {
    SyncStatus["SYNCED"] = "synced";
    SyncStatus["PENDING"] = "pending";
    SyncStatus["FAILED"] = "failed";
    SyncStatus["STALE"] = "stale";
})(SyncStatus || (SyncStatus = {}));
/**
 * Sync direction for external relationships
 */
export var SyncDirection;
(function (SyncDirection) {
    SyncDirection["INBOUND"] = "inbound";
    SyncDirection["OUTBOUND"] = "outbound";
    SyncDirection["BIDIRECTIONAL"] = "bidirectional";
})(SyncDirection || (SyncDirection = {}));
/**
 * Type guard to check if a string is a valid SyncStatus
 */
export function isValidSyncStatus(value) {
    return Object.values(SyncStatus).includes(value);
}
/**
 * Type guard to check if a string is a valid SyncDirection
 */
export function isValidSyncDirection(value) {
    return Object.values(SyncDirection).includes(value);
}
//# sourceMappingURL=shard.types.js.map