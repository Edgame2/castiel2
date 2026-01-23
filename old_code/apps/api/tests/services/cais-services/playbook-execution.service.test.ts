/**
 * Playbook Execution Service Tests
 * Tests for automated playbook execution
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PlaybookExecutionService } from '../../../src/services/playbook-execution.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { WorkflowAutomationService } from '../../../src/services/workflow-automation.service.js';
import type { RecommendationsService } from '../../../src/services/recommendation.service.js';

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

const mockRecommendationsService = {
  getRecommendations: vi.fn(),
} as unknown as RecommendationsService;

describe('PlaybookExecutionService', () => {
  let service: PlaybookExecutionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlaybookExecutionService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockWorkflowAutomationService,
      mockRecommendationsService
    );
  });

  describe('executePlaybook', () => {
    it('should execute a playbook successfully', async () => {
      const tenantId = 'tenant-1';
      const playbookId = 'playbook-1';
      const context = {
        opportunityId: 'opp-1',
        userId: 'user-1',
        stage: 'proposal',
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            playbookId,
            tenantId,
            name: 'Proposal Follow-up',
            isActive: true,
            steps: [
              {
                stepId: 'step-1',
                name: 'Send follow-up email',
                action: {
                  type: 'send_email',
                  config: { to: 'customer@example.com', subject: 'Follow-up' },
                },
                required: true,
              },
              {
                stepId: 'step-2',
                name: 'Create task',
                action: {
                  type: 'create_task',
                  config: { title: 'Review proposal' },
                },
                required: false,
              },
            ],
          },
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'execution-1',
          tenantId,
          playbookId,
          status: 'in_progress',
          currentStep: 0,
          steps: [
            { stepId: 'step-1', status: 'pending' },
            { stepId: 'step-2', status: 'pending' },
          ],
          context,
          startedAt: new Date(),
        },
      });

      const result = await service.executePlaybook(tenantId, playbookId, context);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('in_progress');
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should fail if playbook not found', async () => {
      const tenantId = 'tenant-1';
      const playbookId = 'playbook-1';
      const context = { opportunityId: 'opp-1' };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: null }),
      });

      await expect(
        service.executePlaybook(tenantId, playbookId, context)
      ).rejects.toThrow('Playbook not found');

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should fail if playbook is not active', async () => {
      const tenantId = 'tenant-1';
      const playbookId = 'playbook-1';
      const context = { opportunityId: 'opp-1' };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            playbookId,
            tenantId,
            name: 'Inactive Playbook',
            isActive: false,
            steps: [],
          },
        }),
      });

      await expect(
        service.executePlaybook(tenantId, playbookId, context)
      ).rejects.toThrow('Playbook is not active');
    });

    it('should execute playbook steps sequentially', async () => {
      const tenantId = 'tenant-1';
      const playbookId = 'playbook-1';
      const context = { opportunityId: 'opp-1' };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            playbookId,
            tenantId,
            name: 'Test Playbook',
            isActive: true,
            steps: [
              {
                stepId: 'step-1',
                name: 'Step 1',
                action: { type: 'create_task', config: {} },
                required: true,
              },
            ],
          },
        }),
        replace: vi.fn().mockResolvedValue({
          resource: {
            id: 'execution-1',
            status: 'completed',
            currentStep: 1,
            steps: [
              {
                stepId: 'step-1',
                status: 'completed',
                executedAt: new Date(),
                result: { success: true },
              },
            ],
          },
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'execution-1',
          tenantId,
          playbookId,
          status: 'in_progress',
          currentStep: 0,
          steps: [{ stepId: 'step-1', status: 'pending' }],
          context,
          startedAt: new Date(),
        },
      });

      const result = await service.executePlaybook(tenantId, playbookId, context);

      expect(result).toBeDefined();
      expect(result.status).toBe('in_progress');
    });

    it('should handle step execution errors', async () => {
      const tenantId = 'tenant-1';
      const playbookId = 'playbook-1';
      const context = { opportunityId: 'opp-1' };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            playbookId,
            tenantId,
            name: 'Test Playbook',
            isActive: true,
            steps: [
              {
                stepId: 'step-1',
                name: 'Failing Step',
                action: { type: 'create_task', config: {} },
                required: false, // Non-required step
              },
            ],
          },
        }),
        replace: vi.fn().mockResolvedValue({
          resource: {
            id: 'execution-1',
            status: 'in_progress',
            steps: [
              {
                stepId: 'step-1',
                status: 'failed',
                result: { success: false, error: 'Step failed' },
              },
            ],
          },
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'execution-1',
          tenantId,
          playbookId,
          status: 'in_progress',
          steps: [{ stepId: 'step-1', status: 'pending' }],
          context,
          startedAt: new Date(),
        },
      });

      const result = await service.executePlaybook(tenantId, playbookId, context);

      expect(result).toBeDefined();
      // Should continue even if non-required step fails
    });
  });

  describe('createPlaybook', () => {
    it('should create a new playbook', async () => {
      const tenantId = 'tenant-1';
      const playbook = {
        name: 'New Playbook',
        description: 'Test playbook',
        trigger: {
          type: 'opportunity_stage',
          conditions: { stage: 'proposal' },
        },
        steps: [
          {
            stepId: 'step-1',
            name: 'Step 1',
            action: {
              type: 'create_task',
              config: { title: 'Task' },
            },
            required: true,
          },
        ],
        context: {
          opportunityStages: ['proposal'],
        },
        isActive: true,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          playbookId: 'playbook-1',
          tenantId,
          ...playbook,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.createPlaybook(tenantId, playbook);

      expect(result).toBeDefined();
      expect(result.playbookId).toBeDefined();
      expect(result.name).toBe(playbook.name);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });
  });
});
