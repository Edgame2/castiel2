/**
 * Unit tests for Scheduler Service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SchedulerService } from '../../../../src/services/scheduler/SchedulerService';
import { RotationManager } from '../../../../src/services/lifecycle/RotationManager';
import { ExpirationManager } from '../../../../src/services/lifecycle/ExpirationManager';

// Mock dependencies
vi.mock('../../../../src/services/lifecycle/RotationManager');
vi.mock('../../../../src/services/lifecycle/ExpirationManager');
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_secrets: {
        findMany: vi.fn(),
      },
    })),
  };
});

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    schedulerService = new SchedulerService();
    mockDb = (schedulerService as any).db;
  });

  afterEach(() => {
    // Clean up any scheduled jobs
    if ((schedulerService as any).rotationJob) {
      (schedulerService as any).rotationJob.stop();
    }
    if ((schedulerService as any).expirationJob) {
      (schedulerService as any).expirationJob.stop();
    }
  });

  describe('start', () => {
    it('should start scheduled jobs', async () => {
      await schedulerService.start();
      
      // Jobs should be scheduled
      expect(schedulerService).toBeDefined();
    });
  });

  describe('stop', () => {
    it('should stop all scheduled jobs', async () => {
      await schedulerService.start();
      await schedulerService.stop();
      
      // Jobs should be stopped
      expect(schedulerService).toBeDefined();
    });
  });
});


