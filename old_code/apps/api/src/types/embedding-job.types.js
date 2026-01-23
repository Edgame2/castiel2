/**
 * Embedding Job Types
 *
 * Defines the message structure for shard embedding jobs
 * sent to Azure Service Bus for processing
 */
/**
 * Check if a shard type should be ignored from embedding
 */
export function shouldIgnoreShardType(shardTypeId, ignoredTypes) {
    return ignoredTypes.some(ignored => ignored.toLowerCase() === shardTypeId.toLowerCase());
}
//# sourceMappingURL=embedding-job.types.js.map