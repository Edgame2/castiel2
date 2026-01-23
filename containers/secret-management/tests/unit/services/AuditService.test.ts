/**
 * Unit tests for Audit Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from '../../../../src/services/AuditService';
import { getLoggingClient } from '../../../../src/services/logging/LoggingClient';

// Mock dependencies
vi.mock('@coder/shared', () => {
  return {
    getDatabaseClient: vi.fn(() => ({
      secret_audit_logs: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    })),
  };
});

vi.mock('../../../../src/services/logging/LoggingClient');

describe('AuditService', () => {
  let auditService: AuditService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    auditService = new AuditService();
    mockDb = (auditService as any).db;
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      const mockAuditLog = {
        id: 'audit-1',
        eventType: 'SECRET_CREATED',
        actorId: 'user-123',
        secretId: 'secret-1',
        createdAt: new Date(),
      };
      
      mockDb.secret_audit_logs.create.mockResolvedValue(mockAuditLog);
      
      await auditService.log({
        eventType: 'SECRET_CREATED',
        actorId: 'user-123',
        secretId: 'secret-1',
        action: 'Create secret',
      });
      
      expect(mockDb.secret_audit_logs.create).toHaveBeenCalled();
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const mockLogs = [
        {
          id: 'audit-1',
          eventType: 'SECRET_CREATED',
          actorId: 'user-123',
          createdAt: new Date(),
        },
        {
          id: 'audit-2',
          eventType: 'SECRET_READ',
          actorId: 'user-123',
          createdAt: new Date(),
        },
      ];
      
      mockDb.secret_audit_logs.findMany.mockResolvedValue(mockLogs);
      
      const result = await auditService.getAuditLogs({
        secretId: 'secret-1',
        limit: 10,
      });
      
      expect(result).toHaveLength(2);
      expect(mockDb.secret_audit_logs.findMany).toHaveBeenCalled();
    });
  });
});


