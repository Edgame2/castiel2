/**
 * Self-Healing Service Tests
 * Tests for automatic remediation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SelfHealingService } from '../../../src/services/self-healing.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { AnomalyDetectionService } from '../../../src/services/anomaly-detection.service.js';
import type { PlaybookExecutionService } from '../../../src/services/playbook-execution.service.js';
import type { WorkflowAutomationService } from '../../../src/services/workflow-automation.service.js';

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

const mockAnomalyDetectionService = {
  detectOpportunityAnomalies: vi.fn(),
} as unknown as AnomalyDetectionService;

const mockPlaybookExecutionService = {
  executePlaybook: vi.fn(),
} as unknown as PlaybookExecutionService;

const mockWorkflowAutomationService = {
  triggerWorkflows: vi.fn(),
} as unknown as WorkflowAutomationService;

describe('SelfHealingService', () => {
  let service: SelfHealingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SelfHealingService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockAnomalyDetectionService,
      mockPlaybookExecutionService,
      mockWorkflowAutomationService
    );
  });

  describe('detectAndRemediate', () => {
    it('should detect and remediate issues automatically', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';

      (mockAnomalyDetectionService.detectOpportunityAnomalies as any).mockResolvedValue({
        anomalies: [
          {
            anomalyId: 'anomaly-1',
            severity: 'high',
            explanation: { summary: 'High risk detected' },
          },
        ],
      });

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'policy-1',
              tenantId,
              issueType: 'anomaly',
              conditions: [
                { field: 'severity', operator: 'equals', value: 'high' },
              ],
              action: 'update_risk_score',
              config: { flagForReview: true },
              isActive: true,
              autoExecute: true,
            },
          ],
        }),
      });

      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'remediation-1',
          tenantId,
          issueId: 'anomaly-1',
          issueType: 'anomaly',
          action: 'update_risk_score',
          status: 'completed',
          result: {
            success: true,
            executedAt: new Date(),
          },
        },
      });

      const result = await service.detectAndRemediate(tenantId, opportunityId);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].status).toBe('completed');
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';

      (mockAnomalyDetectionService.detectOpportunityAnomalies as any).mockRejectedValue(
        new Error('Service error')
      );

      await expect(
        service.detectAndRemediate(tenantId, opportunityId)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('createPolicy', () => {
    it('should create a self-healing policy', async () => {
      const tenantId = 'tenant-1';
      const policy = {
        issueType: 'anomaly' as const,
        conditions: [
          { field: 'severity', operator: 'equals' as const, value: 'critical' },
        ],
        action: 'flag_for_review' as const,
        config: { notifyUsers: ['admin'] },
        isActive: true,
        priority: 'high' as const,
        autoExecute: false,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          policyId: 'policy-1',
          tenantId,
          ...policy,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.createPolicy(tenantId, policy);

      expect(result).toBeDefined();
      expect(result.policyId).toBeDefined();
      expect(result.issueType).toBe('anomaly');
      expect(mockContainer.items.create).toHaveBeenCalled();
    });
  });
});
