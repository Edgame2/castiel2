/**
 * Learning Path Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LearningPathService } from '../../../src/services/LearningPathService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { LearningPathStatus } from '../../../src/types/learning.types';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));

describe('LearningPathService', () => {
  let service: LearningPathService;
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
        delete: vi.fn(),
      })),
    };

    (getContainer as any).mockReturnValue(mockContainer);

    service = new LearningPathService();
  });

  describe('create', () => {
    it('should create a learning path successfully', async () => {
      const input = {
        tenantId: 'tenant-123',
        name: 'Test Learning Path',
        description: 'Test description',
        category: 'programming',
        modules: [
          {
            name: 'Module 1',
            description: 'Module description',
            content: 'Module content',
            order: 1,
          },
        ],
      };

      const mockLearningPath = {
        id: 'test-uuid-123',
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        category: input.category,
        status: LearningPathStatus.DRAFT,
        modules: [
          {
            id: 'test-uuid-123',
            name: 'Module 1',
            description: 'Module description',
            content: 'Module content',
            order: 1,
            skills: [],
            resources: [],
            assessments: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContainer.items.create.mockResolvedValue({
        resource: mockLearningPath,
      });

      const result = await service.create(input);

      expect(result).toHaveProperty('id');
      expect(result.tenantId).toBe(input.tenantId);
      expect(result.name).toBe(input.name);
      expect(result.status).toBe(LearningPathStatus.DRAFT);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should throw BadRequestError if tenantId is missing', async () => {
      const input = {
        name: 'Test Learning Path',
      } as any;

      await expect(service.create(input)).rejects.toThrow(BadRequestError);
      expect(mockContainer.items.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if name is missing', async () => {
      const input = {
        tenantId: 'tenant-123',
      } as any;

      await expect(service.create(input)).rejects.toThrow(BadRequestError);
      expect(mockContainer.items.create).not.toHaveBeenCalled();
    });

    it('should generate IDs for modules', async () => {
      const input = {
        tenantId: 'tenant-123',
        name: 'Test Learning Path',
        modules: [
          { name: 'Module 1', description: 'Desc 1' },
          { name: 'Module 2', description: 'Desc 2' },
        ],
      };

      mockContainer.items.create.mockResolvedValue({
        resource: { id: 'test-uuid-123', ...input },
      });

      const result = await service.create(input);

      expect(result.modules).toHaveLength(2);
      expect(result.modules[0]).toHaveProperty('id');
      expect(result.modules[1]).toHaveProperty('id');
    });
  });

  describe('getById', () => {
    it('should retrieve a learning path by ID', async () => {
      const tenantId = 'tenant-123';
      const pathId = 'path-123';

      const mockLearningPath = {
        id: pathId,
        tenantId,
        name: 'Test Path',
        status: LearningPathStatus.ACTIVE,
      };

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: mockLearningPath,
        }),
      });

      const result = await service.getById(tenantId, pathId);

      expect(result).toEqual(mockLearningPath);
      expect(mockContainer.item).toHaveBeenCalledWith(pathId);
    });

    it('should throw NotFoundError if learning path does not exist', async () => {
      const tenantId = 'tenant-123';
      const pathId = 'path-123';

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: null,
        }),
      });

      await expect(service.getById(tenantId, pathId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should list learning paths for a tenant', async () => {
      const tenantId = 'tenant-123';

      const mockPaths = [
        { id: 'path-1', tenantId, name: 'Path 1' },
        { id: 'path-2', tenantId, name: 'Path 2' },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: mockPaths,
        }),
      });

      const result = await service.list(tenantId);

      expect(result).toEqual(mockPaths);
      expect(mockContainer.items.query).toHaveBeenCalled();
    });

    it('should filter by status if provided', async () => {
      const tenantId = 'tenant-123';
      const status = LearningPathStatus.ACTIVE;

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [],
        }),
      });

      await service.list(tenantId, { status });

      expect(mockContainer.items.query).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a learning path successfully', async () => {
      const tenantId = 'tenant-123';
      const pathId = 'path-123';

      const existingPath = {
        id: pathId,
        tenantId,
        name: 'Original Name',
        status: LearningPathStatus.DRAFT,
      };

      const updateInput = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: existingPath,
        }),
        replace: vi.fn().mockResolvedValue({
          resource: { ...existingPath, ...updateInput },
        }),
      });

      const result = await service.update(tenantId, pathId, updateInput);

      expect(result.name).toBe(updateInput.name);
      expect(mockContainer.item().replace).toHaveBeenCalled();
    });

    it('should throw NotFoundError if learning path does not exist', async () => {
      const tenantId = 'tenant-123';
      const pathId = 'path-123';

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: null,
        }),
      });

      await expect(service.update(tenantId, pathId, { name: 'New Name' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete a learning path successfully', async () => {
      const tenantId = 'tenant-123';
      const pathId = 'path-123';

      const existingPath = {
        id: pathId,
        tenantId,
        name: 'Test Path',
      };

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: existingPath,
        }),
        delete: vi.fn().mockResolvedValue(undefined),
      });

      await service.delete(tenantId, pathId);

      expect(mockContainer.item().delete).toHaveBeenCalled();
    });

    it('should throw NotFoundError if learning path does not exist', async () => {
      const tenantId = 'tenant-123';
      const pathId = 'path-123';

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: null,
        }),
      });

      await expect(service.delete(tenantId, pathId)).rejects.toThrow(NotFoundError);
    });
  });
});
