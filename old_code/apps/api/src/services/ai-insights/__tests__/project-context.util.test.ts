import { describe, it, expect } from 'vitest';
import { sortProjectRelatedChunks } from '../project-context.util.js';

describe('sortProjectRelatedChunks', () => {
  it('orders c_document before c_documentChunk before c_note, others last', () => {
    const chunks = [
      { shardTypeId: 'c_note' },
      { shardTypeId: 'unknown_type' },
      { shardTypeId: 'c_documentChunk' },
      { shardTypeId: 'c_document' },
    ];

    const sorted = sortProjectRelatedChunks(chunks);
    expect(sorted.map(c => c.shardTypeId)).toEqual([
      'c_document',
      'c_documentChunk',
      'c_note',
      'unknown_type',
    ]);
  });
});
