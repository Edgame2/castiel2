import type { ContextChunk } from '../../types/ai-insights.types.js';
/**
 * Sort project-related context chunks by shard type priority.
 * Priority: c_document > c_documentChunk > c_note, others last.
 */
export declare function sortProjectRelatedChunks<T extends Pick<ContextChunk, 'shardTypeId'>>(chunks: T[]): T[];
//# sourceMappingURL=project-context.util.d.ts.map