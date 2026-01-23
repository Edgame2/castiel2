import { describe, it, expect } from 'vitest';
import { applyTokenBudget } from '../token-budget.util.js';

describe('applyTokenBudget', () => {
  const primary = { tokenCount: 200 };

  it('keeps within budget by trimming RAG first by lowest score', () => {
    const related = [{ tokenCount: 300 }, { tokenCount: 300 }];
    const rag = [
      { tokenCount: 400, score: 0.9 },
      { tokenCount: 400, score: 0.6 },
      { tokenCount: 200, score: 0.8 },
    ];
    // total = 200 + 600 + 1000 = 1800; budget = 1200 → need to remove 600
    const { related: r2, ragChunks: rag2 } = applyTokenBudget(primary, related, rag, 1200);
    // Expect to drop lowest-score RAG first: remove 0.6 (400), still need 200 -> remove next lowest (0.8, 200)
    expect(rag2.length).toBe(1);
    expect(rag2[0].score).toBe(0.9);
    // Related untouched
    expect(r2.length).toBe(2);
  });

  it('trims related when RAG is empty or insufficient to meet budget', () => {
    const related = [{ tokenCount: 500 }, { tokenCount: 500 }, { tokenCount: 500 }];
    const rag: any[] = [];
    // total = 200 + 1500 = 1700; budget = 900 → remove 800 from related -> two pops
    const { related: r2, ragChunks: rag2 } = applyTokenBudget(primary, related, rag, 900);
    expect(rag2.length).toBe(0);
    expect(r2.length).toBe(1);
    expect(r2[0].tokenCount).toBe(500);
  });

  it('does nothing when already within budget', () => {
    const related = [{ tokenCount: 100 }];
    const rag = [{ tokenCount: 100, score: 0.9 }];
    const { related: r2, ragChunks: rag2 } = applyTokenBudget(primary, related, rag, 1000);
    expect(r2.length).toBe(1);
    expect(rag2.length).toBe(1);
  });
});
