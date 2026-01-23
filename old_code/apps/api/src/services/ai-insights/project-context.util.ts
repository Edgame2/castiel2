import type { ContextChunk } from '../../types/ai-insights.types.js';

/**
 * Sort project-related context chunks by shard type priority.
 * Priority: c_document > c_documentChunk > c_note, others last.
 */
export function sortProjectRelatedChunks<T extends Pick<ContextChunk, 'shardTypeId'>>(
  chunks: T[]
): T[] {
  const typePriority: Record<string, number> = {
    c_document: 0,
    c_documentChunk: 1,
    c_note: 2,
  };
  return [...chunks].sort(
    (a, b) => (typePriority[a.shardTypeId] ?? 99) - (typePriority[b.shardTypeId] ?? 99)
  );
}
