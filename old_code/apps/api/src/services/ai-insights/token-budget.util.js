/**
 * Apply a token budget to context by trimming RAG chunks first (lowest score removed last)
 * then trimming related chunks (remove from end), preserving the primary chunk.
 * Returns new arrays; does not mutate inputs.
 */
export function applyTokenBudget(primary, related, ragChunks, maxTokens) {
    const clonedRelated = [...related];
    const clonedRag = [...ragChunks];
    const total = () => (primary?.tokenCount || 0) + clonedRelated.reduce((a, r) => a + (r.tokenCount || 0), 0) + clonedRag.reduce((a, r) => a + (r.tokenCount || 0), 0);
    if (total() <= maxTokens) {
        return { related: clonedRelated, ragChunks: clonedRag };
    }
    // Trim RAG by lowest score first (keep higher scores)
    clonedRag.sort((a, b) => b.score - a.score);
    while (clonedRag.length > 0 && total() > maxTokens) {
        clonedRag.pop();
    }
    // Then trim related by removing trailing items
    while (clonedRelated.length > 0 && total() > maxTokens) {
        clonedRelated.pop();
    }
    return { related: clonedRelated, ragChunks: clonedRag };
}
//# sourceMappingURL=token-budget.util.js.map