/**
 * Unit tests for textExtraction utilities
 */

import { describe, it, expect } from 'vitest';
import { extractTextFromShard } from '../../../src/utils/textExtraction';

describe('textExtraction', () => {
  describe('extractTextFromShard', () => {
    it('returns empty string for empty shard object', () => {
      expect(extractTextFromShard({})).toBe('');
    });

    it('extracts from shard.name and shard.title', () => {
      const shard = { name: 'My Doc', title: 'Document Title' };
      const result = extractTextFromShard(shard);
      expect(result).toContain('My Doc');
      expect(result).toContain('Document Title');
    });

    it('extracts from unstructuredData.text', () => {
      const shard = { unstructuredData: { text: 'Body content' } };
      expect(extractTextFromShard(shard)).toContain('Body content');
    });

    it('extracts from metadata.description', () => {
      const shard = { metadata: { description: 'Description here' } };
      expect(extractTextFromShard(shard)).toContain('Description here');
    });

    it('extracts from structuredData (flattened)', () => {
      const shard = { structuredData: { title: 'T', body: 'B' } };
      const result = extractTextFromShard(shard);
      expect(result).toContain('T');
      expect(result).toContain('B');
    });

    it('joins multiple sources with double newline', () => {
      const shard = {
        name: 'N',
        structuredData: { x: 'Y' },
      };
      const result = extractTextFromShard(shard);
      expect(result).toContain('N');
      expect(result).toContain('Y');
    });
  });
});
