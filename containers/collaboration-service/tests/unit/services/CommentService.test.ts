/**
 * CommentService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentService } from '../../../src/services/CommentService';
import { MessageService } from '../../../src/services/MessageService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';

describe('CommentService', () => {
  let service: CommentService;
  let mockMessageGetById: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;

  const baseAddInput = {
    tenantId: 't1',
    userId: 'u1',
    conversationId: 'conv1',
    messageId: 'm1',
    content: 'A comment',
  };

  const messageWithComments = {
    id: 'm1',
    tenantId: 't1',
    comments: [] as { id: string; userId: string; content: string; createdAt: Date }[],
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessageGetById = vi.fn().mockResolvedValue({ ...messageWithComments });
    mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
    vi.mocked(getContainer).mockReturnValue({
      items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })) },
      item: vi.fn(() => ({ read: vi.fn(), replace: mockReplace, delete: vi.fn() })),
    } as unknown as ReturnType<typeof getContainer>);
    const messageService = { getById: mockMessageGetById } as unknown as MessageService;
    service = new CommentService(messageService);
  });

  describe('addComment', () => {
    it('throws BadRequestError when content is missing or empty', async () => {
      await expect(service.addComment({ ...baseAddInput, content: '' })).rejects.toThrow(BadRequestError);
      await expect(service.addComment({ ...baseAddInput, content: '   ' })).rejects.toThrow(BadRequestError);
    });
    it('adds comment and returns updated message', async () => {
      const updated = {
        ...messageWithComments,
        comments: [{ id: 'c1', userId: 'u1', content: 'A comment', createdAt: new Date() }],
        updatedAt: new Date(),
      };
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.addComment(baseAddInput);
      expect(result.comments).toHaveLength(1);
      expect(result.comments![0].content).toBe('A comment');
      expect(mockMessageGetById).toHaveBeenCalledWith('m1', 't1');
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('updateComment', () => {
    it('throws NotFoundError when comment not found', async () => {
      mockMessageGetById.mockResolvedValue({
        ...messageWithComments,
        comments: [{ id: 'other', userId: 'u2', content: 'x', createdAt: new Date() }],
      });
      await expect(
        service.updateComment('t1', 'conv1', 'm1', 'c1', 'u1', 'New')
      ).rejects.toThrow(NotFoundError);
    });
    it('throws BadRequestError when userId is not comment author', async () => {
      mockMessageGetById.mockResolvedValue({
        ...messageWithComments,
        comments: [{ id: 'c1', userId: 'u2', content: 'x', createdAt: new Date() }],
      });
      await expect(
        service.updateComment('t1', 'conv1', 'm1', 'c1', 'u1', 'New')
      ).rejects.toThrow(/Only the comment author/);
    });
    it('updates comment and returns message', async () => {
      const msg = {
        ...messageWithComments,
        comments: [{ id: 'c1', userId: 'u1', content: 'Old', createdAt: new Date() }],
      };
      const updated = {
        ...msg,
        comments: [{ id: 'c1', userId: 'u1', content: 'New', createdAt: new Date(), edited: true }],
        updatedAt: new Date(),
      };
      mockMessageGetById.mockResolvedValue(msg);
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.updateComment('t1', 'conv1', 'm1', 'c1', 'u1', 'New');
      expect(result.comments![0].content).toBe('New');
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('deleteComment', () => {
    it('throws NotFoundError when comment not found', async () => {
      mockMessageGetById.mockResolvedValue({
        ...messageWithComments,
        comments: [],
      });
      await expect(service.deleteComment('t1', 'm1', 'c1', 'u1')).rejects.toThrow(NotFoundError);
    });
    it('throws BadRequestError when userId is not comment author', async () => {
      mockMessageGetById.mockResolvedValue({
        ...messageWithComments,
        comments: [{ id: 'c1', userId: 'u2', content: 'x', createdAt: new Date() }],
      });
      await expect(service.deleteComment('t1', 'm1', 'c1', 'u1')).rejects.toThrow(/Only the comment author/);
    });
    it('removes comment and returns message', async () => {
      const msg = {
        ...messageWithComments,
        comments: [{ id: 'c1', userId: 'u1', content: 'x', createdAt: new Date() }],
      };
      const updated = { ...msg, comments: [], updatedAt: new Date() };
      mockMessageGetById.mockResolvedValue(msg);
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.deleteComment('t1', 'm1', 'c1', 'u1');
      expect(result.comments).toHaveLength(0);
      expect(mockReplace).toHaveBeenCalled();
    });
  });
});
