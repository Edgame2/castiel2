/**
 * Progress Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressService } from '../../../src/services/ProgressService';
import { getContainer } from '@coder/shared/database';
import { NotFoundError, BadRequestError } from '@coder/shared/utils/errors';

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));

describe('ProgressService', () => {
  let service: ProgressService;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
        })),
      },
      item: vi.fn(() => ({
        read: vi.fn(),
        replace: vi.fn(),
      })),
    };

    (getContainer as any).mockReturnValue(mockContainer);

    service = new ProgressService();
  });

  describe('getOrCreate', () => {
    it('should create progress record when none exists', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const input = { learningPathId: 'path-123' };

      mockContainer.items.query.mockReturnValue({
        fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
      });
      const mockProgress = {
        id: 'test-uuid-123',
        tenantId,
        userId,
        learningPathId: 'path-123',
        status: 'not_started',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockContainer.items.create.mockResolvedValue({
        resource: mockProgress,
      });

      const result = await service.getOrCreate(tenantId, userId, input);

      expect(result).toHaveProperty('id');
      expect(result.tenantId).toBe(tenantId);
      expect(result.userId).toBe(userId);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should throw BadRequestError if tenantId is missing', async () => {
      await expect(service.getOrCreate('', 'user-123', {})).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if userId is missing', async () => {
      await expect(service.getOrCreate('tenant-123', '', {})).rejects.toThrow(BadRequestError);
    });
  });

  describe('find', () => {
    it('should retrieve progress for a user', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const mockProgress = [
        {
          id: 'progress-1',
          tenantId,
          userId,
          learningPathId: 'path-123',
          progress: 50,
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchNext: vi.fn().mockResolvedValue({
          resources: mockProgress,
        }),
      });

      const result = await service.find(tenantId, userId, {});

      expect(result).toEqual(mockProgress[0]);
      expect(mockContainer.items.query).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update progress successfully', async () => {
      const progressId = 'progress-123';
      const tenantId = 'tenant-123';
      const existingProgress = {
        id: progressId,
        tenantId,
        userId: 'user-123',
        learningPathId: 'path-123',
        progress: 50,
      };
      const updateInput = { progress: 75 };

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: existingProgress,
        }),
        replace: vi.fn().mockResolvedValue({
          resource: { ...existingProgress, ...updateInput },
        }),
      });

      const result = await service.update(progressId, tenantId, updateInput);

      expect(result.progress).toBe(updateInput.progress);
      expect(mockContainer.item(progressId, tenantId).replace).toHaveBeenCalled();
    });

    it('should throw NotFoundError if progress does not exist', async () => {
      const progressId = 'progress-123';
      const tenantId = 'tenant-123';

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: null,
        }),
      });

      await expect(service.update(progressId, tenantId, { progress: 75 })).rejects.toThrow(NotFoundError);
    });
  });
});
