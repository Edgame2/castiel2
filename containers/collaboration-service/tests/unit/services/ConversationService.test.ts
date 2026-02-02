/**
 * ConversationService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationService } from '../../../src/services/ConversationService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ConversationStatus, ConversationVisibility, ParticipantRole } from '../../../src/types/collaboration.types';

describe('ConversationService', () => {
  let service: ConversationService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseCreateInput = {
    tenantId: 't1',
    userId: 'u1',
    title: 'Conv 1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn();
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn();
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchNext: mockFetchNext })),
      },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new ConversationService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId or userId is missing', async () => {
      await expect(service.create({ ...baseCreateInput, tenantId: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, userId: '' })).rejects.toThrow(BadRequestError);
    });
    it('creates conversation and returns resource', async () => {
      const created = {
        id: 'c1',
        tenantId: 't1',
        title: 'Conv 1',
        status: ConversationStatus.ACTIVE,
        participantCount: 1,
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.create(baseCreateInput);
      expect(result.tenantId).toBe('t1');
      expect(result.status).toBe(ConversationStatus.ACTIVE);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', title: 'Conv 1' }),
        { partitionKey: 't1' }
      );
    });
    it('throws BadRequestError on 409', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(baseCreateInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when conversationId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('c1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns conversation when found', async () => {
      const conv = { id: 'c1', tenantId: 't1', status: ConversationStatus.ACTIVE };
      mockRead.mockResolvedValue({ resource: conv });
      const result = await service.getById('c1', 't1');
      expect(result.id).toBe('c1');
    });
    it('throws NotFoundError when not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('c1', 't1')).rejects.toThrow(NotFoundError);
    });
    it('throws NotFoundError on 404', async () => {
      mockRead.mockRejectedValue({ code: 404 });
      await expect(service.getById('c1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns resource', async () => {
      const existing = { id: 'c1', tenantId: 't1', status: ConversationStatus.ACTIVE, updatedAt: new Date() };
      const updated = { ...existing, title: 'New', updatedAt: new Date() };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('c1', 't1', { title: 'New' });
      expect(result.title).toBe('New');
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('soft-deletes via update', async () => {
      const existing = { id: 'c1', tenantId: 't1', status: ConversationStatus.ACTIVE };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: { ...existing, status: ConversationStatus.DELETED } });
      await expect(service.delete('c1', 't1')).resolves.toBeUndefined();
      expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ status: ConversationStatus.DELETED }));
    });
  });

  describe('share', () => {
    it('throws when user has no permission', async () => {
      const existing = {
        id: 'c1',
        tenantId: 't1',
        participants: [{ userId: 'u1', role: ParticipantRole.VIEWER, joinedAt: new Date(), isActive: true }],
      };
      mockRead.mockResolvedValue({ resource: existing });
      await expect(
        service.share({ tenantId: 't1', userId: 'u1', conversationId: 'c1', userIds: ['u2'] })
      ).rejects.toThrow(/permission/);
    });
    it('adds participants and returns resource', async () => {
      const existing = {
        id: 'c1',
        tenantId: 't1',
        participants: [{ userId: 'u1', role: ParticipantRole.OWNER, joinedAt: new Date(), isActive: true }],
        participantCount: 1,
        visibility: ConversationVisibility.PRIVATE,
      };
      const updated = {
        ...existing,
        participants: [...existing.participants, { userId: 'u2', role: ParticipantRole.PARTICIPANT, joinedAt: new Date(), isActive: true }],
        participantCount: 2,
        visibility: ConversationVisibility.SHARED,
      };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.share({ tenantId: 't1', userId: 'u1', conversationId: 'c1', userIds: ['u2'] });
      expect(result.participantCount).toBe(2);
      expect(result.visibility).toBe(ConversationVisibility.SHARED);
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });
    it('returns items and continuationToken', async () => {
      const items = [{ id: 'c1', tenantId: 't1', status: ConversationStatus.ACTIVE }];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'tok' });
      const result = await service.list('t1', { limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('tok');
    });
  });
});
