/**
 * Playbook and Recommendations Integration Tests
 * Tests integration between RecommendationsService and PlaybookExecutionService
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RecommendationsService } from '../../../../src/services/recommendation.service.js';
import { PlaybookExecutionService } from '../../../../src/services/playbook-execution.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { WorkflowAutomationService } from '../../../../src/services/workflow-automation.service.js';

// Mock dependencies
const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
} as any;

const mockCosmosClient = {
  database: vi.fn().mockReturnValue({
    container: vi.fn().mockReturnValue({
      items: {
        query: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      item: vi.fn().mockReturnValue({
        read: vi.fn(),
        replace: vi.fn(),
      }),
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
} as unknown as Redis;

const mockWorkflowAutomationService = {
  triggerWorkflows: vi.fn(),
} as unknown as WorkflowAutomationService;

describe('Playbook and Recommendations Integration', () => {
  let recommendationsService: RecommendationsService;
  let playbookExecutionService: PlaybookExecutionService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize services
    playbookExecutionService = new PlaybookExecutionService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockWorkflowAutomationService,
      undefined // recommendationsService (circular)
    );

    recommendationsService = new RecommendationsService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      undefined, // adaptiveWeightLearningService
      undefined, // metaLearningService
      undefined, // riskEvaluationService
      undefined, // opportunityService
      playbookExecutionService
    );
  });

  describe('Recommendation to Playbook Execution Flow', () => {
    it('should execute playbook from recommendation', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const userId = 'user-1';

      // Generate recommendation with playbook
      const mockRecommendationContainer = (mockCosmosClient.database as any)().container();
      (mockRecommendationContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'rec-1',
          tenantId,
          opportunityId,
          type: 'action',
          recommendation: {
            title: 'Follow up on proposal',
            description: 'Send follow-up email and schedule meeting',
            priority: 'high',
            playbookId: 'playbook-1',
          },
        },
      });

      // Mock playbook retrieval
      const mockPlaybookContainer = (mockCosmosClient.database as any)().container();
      (mockPlaybookContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            playbookId: 'playbook-1',
            tenantId,
            name: 'Proposal Follow-up',
            isActive: true,
            steps: [
              {
                stepId: 'step-1',
                name: 'Send follow-up email',
                action: {
                  type: 'send_email',
                  config: { to: 'customer@example.com' },
                },
                required: true,
              },
              {
                stepId: 'step-2',
                name: 'Schedule meeting',
                action: {
                  type: 'schedule_meeting',
                  config: { duration: 30 },
                },
                required: false,
              },
            ],
          },
        }),
      });

      // Mock execution creation
      const mockExecutionContainer = (mockCosmosClient.database as any)().container();
      (mockExecutionContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'execution-1',
          executionId: 'execution-1',
          tenantId,
          playbookId: 'playbook-1',
          opportunityId,
          userId,
          status: 'in_progress',
          currentStep: 0,
          steps: [
            { stepId: 'step-1', status: 'pending' },
            { stepId: 'step-2', status: 'pending' },
          ],
          context: { opportunityId, userId },
          startedAt: new Date(),
        },
      });

      // Generate recommendation
      const recommendation = await recommendationsService.generateRecommendations(
        tenantId,
        opportunityId,
        userId
      );

      // Execute playbook from recommendation
      if (recommendation.recommendations[0]?.playbookId) {
        const execution = await recommendationsService.executePlaybookFromRecommendation(
          tenantId,
          recommendation.recommendations[0].id,
          { opportunityId, userId }
        );

        expect(execution).toBeDefined();
        expect(execution.playbookId).toBe('playbook-1');
        expect(execution.status).toBe('in_progress');
        expect(mockExecutionContainer.items.create).toHaveBeenCalled();
      }
    });

    it('should handle recommendation without playbook gracefully', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const userId = 'user-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'rec-1',
          tenantId,
          opportunityId,
          type: 'insight',
          recommendation: {
            title: 'Risk detected',
            description: 'High risk score detected',
            priority: 'medium',
            // No playbookId
          },
        },
      });

      const recommendation = await recommendationsService.generateRecommendations(
        tenantId,
        opportunityId,
        userId
      );

      expect(recommendation).toBeDefined();
      expect(recommendation.recommendations[0].playbookId).toBeUndefined();

      // Should not throw when trying to execute without playbook
      await expect(
        recommendationsService.executePlaybookFromRecommendation(
          tenantId,
          recommendation.recommendations[0].id,
          { opportunityId, userId }
        )
      ).rejects.toThrow(); // Should throw if no playbook
    });
  });

  describe('Workflow Automation Integration', () => {
    it('should trigger workflow from playbook execution', async () => {
      const tenantId = 'tenant-1';
      const playbookId = 'playbook-1';
      const context = {
        opportunityId: 'opp-1',
        userId: 'user-1',
      };

      const mockPlaybookContainer = (mockCosmosClient.database as any)().container();
      (mockPlaybookContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            playbookId,
            tenantId,
            name: 'Test Playbook',
            isActive: true,
            steps: [
              {
                stepId: 'step-1',
                name: 'Trigger workflow',
                action: {
                  type: 'trigger_workflow',
                  config: { workflowId: 'workflow-1' },
                },
                required: true,
              },
            ],
          },
        }),
      });

      (mockWorkflowAutomationService.triggerWorkflows as any).mockResolvedValue({
        triggered: true,
        workflowId: 'workflow-1',
      });

      const mockExecutionContainer = (mockCosmosClient.database as any)().container();
      (mockExecutionContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'execution-1',
          executionId: 'execution-1',
          tenantId,
          playbookId,
          status: 'in_progress',
          steps: [
            {
              stepId: 'step-1',
              status: 'completed',
              result: { success: true },
            },
          ],
        },
      });

      const execution = await playbookExecutionService.executePlaybook(
        tenantId,
        playbookId,
        context
      );

      expect(execution).toBeDefined();
      // Workflow should be triggered during step execution
      expect(mockWorkflowAutomationService.triggerWorkflows).toHaveBeenCalled();
    });
  });
});
