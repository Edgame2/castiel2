/**
 * Unit tests for RemediationWorkflowService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as RemediationWorkflowService from '../../../src/services/RemediationWorkflowService';
import { getContainer } from '@coder/shared';

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return { ...actual, getContainer: vi.fn() };
});

vi.mock('../../../src/events/publishers/RecommendationEventPublisher', () => ({
  publishRemediationWorkflowCreated: vi.fn().mockResolvedValue(undefined),
  publishRemediationStepCompleted: vi.fn().mockResolvedValue(undefined),
  publishRemediationWorkflowCompleted: vi.fn().mockResolvedValue(undefined),
}));

const mockGetContainer = vi.mocked(getContainer);

describe('RemediationWorkflowService', () => {
  const tenantId = 'tenant-1';
  const workflowId = 'wf-1';

  beforeEach(() => {
    vi.clearAllMocks();
    const mockItem = {
      read: vi.fn().mockResolvedValue({ resource: null }),
      replace: vi.fn(),
    };
    const mockItems = {
      create: vi.fn(),
      query: vi.fn().mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      }),
      upsert: vi.fn().mockResolvedValue(undefined),
    };
    mockGetContainer.mockReturnValue({
      items: mockItems,
      item: vi.fn(() => mockItem),
    } as any);
  });

  describe('createWorkflow', () => {
    it('throws when steps is empty', async () => {
      await expect(
        RemediationWorkflowService.createWorkflow(tenantId, {
          opportunityId: 'opp-1',
          riskId: 'risk-1',
          steps: [],
        })
      ).rejects.toThrow(/at least one step/i);
    });

    it('creates workflow and persists', async () => {
      const input = {
        opportunityId: 'opp-1',
        riskId: 'risk-1',
        steps: [{ actionId: 'act_1', description: 'Step 1', estimatedEffort: 'low' as const }],
      };
      const result = await RemediationWorkflowService.createWorkflow(tenantId, input);
      expect(result.tenantId).toBe(tenantId);
      expect(result.opportunityId).toBe(input.opportunityId);
      expect(result.status).toBe('in_progress');
      expect(result.steps).toHaveLength(1);
      expect(mockGetContainer().items.create).toHaveBeenCalled();
    });
  });

  describe('getWorkflow', () => {
    it('returns null when resource not found', async () => {
      const result = await RemediationWorkflowService.getWorkflow(workflowId, tenantId);
      expect(result).toBeNull();
    });

    it('returns workflow when found', async () => {
      const wf = { id: workflowId, tenantId, status: 'in_progress', steps: [] };
      const container = mockGetContainer();
      (container.item as ReturnType<typeof vi.fn>)()
        .read = vi.fn().mockResolvedValue({ resource: wf });
      const result = await RemediationWorkflowService.getWorkflow(workflowId, tenantId);
      expect(result).toEqual(wf);
    });
  });

  describe('getWorkflowsByOpportunity', () => {
    it('returns empty array when no resources', async () => {
      const result = await RemediationWorkflowService.getWorkflowsByOpportunity('opp-1', tenantId);
      expect(result).toEqual([]);
    });
  });

  describe('completeStep', () => {
    it('throws when workflow not found', async () => {
      await expect(
        RemediationWorkflowService.completeStep(workflowId, 1, tenantId, 'user-1')
      ).rejects.toThrow(/remediation workflow not found/i);
    });
  });

  describe('cancelWorkflow', () => {
    it('throws when workflow not found', async () => {
      await expect(
        RemediationWorkflowService.cancelWorkflow(workflowId, tenantId)
      ).rejects.toThrow(/remediation workflow not found/i);
    });
  });
});
