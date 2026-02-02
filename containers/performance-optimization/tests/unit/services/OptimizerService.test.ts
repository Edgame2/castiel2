/**
 * Unit tests for OptimizerService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestError } from '@coder/shared/utils/errors';
import { OptimizationService } from '../../../src/services/OptimizationService';
import { OptimizerService } from '../../../src/services/OptimizerService';
import {
  OptimizationStatus,
  OptimizationType,
} from '../../../src/types/optimization.types';

describe('OptimizerService', () => {
  let optimizationService: OptimizationService;
  let service: OptimizerService;

  beforeEach(() => {
    optimizationService = new OptimizationService();
    service = new OptimizerService(optimizationService);
  });

  describe('runOptimization', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.runOptimization({
          tenantId: '',
          userId: 'u1',
          optimizationId: 'o1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when optimizationId is missing', async () => {
      await expect(
        service.runOptimization({
          tenantId: 't1',
          userId: 'u1',
          optimizationId: '',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when optimization is already OPTIMIZING', async () => {
      vi.spyOn(optimizationService, 'getById').mockResolvedValue({
        id: 'o1',
        tenantId: 't1',
        type: OptimizationType.CODE,
        status: OptimizationStatus.OPTIMIZING,
        target: { type: 'file', path: '/p' },
        baseline: { metrics: {}, measuredAt: new Date() },
        priority: 'medium' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      } as any);

      await expect(
        service.runOptimization({
          tenantId: 't1',
          userId: 'u1',
          optimizationId: 'o1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when optimization is already ANALYZING', async () => {
      vi.spyOn(optimizationService, 'getById').mockResolvedValue({
        id: 'o1',
        tenantId: 't1',
        type: OptimizationType.CODE,
        status: OptimizationStatus.ANALYZING,
        target: { type: 'file', path: '/p' },
        baseline: { metrics: {}, measuredAt: new Date() },
        priority: 'medium' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      } as any);

      await expect(
        service.runOptimization({
          tenantId: 't1',
          userId: 'u1',
          optimizationId: 'o1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when optimization is already COMPLETED', async () => {
      vi.spyOn(optimizationService, 'getById').mockResolvedValue({
        id: 'o1',
        tenantId: 't1',
        type: OptimizationType.CODE,
        status: OptimizationStatus.COMPLETED,
        target: { type: 'file', path: '/p' },
        baseline: { metrics: {}, measuredAt: new Date() },
        priority: 'medium' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      } as any);

      await expect(
        service.runOptimization({
          tenantId: 't1',
          userId: 'u1',
          optimizationId: 'o1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('updates status to ANALYZING and returns updated optimization', async () => {
      const pendingOpt = {
        id: 'o1',
        tenantId: 't1',
        type: OptimizationType.CODE,
        status: OptimizationStatus.PENDING,
        target: { type: 'file', path: '/p' },
        baseline: { metrics: {}, measuredAt: new Date() },
        priority: 'medium' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      } as any;
      const analyzingOpt = { ...pendingOpt, status: OptimizationStatus.ANALYZING };

      vi.spyOn(optimizationService, 'getById').mockResolvedValue(pendingOpt);
      vi.spyOn(optimizationService, 'update').mockResolvedValue(analyzingOpt);

      const result = await service.runOptimization({
        tenantId: 't1',
        userId: 'u1',
        optimizationId: 'o1',
      });

      expect(optimizationService.update).toHaveBeenCalledWith(
        'o1',
        't1',
        expect.objectContaining({ status: OptimizationStatus.ANALYZING })
      );
      expect(result.status).toBe(OptimizationStatus.ANALYZING);
    });
  });
});
