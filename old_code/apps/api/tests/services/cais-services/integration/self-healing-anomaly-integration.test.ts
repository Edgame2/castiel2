/**
 * Self-Healing and Anomaly Detection Integration Tests
 * Tests integration between SelfHealingService, AnomalyDetectionService,
 * and PlaybookExecutionService for automatic remediation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SelfHealingService } from '../../../../src/services/self-healing.service.js';
import { AnomalyDetectionService } from '../../../../src/services/anomaly-detection.service.js';
import { PlaybookExecutionService } from '../../../../src/services/playbook-execution.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { WorkflowAutomationService } from '../../../../src/services/workflow-automation.service.js';
import type { EarlyWarningService } from '../../../../src/services/early-warning.service.js';
import type { DataQualityService } from '../../../../src/services/data-quality.service.js';

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

const mockEarlyWarningService = {
  detectSignals: vi.fn(),
} as unknown as EarlyWarningService;

const mockDataQualityService = {
  validateData: vi.fn(),
} as unknown as DataQualityService;

describe('Self-Healing and Anomaly Detection Integration', () => {
  let selfHealingService: SelfHealingService;
  let anomalyDetectionService: AnomalyDetectionService;
  let playbookExecutionService: PlaybookExecutionService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize services
    anomalyDetectionService = new AnomalyDetectionService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockEarlyWarningService,
      mockDataQualityService
    );

    playbookExecutionService = new PlaybookExecutionService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockWorkflowAutomationService,
      undefined // recommendationsService
    );

    selfHealingService = new SelfHealingService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      anomalyDetectionService,
      playbookExecutionService,
      mockWorkflowAutomationService
    );
  });

  describe('End-to-End Anomaly Detection and Remediation', () => {
    it('should detect anomaly and automatically remediate', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';

      // Mock anomaly detection
      (mockEarlyWarningService.detectSignals as any).mockResolvedValue({
        signals: [
          {
            signalId: 'signal-1',
            type: 'risk',
            severity: 'high',
            description: 'High risk score detected',
          },
        ],
      });

      const mockAnomalyContainer = (mockCosmosClient.database as any)().container();
      (mockAnomalyContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'anomaly-1',
          anomalyId: 'anomaly-1',
          tenantId,
          opportunityId,
          type: 'statistical',
          severity: 'high',
          explanation: {
            summary: 'Unusual risk pattern detected',
          },
        },
      });

      // Mock policy matching
      const mockPolicyContainer = (mockCosmosClient.database as any)().container();
      (mockPolicyContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'policy-1',
              tenantId,
              issueType: 'anomaly',
              conditions: [
                { field: 'severity', operator: 'equals', value: 'high' },
              ],
              action: 'execute_playbook',
              config: { playbookId: 'remediation-playbook-1' },
              isActive: true,
              autoExecute: true,
            },
          ],
        }),
      });

      // Mock playbook execution
      const mockPlaybookContainer = (mockCosmosClient.database as any)().container();
      (mockPlaybookContainer.item as any).mockReturnValue({
        read: vi.fn().mockResolvedValue({
          resource: {
            playbookId: 'remediation-playbook-1',
            tenantId,
            name: 'Anomaly Remediation',
            isActive: true,
            steps: [
              {
                stepId: 'step-1',
                name: 'Flag for review',
                action: {
                  type: 'create_task',
                  config: { title: 'Review high-risk opportunity' },
                },
                required: true,
              },
            ],
          },
        }),
      });

      const mockExecutionContainer = (mockCosmosClient.database as any)().container();
      (mockExecutionContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'execution-1',
          executionId: 'execution-1',
          tenantId,
          playbookId: 'remediation-playbook-1',
          status: 'completed',
          steps: [
            {
              stepId: 'step-1',
              status: 'completed',
              result: { success: true },
            },
          ],
        },
      });

      // Mock remediation creation
      const mockRemediationContainer = (mockCosmosClient.database as any)().container();
      (mockRemediationContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'remediation-1',
          remediationId: 'remediation-1',
          tenantId,
          issueId: 'anomaly-1',
          issueType: 'anomaly',
          action: 'execute_playbook',
          status: 'completed',
          result: {
            success: true,
            data: { executionId: 'execution-1' },
            executedAt: new Date(),
          },
        },
      });

      const remediations = await selfHealingService.detectAndRemediate(
        tenantId,
        opportunityId
      );

      expect(remediations).toBeDefined();
      expect(remediations.length).toBeGreaterThan(0);
      expect(remediations[0].status).toBe('completed');
      expect(mockAnomalyContainer.items.create).toHaveBeenCalled();
      expect(mockRemediationContainer.items.create).toHaveBeenCalled();
      expect(mockExecutionContainer.items.create).toHaveBeenCalled();
    });

    it('should create manual review task when auto-execute is disabled', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';

      // Mock anomaly detection
      (mockEarlyWarningService.detectSignals as any).mockResolvedValue({
        signals: [
          {
            signalId: 'signal-1',
            type: 'risk',
            severity: 'critical',
          },
        ],
      });

      const mockAnomalyContainer = (mockCosmosClient.database as any)().container();
      (mockAnomalyContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'anomaly-1',
          anomalyId: 'anomaly-1',
          tenantId,
          opportunityId,
          severity: 'critical',
        },
      });

      // Mock policy with auto-execute disabled
      const mockPolicyContainer = (mockCosmosClient.database as any)().container();
      (mockPolicyContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'policy-1',
              tenantId,
              issueType: 'anomaly',
              conditions: [
                { field: 'severity', operator: 'equals', value: 'critical' },
              ],
              action: 'create_task',
              config: {
                title: 'Review critical anomaly',
                assignTo: 'admin',
              },
              isActive: true,
              autoExecute: false, // Requires manual approval
            },
          ],
        }),
      });

      const mockRemediationContainer = (mockCosmosClient.database as any)().container();
      (mockRemediationContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'remediation-1',
          tenantId,
          issueId: 'anomaly-1',
          issueType: 'anomaly',
          action: 'create_task',
          status: 'pending', // Pending manual execution
        },
      });

      const remediations = await selfHealingService.detectAndRemediate(
        tenantId,
        opportunityId
      );

      expect(remediations).toBeDefined();
      expect(remediations[0].status).toBe('pending');
    });

    it('should handle remediation failures gracefully', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';

      // Mock anomaly detection
      (mockEarlyWarningService.detectSignals as any).mockResolvedValue({
        signals: [
          {
            signalId: 'signal-1',
            type: 'risk',
            severity: 'high',
          },
        ],
      });

      const mockAnomalyContainer = (mockCosmosClient.database as any)().container();
      (mockAnomalyContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'anomaly-1',
          anomalyId: 'anomaly-1',
          tenantId,
          opportunityId,
          severity: 'high',
        },
      });

      // Mock policy
      const mockPolicyContainer = (mockCosmosClient.database as any)().container();
      (mockPolicyContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'policy-1',
              tenantId,
              issueType: 'anomaly',
              action: 'update_field',
              config: {},
              isActive: true,
              autoExecute: true,
            },
          ],
        }),
      });

      // Mock remediation failure
      const mockRemediationContainer = (mockCosmosClient.database as any)().container();
      (mockRemediationContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'remediation-1',
          tenantId,
          issueId: 'anomaly-1',
          issueType: 'anomaly',
          action: 'update_field',
          status: 'failed',
          result: {
            success: false,
            error: 'Field update failed',
            executedAt: new Date(),
          },
        },
      });

      const remediations = await selfHealingService.detectAndRemediate(
        tenantId,
        opportunityId
      );

      expect(remediations).toBeDefined();
      expect(remediations[0].status).toBe('failed');
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});
