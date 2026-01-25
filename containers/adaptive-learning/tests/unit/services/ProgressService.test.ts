/**
 * Progress Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressService } from '../../../src/services/ProgressService';
import { getContainer } from '@coder/shared/database';
import { NotFoundError, BadRequestError } from '@coder/shared/utils/errors';

// Mock dependencies
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
          fetchAll: vi.fn(),
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

  describe('create', () => {
    it('should create progress record successfully', async () => {
      const input = {
        tenantId: 'tenant-123',
        userId: 'user-123',
        learningPathId: 'path-123',
        currentModuleId: 'module-123',
        progress: 50,
      };

      const mockProgress = {
        id: 'test-uuid-123',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContainer.items.create.mockResolvedValue({
        resource: mockProgress,
      });

      const result = await service.create(input);

      expect(result).toHaveProperty('id');
      expect(result.tenantId).toBe(input.tenantId);
      expect(result.userId).toBe(input.userId);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should throw BadRequestError if tenantId is missing', async () => {
      const input = {
        userId: 'user-123',
        learningPathId: 'path-123',
      } as any;

      await expect(service.create(input)).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if userId is missing', async () => {
      const input = {
        tenantId: 'tenant-123',
        learningPathId: 'path-123',
      } as any;

      await expect(service.create(input)).rejects.toThrow(BadRequestError);
    });
  });

  describe('getByUserId', () => {
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
        fetchAll: vi.fn().mockResolvedValue({
          resources: mockProgress,
        }),
      });

      const result = await service.getByUserId(tenantId, userId);

      expect(result).toEqual(mockProgress);
      expect(mockContainer.items.query).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update progress successfully', async () => {
      const tenantId = 'tenant-123';
      const progressId = 'progress-123';

      const existingProgress = {
        id: progressId,
        tenantId,
        userId: 'user-123',
        learningPathId: 'path-123',
        progress: 50,
      };

      const updateInput = {
        progress: 75,
        currentModuleId: 'module-456',
      };

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: existingProgress,
        }),
        replace: vi.fn().mockResolvedValue({
          resource: { ...existingProgress, ...updateInput },
        }),
      });

      const result = await service.update(tenantId, progressId, updateInput);

      expect(result.progress).toBe(updateInput.progress);
      expect(mockContainer.item().replace).toHaveBeenCalled();
    });

    it('should throw NotFoundError if progress does not exist', async () => {
      const tenantId = 'tenant-123';
      const progressId = 'progress-123';

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: null,
        }),
      });

      await expect(service.update(tenantId, progressId, { progress: 75 })).rejects.toThrow(NotFoundError);
    });
  });
});
