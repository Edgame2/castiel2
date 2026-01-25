/**
 * Workflow Orchestrator Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowOrchestratorService } from '../../../src/services/WorkflowOrchestratorService';
import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
  generateServiceToken: vi.fn(() => 'mock-token'),
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

vi.mock('../../../src/events/publishers/WorkflowEventPublisher', () => ({
  publishWorkflowEvent: vi.fn(),
}));

describe('WorkflowOrchestratorService', () => {
  let service: WorkflowOrchestratorService;
  let mockRiskAnalyticsClient: any;
  let mockRecommendationsClient: any;
  let mockForecastingClient: any;
  let mockIntegrationManagerClient: any;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock container
    mockContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
        read: vi.fn(),
        replace: vi.fn(),
      },
    };
    (getContainer as any).mockReturnValue(mockContainer);

    // Mock service clients
    mockRiskAnalyticsClient = {
      post: vi.fn(),
    };
    mockRecommendationsClient = {
      post: vi.fn(),
    };
    mockForecastingClient = {
      post: vi.fn(),
    };
    mockIntegrationManagerClient = {
      get: vi.fn(),
    };

    (ServiceClient as any).mockImplementation((config: any) => {
      if (config.baseURL?.includes('risk-analytics')) {
        return mockRiskAnalyticsClient;
      }
      if (config.baseURL?.includes('recommendations')) {
        return mockRecommendationsClient;
      }
      if (config.baseURL?.includes('forecasting')) {
        return mockForecastingClient;
      }
      if (config.baseURL?.includes('integration-manager')) {
        return mockIntegrationManagerClient;
      }
      return {};
    });

    service = new WorkflowOrchestratorService();
  });

  describe('startOpportunityAnalysis', () => {
    it('should start opportunity analysis workflow successfully', async () => {
      const tenantId = 'tenant-123';
      const opportunityId = 'opp-123';

      // Mock workflow creation
      const mockWorkflow = {
        id: 'workflow-123',
        tenantId,
        opportunityId,
        status: 'running',
        steps: [],
        createdAt: new Date(),
      };

      mockContainer.items.create.mockResolvedValue({
        resource: mockWorkflow,
      });

      // Mock parallel service calls
      mockRiskAnalyticsClient.post.mockResolvedValue({
        evaluationId: 'eval-123',
        status: 'completed',
      });

      mockRecommendationsClient.post.mockResolvedValue({
        batchId: 'batch-123',
        status: 'completed',
      });

      mockForecastingClient.post.mockResolvedValue({
        forecastId: 'forecast-123',
        status: 'completed',
      });

      const result = await service.startOpportunityAnalysis(tenantId, opportunityId);

      expect(result).toHaveProperty('workflowId');
      expect(result).toHaveProperty('status');
      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should handle errors during workflow execution', async () => {
      const tenantId = 'tenant-123';
      const opportunityId = 'opp-123';

      mockContainer.items.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.startOpportunityAnalysis(tenantId, opportunityId)
      ).rejects.toThrow();
    });
  });

  describe('getWorkflow', () => {
    it('should retrieve a workflow successfully', async () => {
      const tenantId = 'tenant-123';
      const workflowId = 'workflow-123';

      const mockWorkflow = {
        id: workflowId,
        tenantId,
        opportunityId: 'opp-123',
        status: 'completed',
        steps: [
          {
            id: 'step-1',
            type: 'risk_analysis',
            status: 'completed',
          },
        ],
        createdAt: new Date(),
      };

      mockContainer.items.read.mockResolvedValue({
        resource: mockWorkflow,
      });

      const result = await service.getWorkflow(tenantId, workflowId);

      expect(result).toEqual(mockWorkflow);
      expect(mockContainer.items.read).toHaveBeenCalledWith(
        workflowId,
        { partitionKey: tenantId }
      );
    });

    it('should handle workflow not found', async () => {
      const tenantId = 'tenant-123';
      const workflowId = 'non-existent';

      mockContainer.items.read.mockResolvedValue({
        resource: null,
      });

      await expect(
        service.getWorkflow(tenantId, workflowId)
      ).rejects.toThrow();
    });
  });

  describe('updateWorkflowStep', () => {
    it('should update workflow step successfully', async () => {
      const tenantId = 'tenant-123';
      const workflowId = 'workflow-123';
      const stepId = 'step-123';
      const update = {
        status: 'completed',
        result: { score: 0.85 },
      };

      // Mock existing workflow
      mockContainer.items.read.mockResolvedValueOnce({
        resource: {
          id: workflowId,
          tenantId,
          steps: [
            {
              id: stepId,
              status: 'running',
            },
          ],
        },
      });

      // Mock update
      mockContainer.items.replace.mockResolvedValue({
        resource: {
          id: workflowId,
          tenantId,
          steps: [
            {
              id: stepId,
              ...update,
            },
          ],
        },
      });

      const result = await service.updateWorkflowStep(tenantId, workflowId, stepId, update);

      expect(result).toHaveProperty('id');
      expect(mockContainer.items.replace).toHaveBeenCalled();
    });
  });
});
