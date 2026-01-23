import type { RAGChunk } from '../../types/ai-insights.types.js';
/**
 * Filter RAG chunks by allowed shard IDs with an allowance for unlinked chunks.
 * - Keeps all chunks whose shardId is in allowedIds
 * - Adds up to floor(total * unlinkedFraction) of highest-score unlinked chunks (at least 1 if any unlinked exist)
 * - Returns chunks sorted by descending score
 */
export declare function filterRagByAllowedIds(ragChunks: Array<Pick<RAGChunk, 'shardId' | 'score' | 'id' | 'content' | 'shardName' | 'shardTypeId' | 'chunkIndex' | 'tokenCount'>>, allowedIds: Set<string>, unlinkedFraction?: number): Pick<RAGChunk, "id" | "shardId" | "shardTypeId" | "content" | "tokenCount" | "score" | "shardName" | "chunkIndex">[];
//# sourceMappingURL=rag-filter.util.d.ts.map