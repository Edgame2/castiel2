/**
 * Revision Types
 * For tracking changes to Shards with full snapshots or deltas
 */
/**
 * Type of change made in a revision
 */
export var ChangeType;
(function (ChangeType) {
    ChangeType["CREATED"] = "CREATED";
    ChangeType["UPDATED"] = "UPDATED";
    ChangeType["DELETED"] = "DELETED";
    ChangeType["RESTORED"] = "RESTORED";
    ChangeType["MERGED"] = "MERGED";
    ChangeType["ENRICHED"] = "ENRICHED";
    ChangeType["VECTOR_UPDATED"] = "VECTOR_UPDATED";
})(ChangeType || (ChangeType = {}));
/**
 * Strategy for storing revision data
 */
export var RevisionStorageStrategy;
(function (RevisionStorageStrategy) {
    RevisionStorageStrategy["FULL_SNAPSHOT"] = "FULL_SNAPSHOT";
    RevisionStorageStrategy["DELTA"] = "DELTA";
})(RevisionStorageStrategy || (RevisionStorageStrategy = {}));
/**
 * Default retention policy
 * Keep revisions for 90 days, with TTL auto-deletion
 */
export const DEFAULT_RETENTION_POLICY = {
    enabled: true,
    retentionDays: 90,
    maxRevisionsPerShard: undefined, // No limit
    keepMilestones: true, // Keep CREATED, MERGED revisions forever
};
/**
 * Milestone change types that should be kept forever
 */
export const MILESTONE_CHANGE_TYPES = [
    ChangeType.CREATED,
    ChangeType.MERGED,
    ChangeType.RESTORED,
];
/**
 * Check if a change type is a milestone
 */
export function isMilestoneChangeType(changeType) {
    return MILESTONE_CHANGE_TYPES.includes(changeType);
}
/**
 * Calculate TTL for a revision based on retention policy
 * Returns TTL in seconds, or undefined for no TTL
 */
export function calculateRevisionTTL(changeType, policy) {
    if (!policy.enabled) {
        return undefined; // No TTL if retention disabled
    }
    // Keep milestone revisions forever
    if (policy.keepMilestones && isMilestoneChangeType(changeType)) {
        return undefined; // No TTL
    }
    // Convert retention days to seconds
    return policy.retentionDays * 24 * 60 * 60;
}
/**
 * Default compression threshold
 * Only compress revisions larger than 10KB
 */
export const DEFAULT_COMPRESSION_THRESHOLD_BYTES = 10 * 1024; // 10KB
//# sourceMappingURL=revision.types.js.map