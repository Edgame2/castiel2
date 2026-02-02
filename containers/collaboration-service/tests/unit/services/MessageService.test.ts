/**
 * MessageService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageService } from '../../../src/services/MessageService';
import { ConversationService } from '../../../src/services/ConversationService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { MessageRole, MessageStatus } from '../../../src/types/collaboration.types';

describe('MessageService', () => {
  let service: MessageService;
  let mockConversationGetById: ReturnType<typeof vi.fn>;
  let mockConversationUpdate: ReturnType<typeof vi.fn>;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseCreateInput = {
    tenantId: 't1',
    userId: 'u1',
    conversationId: 'conv1',
    content: 'Hello',
  };

  const conversationWithParticipant = {
    id: 'conv1',
    tenantId: 't1',
    participants: [
      { userId: 'u1', role: 'participant' as const, joinedAt: new Date(), isActive: true },
    ],
    messageCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConversationGetById = vi.fn().mockResolvedValue(conversationWithParticipant);
    mockConversationUpdate = vi.fn().mockResolvedValue({});
    mockCreate = vi.fn();
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn();
    mockDelete = vi.fn().mockResolvedValue(undefined);
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: mockFetchNext })) },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: mockDelete })),
    } as unknown as ReturnType<typeof getContainer>);
    const conversationService = {
      getById: mockConversationGetById,
      update: mockConversationUpdate,
    } as unknown as ConversationService;
    service = new MessageService(conversationService);
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId, conversationId, or content is missing', async () => {
      await expect(service.create({ ...baseCreateInput, tenantId: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, conversationId: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, content: '' })).rejects.toThrow(BadRequestError);
    });
    it('throws when user is not a participant', async () => {
      mockConversationGetById.mockResolvedValue({
        ...conversationWithParticipant,
        participants: [{ userId: 'other', role: 'participant', joinedAt: new Date(), isActive: true }],
      });
      await expect(service.create(baseCreateInput)).rejects.toThrow(/not a participant/);
    });
    it('creates message and updates conversation count', async () => {
      const created = {
        id: 'm1',
        tenantId: 't1',
        conversationId: 'conv1',
        content: 'Hello',
        status: MessageStatus.COMPLETE,
        role: MessageRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.create(baseCreateInput);
      expect(result.content).toBe('Hello');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', conversationId: 'conv1', content: 'Hello' }),
        { partitionKey: 't1' }
      );
      expect(mockConversationUpdate).toHaveBeenCalledWith('conv1', 't1', { messageCount: 1 });
    });
    it('throws BadRequestError on 409', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(baseCreateInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when messageId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('m1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns message when found', async () => {
      const msg = { id: 'm1', tenantId: 't1', content: 'Hi' };
      mockRead.mockResolvedValue({ resource: msg });
      const result = await service.getById('m1', 't1');
      expect(result.id).toBe('m1');
    });
    it('throws NotFoundError when not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('m1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns resource', async () => {
      const existing = { id: 'm1', tenantId: 't1', userId: 'u1', content: 'Old', updatedAt: new Date() };
      const updated = { ...existing, content: 'New', updatedAt: new Date() };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('m1', 't1', { content: 'New', userId: 'u1' } as any);
      expect(result.content).toBe('New');
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes when message exists', async () => {
      mockRead.mockResolvedValue({ resource: { id: 'm1', tenantId: 't1' } });
      await expect(service.delete('m1', 't1')).resolves.toBeUndefined();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId or conversationId is missing', async () => {
      await expect(service.list('', 'conv1')).rejects.toThrow(BadRequestError);
      await expect(service.list('t1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns items and continuationToken', async () => {
      const items = [{ id: 'm1', tenantId: 't1', conversationId: 'conv1', content: 'Hi' }];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'tok' });
      const result = await service.list('t1', 'conv1', { limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('tok');
    });
  });
});
