import { describe, it, expect } from 'vitest';
import { filterRagByAllowedIds } from '../rag-filter.util.js';
describe('filterRagByAllowedIds', () => {
    const mk = (id, score, shardId) => ({
        id,
        shardId: shardId ?? id,
        shardName: shardId ?? id,
        shardTypeId: 'c_document',
        content: 'x',
        chunkIndex: 0,
        score,
        tokenCount: 10,
    });
    it('keeps all linked and allows up to 20% unlinked, sorted by score', () => {
        const allowed = new Set(['p1', 'a', 'b']);
        const chunks = [
            mk('1', 0.9, 'a'), // linked
            mk('2', 0.8, 'x'), // unlinked
            mk('3', 0.7, 'b'), // linked
            mk('4', 0.95, 'p1'), // linked (project)
            mk('5', 0.6, 'y'), // unlinked
            mk('6', 0.85, 'z'), // unlinked
        ];
        // total=6 => 20% => 1.2 => floor=1 allowed unlinked
        const kept = filterRagByAllowedIds(chunks, allowed, 0.2);
        // Should contain all linked: a,b,p1 and top-1 unlinked by score (z 0.85)
        const ids = kept.map(c => c.shardId);
        expect(ids).toEqual(['p1', 'a', 'z', 'b']); // sorted by score desc
    });
    it('at least one unlinked kept when any unlinked exist', () => {
        const allowed = new Set(['p1']);
        const chunks = [mk('1', 0.6, 'u1'), mk('2', 0.7, 'u2')]; // both unlinked
        const kept = filterRagByAllowedIds(chunks, allowed, 0.2);
        expect(kept.length).toBe(1);
        expect(kept[0].shardId).toBe('u2');
    });
    it('keeps only linked when no unlinked exist', () => {
        const allowed = new Set(['a', 'b']);
        const chunks = [mk('1', 0.5, 'a'), mk('2', 0.4, 'b')];
        const kept = filterRagByAllowedIds(chunks, allowed, 0.2);
        expect(kept.length).toBe(2);
        expect(kept.map(c => c.shardId)).toEqual(['a', 'b']);
    });
    it('returns empty when no chunks', () => {
        expect(filterRagByAllowedIds([], new Set(), 0.2)).toEqual([]);
    });
});
//# sourceMappingURL=rag-filter.util.test.js.map