/**
 * DashboardService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { DashboardService } from '../../../src/services/DashboardService';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockFindMany: ReturnType<typeof vi.fn>;
  let mockFindUnique: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockContainerCreate: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;
  let mockItemReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn();
    mockFindMany = vi.fn().mockResolvedValue([]);
    mockFindUnique = vi.fn().mockResolvedValue(null);
    mockUpdate = vi.fn();
    mockDelete = vi.fn();
    mockContainerCreate = vi.fn();
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    mockItemReplace = vi.fn();
    vi.mocked(getDatabaseClient).mockReturnValue({
      dashboard_dashboards: {
        create: mockCreate,
        findMany: mockFindMany,
        findUnique: mockFindUnique,
        update: mockUpdate,
        delete: mockDelete,
      },
    });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockContainerCreate,
        query: vi.fn(() => ({ fetchNext: mockFetchNext })),
      },
      item: vi.fn(() => ({ replace: mockItemReplace })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new DashboardService();
  });

  describe('createDashboard', () => {
    it('creates dashboard and returns result', async () => {
      const created = { id: 'd1', name: 'My Dashboard', config: {}, tenantId: 't1' };
      mockCreate.mockResolvedValue(created);
      const result = await service.createDashboard({
        name: 'My Dashboard',
        config: {},
        tenantId: 't1',
      });
      expect(result).toEqual(created);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: 'My Dashboard',
          config: {},
          tenantId: 't1',
        },
      });
    });
  });

  describe('listDashboards', () => {
    it('returns dashboards with optional tenantId filter', async () => {
      const dashboards = [{ id: 'd1', name: 'D1', tenantId: 't1' }];
      mockFindMany.mockResolvedValue(dashboards);
      const result = await service.listDashboards({ tenantId: 't1' });
      expect(result).toEqual(dashboards);
      expect(mockFindMany).toHaveBeenCalledWith({ where: { tenantId: 't1' } });
    });

    it('returns all dashboards when no filter', async () => {
      mockFindMany.mockResolvedValue([]);
      await service.listDashboards({});
      expect(mockFindMany).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('getDashboard', () => {
    it('returns dashboard when found', async () => {
      const dashboard = { id: 'd1', name: 'D1' };
      mockFindUnique.mockResolvedValue(dashboard);
      const result = await service.getDashboard('d1');
      expect(result).toEqual(dashboard);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });

    it('returns null when not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      const result = await service.getDashboard('d1');
      expect(result).toBeNull();
    });
  });

  describe('updateDashboard', () => {
    it('updates dashboard and returns result', async () => {
      const existing = { id: 'd1', name: 'Old' };
      const updated = { id: 'd1', name: 'New' };
      mockFindUnique.mockResolvedValue(existing);
      mockUpdate.mockResolvedValue(updated);
      const result = await service.updateDashboard('d1', { name: 'New' });
      expect(result).toEqual(updated);
      expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { name: 'New' } });
    });

    it('throws NotFoundError when dashboard not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(service.updateDashboard('d1', { name: 'New' })).rejects.toThrow(/Dashboard.*not found/);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('deleteDashboard', () => {
    it('deletes dashboard when found', async () => {
      mockFindUnique.mockResolvedValue({ id: 'd1', name: 'D1' });
      mockDelete.mockResolvedValue(undefined);
      await service.deleteDashboard('d1');
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'd1' } });
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });

    it('throws NotFoundError when dashboard not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(service.deleteDashboard('d1')).rejects.toThrow(/Dashboard.*not found/);
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('recordView', () => {
    it('creates new analytics record when none exists', async () => {
      mockFetchNext.mockResolvedValue({ resources: [] });
      mockContainerCreate.mockResolvedValue(undefined);
      await service.recordView('tenant1', 'dashboard1', 'widget1');
      expect(mockFetchNext).toHaveBeenCalled();
      expect(mockContainerCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant1',
          dashboardId: 'dashboard1',
          widgetId: 'widget1',
          viewCount: 1,
        }),
        { partitionKey: 'tenant1' }
      );
    });

    it('updates existing analytics record', async () => {
      const existing = {
        id: 'a1',
        tenantId: 'tenant1',
        dashboardId: 'dashboard1',
        widgetId: 'widget1',
        viewCount: 5,
        lastViewed: new Date(),
        averageLoadTime: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockFetchNext.mockResolvedValue({ resources: [existing] });
      mockItemReplace.mockResolvedValue(undefined);
      await service.recordView('tenant1', 'dashboard1', 'widget1');
      expect(mockItemReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          viewCount: 6,
          tenantId: 'tenant1',
        })
      );
    });

    it('throws on failure', async () => {
      mockFetchNext.mockRejectedValue(new Error('db error'));
      await expect(service.recordView('t1', 'd1')).rejects.toThrow(
        /Failed to record dashboard view/
      );
    });
  });

  describe('getWidgetCache', () => {
    it('returns cache when found', async () => {
      const cache = {
        id: 'c1',
        tenantId: 't1',
        widgetId: 'w1',
        data: { x: 1 },
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      mockFetchNext.mockResolvedValue({ resources: [cache] });
      const result = await service.getWidgetCache('t1', 'w1');
      expect(result).toEqual(cache);
    });

    it('returns null when not found', async () => {
      mockFetchNext.mockResolvedValue({ resources: [] });
      const result = await service.getWidgetCache('t1', 'w1');
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockFetchNext.mockRejectedValue(new Error('db error'));
      const result = await service.getWidgetCache('t1', 'w1');
      expect(result).toBeNull();
    });
  });

  describe('setWidgetCache', () => {
    it('creates cache entry', async () => {
      mockContainerCreate.mockResolvedValue(undefined);
      await service.setWidgetCache('t1', 'w1', { data: 1 }, 60);
      expect(mockContainerCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          widgetId: 'w1',
          data: { data: 1 },
        }),
        { partitionKey: 't1' }
      );
      const call = mockContainerCreate.mock.calls[0][0];
      expect(call.expiresAt).toBeInstanceOf(Date);
      expect(call.createdAt).toBeInstanceOf(Date);
    });

    it('throws on failure', async () => {
      mockContainerCreate.mockRejectedValue(new Error('db error'));
      await expect(service.setWidgetCache('t1', 'w1', {}, 60)).rejects.toThrow(
        /Failed to set widget cache/
      );
    });
  });
});
