/**
 * Workflow Orchestrator Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowOrchestratorService } from '../../../src/services/WorkflowOrchestratorService';
import { getContainer } from '@coder/shared/database';

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      risk_analytics: { url: 'http://risk-analytics:3000' },
      recommendations: { url: 'http://recommendations:3000' },
      forecasting: { url: 'http://forecasting:3000' },
      integration_manager: { url: 'http://integration-manager:3000' },
    },
    database: {
      containers: {
        workflow_workflows: 'workflow_workflows',
        workflow_steps: 'workflow_steps',
      },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../../src/events/publishers/WorkflowOrchestratorEventPublisher', () => ({
  publishWorkflowEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('WorkflowOrchestratorService', () => {
  let service: WorkflowOrchestratorService;
  let mockContainer: ReturnType<typeof createMockContainer>;

  function createMockContainer() {
    return {
      items: {
        create: vi.fn().mockResolvedValue({}),
        query: vi.fn(() => ({
          fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        })),
      },
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
        replace: vi.fn().mockResolvedValue({}),
      })),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = createMockContainer();
    (getContainer as ReturnType<typeof vi.fn>).mockImplementation((name: string) => mockContainer);
    service = new WorkflowOrchestratorService();
  });

  describe('startOpportunityAnalysisWorkflow', () => {
    it('should start opportunity analysis workflow successfully', async () => {
      const tenantId = 'tenant-123';
      const opportunityId = 'opp-123';

      mockContainer.items.create.mockResolvedValue({});

      const result = await service.startOpportunityAnalysisWorkflow(opportunityId, tenantId);

      expect(result).toHaveProperty('workflowId');
      expect(result).toHaveProperty('status', 'running');
      expect(result.opportunityId).toBe(opportunityId);
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should throw when workflow storage fails', async () => {
      const tenantId = 'tenant-123';
      const opportunityId = 'opp-123';

      mockContainer.items.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.startOpportunityAnalysisWorkflow(opportunityId, tenantId)
      ).rejects.toThrow();
    });
  });

  describe('getWorkflow', () => {
    it('should retrieve a workflow successfully', async () => {
      const tenantId = 'tenant-123';
      const workflowId = 'workflow-123';
      const mockWorkflow = {
        workflowId,
        tenantId,
        opportunityId: 'opp-123',
        status: 'completed' as const,
        steps: [
          { stepId: 'step-1', workflowId, stepType: 'risk_analysis' as const, status: 'completed' as const },
        ],
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: mockWorkflow }),
        replace: vi.fn(),
      });

      const result = await service.getWorkflow(workflowId, tenantId);

      expect(result).toEqual(mockWorkflow);
      expect(mockContainer.item).toHaveBeenCalledWith(workflowId, tenantId);
    });

    it('should return null when workflow not found', async () => {
      const tenantId = 'tenant-123';
      const workflowId = 'non-existent';

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
        replace: vi.fn(),
      });

      const result = await service.getWorkflow(workflowId, tenantId);

      expect(result).toBeNull();
    });
  });
});
