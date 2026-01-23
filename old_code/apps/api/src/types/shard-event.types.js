/**
 * Shard Event Types for webhooks and real-time updates
 */
/**
 * Types of shard events
 */
export var ShardEventType;
(function (ShardEventType) {
    ShardEventType["CREATED"] = "shard.created";
    ShardEventType["UPDATED"] = "shard.updated";
    ShardEventType["DELETED"] = "shard.deleted";
    ShardEventType["RESTORED"] = "shard.restored";
    ShardEventType["ARCHIVED"] = "shard.archived";
    ShardEventType["RELATIONSHIP_ADDED"] = "shard.relationship.added";
    ShardEventType["RELATIONSHIP_REMOVED"] = "shard.relationship.removed";
    ShardEventType["ENRICHED"] = "shard.enriched";
    ShardEventType["STATUS_CHANGED"] = "shard.status.changed";
    ShardEventType["ACL_CHANGED"] = "shard.acl.changed";
})(ShardEventType || (ShardEventType = {}));
//# sourceMappingURL=shard-event.types.js.map