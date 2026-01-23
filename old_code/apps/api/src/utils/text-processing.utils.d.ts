/**
 * Text Processing Utilities
 * Extract and chunk text from Shards for vectorization
 */
import { ChunkingStrategy, TextChunk, TextSource } from '../types/vectorization.types.js';
import type { Shard } from '../types/shard.types.js';
/**
 * Extract text from a Shard based on text sources configuration
 */
export declare function extractTextFromShard(shard: Shard, textSources: TextSource[]): {
    text: string;
    sources: string[];
};
/**
 * Chunk text based on strategy
 */
export declare function chunkText(text: string, strategy: ChunkingStrategy, chunkSize?: number, overlap?: number, source?: string, weight?: number): TextChunk[];
/**
 * Combine chunks into a single text (for single embedding)
 */
export declare function combineChunks(chunks: TextChunk[]): string;
/**
 * Validate text for vectorization
 */
export declare function validateText(text: string, maxTokens: number): {
    valid: boolean;
    error?: string;
};
/**
 * Prepare text for embedding (cleanup, normalize)
 */
export declare function prepareTextForEmbedding(text: string): string;
/**
 * Calculate chunking statistics
 */
export declare function calculateChunkingStats(chunks: TextChunk[]): {
    totalChunks: number;
    totalTokens: number;
    avgTokensPerChunk: number;
    minTokens: number;
    maxTokens: number;
};
//# sourceMappingURL=text-processing.utils.d.ts.map