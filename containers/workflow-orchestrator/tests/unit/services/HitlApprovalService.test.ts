/**
 * Unit tests for HitlApprovalService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as HitlApprovalService from '../../../src/services/HitlApprovalService';
import { getContainer } from '@coder/shared/database';
import * as config from '../../../src/config';
import * as WorkflowEventPublisher from '../../../src/events/publishers/WorkflowEventPublisher';
import { log } from '../../../src/utils/logger';

const mockRead = vi.fn();
const mockCreate = vi.fn().mockResolvedValue(undefined);
const mockUpsert = vi.fn().mockResolvedValue(undefined);

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'fixed-approval-uuid'),
}));

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../../src/events/publishers/WorkflowEventPublisher', () => ({
  publishHitlApprovalCompleted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockLoadConfig = vi.mocked(config).loadConfig;
const mockGetContainer = vi.mocked(getContainer);

describe('HitlApprovalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue({
      cosmos_db: { containers: { hitl_approvals: 'hitl_approvals' } },
    } as any);
    mockRead.mockResolvedValue({ resource: null });
    mockGetContainer.mockReturnValue({
      items: { create: mockCreate, upsert: mockUpsert },
      item: vi.fn(() => ({ read: mockRead })),
    } as any);
  });

  describe('createFromEvent', () => {
    it('creates approval doc and calls container.items.create', async () => {
      const result = await HitlApprovalService.createFromEvent('tenant-1', {
        opportunityId: 'opp-1',
        riskScore: 0.8,
        amount: 10000,
        requestedAt: '2025-01-01T00:00:00.000Z',
      });

      expect(result.id).toBe('fixed-approval-uuid');
      expect(result.tenantId).toBe('tenant-1');
      expect(result.opportunityId).toBe('opp-1');
      expect(result.riskScore).toBe(0.8);
      expect(result.amount).toBe(10000);
      expect(result.status).toBe('pending');
      expect(mockGetContainer).toHaveBeenCalledWith('hitl_approvals');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'fixed-approval-uuid',
          tenantId: 'tenant-1',
          opportunityId: 'opp-1',
          status: 'pending',
        }),
        expect.any(Object)
      );
      expect(log.info).toHaveBeenCalledWith(
        'HITL approval created',
        expect.objectContaining({ approvalId: 'fixed-approval-uuid', opportunityId: 'opp-1', tenantId: 'tenant-1', service: 'workflow-orchestrator' })
      );
    });
  });

  describe('getById', () => {
    it('returns null when resource is not found', async () => {
      mockRead.mockResolvedValueOnce({ resource: null });

      const result = await HitlApprovalService.getById('id-1', 'tenant-1');

      expect(result).toBeNull();
      expect(mockGetContainer).toHaveBeenCalledWith('hitl_approvals');
    });

    it('returns approval when resource exists', async () => {
      const doc = {
        id: 'id-1',
        tenantId: 'tenant-1',
        opportunityId: 'opp-1',
        riskScore: 0.5,
        amount: 5000,
        requestedAt: '2025-01-01T00:00:00.000Z',
        status: 'pending' as const,
      };
      mockRead.mockResolvedValueOnce({ resource: doc });

      const result = await HitlApprovalService.getById('id-1', 'tenant-1');

      expect(result).toEqual(doc);
    });
  });

  describe('approve', () => {
    it('throws 404 when approval not found', async () => {
      mockRead.mockResolvedValueOnce({ resource: null });

      await expect(HitlApprovalService.approve('id-1', 'tenant-1', { decidedBy: 'u1' })).rejects.toMatchObject({
        message: 'HITL approval not found',
        statusCode: 404,
      });
    });

    it('throws 409 when approval is not pending', async () => {
      mockRead.mockResolvedValueOnce({
        resource: {
          id: 'id-1',
          tenantId: 'tenant-1',
          opportunityId: 'opp-1',
          riskScore: 0.5,
          amount: 5000,
          requestedAt: '2025-01-01T00:00:00.000Z',
          status: 'approved',
        },
      });

      await expect(HitlApprovalService.approve('id-1', 'tenant-1', { decidedBy: 'u1' })).rejects.toMatchObject({
        message: expect.stringContaining('not pending'),
        statusCode: 409,
      });
    });

    it('updates status to approved, upserts, publishes and returns updated doc', async () => {
      const pendingDoc = {
        id: 'id-1',
        tenantId: 'tenant-1',
        opportunityId: 'opp-1',
        riskScore: 0.5,
        amount: 5000,
        requestedAt: '2025-01-01T00:00:00.000Z',
        status: 'pending' as const,
      };
      mockRead.mockResolvedValueOnce({ resource: pendingDoc });

      const result = await HitlApprovalService.approve('id-1', 'tenant-1', { decidedBy: 'user-1', comment: 'OK' });

      expect(result.status).toBe('approved');
      expect(result.decidedBy).toBe('user-1');
      expect(result.comment).toBe('OK');
      expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved', decidedBy: 'user-1' }));
      expect(WorkflowEventPublisher.publishHitlApprovalCompleted).toHaveBeenCalledWith('tenant-1', {
        opportunityId: 'opp-1',
        approvalId: 'id-1',
        approved: true,
        decidedBy: 'user-1',
        decidedAt: expect.any(String),
      });
      expect(log.info).toHaveBeenCalledWith(
        'HITL approval approved',
        expect.objectContaining({ approvalId: 'id-1', opportunityId: 'opp-1', tenantId: 'tenant-1', service: 'workflow-orchestrator' })
      );
    });
  });

  describe('reject', () => {
    it('throws 404 when approval not found', async () => {
      mockRead.mockResolvedValueOnce({ resource: null });

      await expect(HitlApprovalService.reject('id-1', 'tenant-1', { decidedBy: 'u1' })).rejects.toMatchObject({
        message: 'HITL approval not found',
        statusCode: 404,
      });
    });

    it('throws 409 when approval is not pending', async () => {
      mockRead.mockResolvedValueOnce({
        resource: {
          id: 'id-1',
          tenantId: 'tenant-1',
          opportunityId: 'opp-1',
          riskScore: 0.5,
          amount: 5000,
          requestedAt: '2025-01-01T00:00:00.000Z',
          status: 'rejected',
        },
      });

      await expect(HitlApprovalService.reject('id-1', 'tenant-1', { decidedBy: 'u1' })).rejects.toMatchObject({
        message: expect.stringContaining('not pending'),
        statusCode: 409,
      });
    });

    it('updates status to rejected, upserts, publishes and returns updated doc', async () => {
      const pendingDoc = {
        id: 'id-1',
        tenantId: 'tenant-1',
        opportunityId: 'opp-1',
        riskScore: 0.5,
        amount: 5000,
        requestedAt: '2025-01-01T00:00:00.000Z',
        status: 'pending' as const,
      };
      mockRead.mockResolvedValueOnce({ resource: pendingDoc });

      const result = await HitlApprovalService.reject('id-1', 'tenant-1', { decidedBy: 'user-1', comment: 'No' });

      expect(result.status).toBe('rejected');
      expect(result.decidedBy).toBe('user-1');
      expect(result.comment).toBe('No');
      expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected', decidedBy: 'user-1' }));
      expect(WorkflowEventPublisher.publishHitlApprovalCompleted).toHaveBeenCalledWith('tenant-1', {
        opportunityId: 'opp-1',
        approvalId: 'id-1',
        approved: false,
        decidedBy: 'user-1',
        decidedAt: expect.any(String),
      });
      expect(log.info).toHaveBeenCalledWith(
        'HITL approval rejected',
        expect.objectContaining({ approvalId: 'id-1', opportunityId: 'opp-1', tenantId: 'tenant-1', service: 'workflow-orchestrator' })
      );
    });
  });
});
