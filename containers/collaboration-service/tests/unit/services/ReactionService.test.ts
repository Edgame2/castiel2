/**
 * ReactionService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactionService } from '../../../src/services/ReactionService';
import { MessageService } from '../../../src/services/MessageService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError } from '@coder/shared/utils/errors';

describe('ReactionService', () => {
  let service: ReactionService;
  let mockMessageGetById: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;

  const baseAddInput = {
    tenantId: 't1',
    userId: 'u1',
    conversationId: 'conv1',
    messageId: 'm1',
    emoji: '👍',
  };

  const messageWithReactions = {
    id: 'm1',
    tenantId: 't1',
    reactions: [] as { id: string; userId: string; emoji: string; createdAt: Date }[],
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessageGetById = vi.fn().mockResolvedValue({ ...messageWithReactions });
    mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
    vi.mocked(getContainer).mockReturnValue({
      items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })) },
      item: vi.fn(() => ({ read: vi.fn(), replace: mockReplace, delete: vi.fn() })),
    } as unknown as ReturnType<typeof getContainer>);
    const messageService = { getById: mockMessageGetById } as unknown as MessageService;
    service = new ReactionService(messageService);
  });

  describe('addReaction', () => {
    it('throws BadRequestError when emoji is missing', async () => {
      await expect(service.addReaction({ ...baseAddInput, emoji: '' })).rejects.toThrow(BadRequestError);
    });
    it('throws BadRequestError when user already reacted with same emoji', async () => {
      mockMessageGetById.mockResolvedValue({
        ...messageWithReactions,
        reactions: [{ id: 'r1', userId: 'u1', emoji: '👍', createdAt: new Date() }],
      });
      await expect(service.addReaction(baseAddInput)).rejects.toThrow(/already reacted/);
    });
    it('adds reaction and returns updated message', async () => {
      const updated = {
        ...messageWithReactions,
        reactions: [{ id: 'r1', userId: 'u1', emoji: '👍', createdAt: new Date() }],
        updatedAt: new Date(),
      };
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.addReaction(baseAddInput);
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions![0].emoji).toBe('👍');
      expect(mockMessageGetById).toHaveBeenCalledWith('m1', 't1');
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('removeReaction', () => {
    it('removes reaction and returns message', async () => {
      const msg = {
        ...messageWithReactions,
        reactions: [{ id: 'r1', userId: 'u1', emoji: '👍', createdAt: new Date() }],
      };
      const updated = { ...msg, reactions: [], updatedAt: new Date() };
      mockMessageGetById.mockResolvedValue(msg);
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.removeReaction('t1', 'm1', 'r1', 'u1');
      expect(result.reactions).toHaveLength(0);
      expect(mockReplace).toHaveBeenCalled();
    });
  });
});
