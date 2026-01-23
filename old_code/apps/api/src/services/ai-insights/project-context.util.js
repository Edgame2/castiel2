/**
 * Sort project-related context chunks by shard type priority.
 * Priority: c_document > c_documentChunk > c_note, others last.
 */
export function sortProjectRelatedChunks(chunks) {
    const typePriority = {
        c_document: 0,
        c_documentChunk: 1,
        c_note: 2,
    };
    return [...chunks].sort((a, b) => (typePriority[a.shardTypeId] ?? 99) - (typePriority[b.shardTypeId] ?? 99));
}
//# sourceMappingURL=project-context.util.js.map