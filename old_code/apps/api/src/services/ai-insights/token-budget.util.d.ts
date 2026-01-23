import type { ContextChunk, RAGChunk } from '../../types/ai-insights.types.js';
/**
 * Apply a token budget to context by trimming RAG chunks first (lowest score removed last)
 * then trimming related chunks (remove from end), preserving the primary chunk.
 * Returns new arrays; does not mutate inputs.
 */
export declare function applyTokenBudget(primary: Pick<ContextChunk, 'tokenCount'> | undefined, related: Array<Pick<ContextChunk, 'tokenCount'>>, ragChunks: Array<Pick<RAGChunk, 'tokenCount' | 'score'>>, maxTokens: number): {
    related: Pick<ContextChunk, "tokenCount">[];
    ragChunks: Pick<RAGChunk, "tokenCount" | "score">[];
};
//# sourceMappingURL=token-budget.util.d.ts.map