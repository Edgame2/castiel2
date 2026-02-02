/**
 * Unit tests for PatternMatcherService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { PatternService } from '../../../src/services/PatternService';
import { PatternMatcherService } from '../../../src/services/PatternMatcherService';
import { PatternType, PatternMatchSeverity } from '../../../src/types/pattern.types';

describe('PatternMatcherService', () => {
  let patternService: PatternService;
  let service: PatternMatcherService;

  beforeEach(() => {
    patternService = new PatternService();
    service = new PatternMatcherService(patternService);
  });

  describe('scanPatterns', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.scanPatterns({
          tenantId: '',
          userId: 'u1',
          target: { type: 'file', path: '/p' },
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when target.path is missing', async () => {
      await expect(
        service.scanPatterns({
          tenantId: 't1',
          userId: 'u1',
          target: { type: 'file', path: '' },
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('creates pattern scan and returns it', async () => {
      const mockCreate = vi.fn().mockImplementation((doc: any) =>
        Promise.resolve({ resource: { ...doc, id: doc.id || 'scan-id' } })
      );
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: mockCreate,
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined }),
            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
          })),
        },
        item: vi.fn((id: string, pk: string) => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id,
              tenantId: pk,
              status: 'pending',
              results: {
                totalMatches: 0,
                designPatterns: 0,
                antiPatterns: 0,
                codeStyle: 0,
                highSeverity: 0,
                mediumSeverity: 0,
                lowSeverity: 0,
              },
              createdAt: new Date(),
              createdBy: 'u1',
              target: { type: 'file', path: '/p' },
            },
          }),
          replace: vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc })),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.scanPatterns({
        tenantId: 't1',
        userId: 'u1',
        target: { type: 'file', path: '/app/src' },
      });

      expect(result.tenantId).toBe('t1');
      expect(result.target.path).toBe('/app/src');
      expect(result.status).toBe('pending');
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when scanId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('s1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns scan when found', async () => {
      const scan = {
        id: 's1',
        tenantId: 't1',
        status: 'completed' as const,
        results: {
          totalMatches: 0,
          designPatterns: 0,
          antiPatterns: 0,
          codeStyle: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0,
        },
        createdAt: new Date(),
        createdBy: 'u1',
        target: { type: 'file', path: '/p' },
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: scan }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('s1', 't1');

      expect(result).toEqual(scan);
    });

    it('throws NotFoundError when scan not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('s1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns scan', async () => {
      const existing = {
        id: 's1',
        tenantId: 't1',
        status: 'pending' as const,
        results: {
          totalMatches: 0,
          designPatterns: 0,
          antiPatterns: 0,
          codeStyle: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0,
        },
        createdAt: new Date(),
        createdBy: 'u1',
        target: { type: 'file', path: '/p' },
      };
      const mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: mockReplace,
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.updateStatus('s1', 't1', 'running');

      expect(mockReplace).toHaveBeenCalled();
      expect(result.status).toBe('running');
    });
  });

  describe('getMatches', () => {
    it('throws BadRequestError when scanId or tenantId is missing', async () => {
      await expect(service.getMatches('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getMatches('s1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns matches from query', async () => {
      const matches = [
        {
          id: 'm1',
          tenantId: 't1',
          scanId: 's1',
          patternId: 'p1',
          patternName: 'P1',
          patternType: PatternType.DESIGN_PATTERN,
          severity: PatternMatchSeverity.MEDIUM,
          isAntiPattern: false,
          confidence: 0.9,
          location: { file: '/p' },
          createdAt: new Date(),
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn(),
            fetchAll: vi.fn().mockResolvedValue({ resources: matches }),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const list = await service.getMatches('s1', 't1');

      expect(list).toHaveLength(1);
      expect(list[0].patternName).toBe('P1');
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const scans = [
        {
          id: 's1',
          tenantId: 't1',
          status: 'completed' as const,
          results: {
            totalMatches: 0,
            designPatterns: 0,
            antiPatterns: 0,
            codeStyle: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            lowSeverity: 0,
          },
          createdAt: new Date(),
          createdBy: 'u1',
          target: { type: 'file', path: '/p' },
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: scans, continuationToken: 'tok' }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.list('t1');

      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('tok');
    });
  });
});
