/**
 * Filter RAG chunks by allowed shard IDs with an allowance for unlinked chunks.
 * - Keeps all chunks whose shardId is in allowedIds
 * - Adds up to floor(total * unlinkedFraction) of highest-score unlinked chunks (at least 1 if any unlinked exist)
 * - Returns chunks sorted by descending score
 */
export function filterRagByAllowedIds(ragChunks, allowedIds, unlinkedFraction = 0.2) {
    if (!Array.isArray(ragChunks) || ragChunks.length === 0) {
        return [];
    }
    const total = ragChunks.length;
    const linked = ragChunks.filter((c) => allowedIds.has(c.shardId));
    const unlinked = ragChunks.filter((c) => !allowedIds.has(c.shardId)).sort((a, b) => b.score - a.score);
    const maxUnlinked = unlinked.length > 0 ? Math.max(1, Math.floor(total * unlinkedFraction)) : 0;
    const kept = [...linked, ...unlinked.slice(0, maxUnlinked)].sort((a, b) => b.score - a.score);
    return kept;
}
//# sourceMappingURL=rag-filter.util.js.map