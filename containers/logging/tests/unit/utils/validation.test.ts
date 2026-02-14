/**
 * Validation Utilities Unit Tests
 * Per ModuleImplementationGuide Section 12: Testing Requirements
 */

import { describe, it, expect } from 'vitest';
import {
  createLogSchema,
  batchLogSchema,
  logSearchSchema,
  aggregationSchema,
} from '../../../src/utils/validation';
import { LogCategory, LogSeverity } from '../../../src/types';

describe('Validation Schemas', () => {
  describe('createLogSchema', () => {
    it('should validate a valid log input', () => {
      const input = {
        tenantId: 'org-1',
        userId: 'user-1',
        action: 'user.login',
        message: 'User logged in',
        category: LogCategory.SECURITY,
        severity: LogSeverity.INFO,
      };

      const result = createLogSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe('user.login');
        expect(result.data.message).toBe('User logged in');
      }
    });

    it('should require action', () => {
      const input = {
        tenantId: 'org-1',
        message: 'User logged in',
      };

      const result = createLogSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should require message', () => {
      const input = {
        tenantId: 'org-1',
        action: 'user.login',
      };

      const result = createLogSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should set default category and severity', () => {
      const input = {
        tenantId: 'org-1',
        action: 'user.login',
        message: 'User logged in',
      };

      const result = createLogSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe(LogCategory.ACTION);
        expect(result.data.severity).toBe(LogSeverity.INFO);
      }
    });
  });

  describe('batchLogSchema', () => {
    it('should validate a batch of logs', () => {
      const input = {
        logs: [
          {
            tenantId: 'org-1',
            action: 'user.login',
            message: 'User logged in',
          },
          {
            tenantId: 'org-1',
            action: 'user.logout',
            message: 'User logged out',
          },
        ],
      };

      const result = batchLogSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logs).toHaveLength(2);
      }
    });

    it('should require at least one log', () => {
      const input = {
        logs: [],
      };

      const result = batchLogSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should limit to 1000 logs', () => {
      const input = {
        logs: Array(1001).fill({
          tenantId: 'org-1',
          action: 'user.login',
          message: 'User logged in',
        }),
      };

      const result = batchLogSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('logSearchSchema', () => {
    it('should validate search parameters', () => {
      const input = {
        query: 'login',
        userId: 'user-1',
        category: LogCategory.SECURITY,
        limit: 50,
        offset: 0,
      };

      const result = logSearchSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('login');
        expect(result.data.limit).toBe(50);
      }
    });

    it('should set default limit and offset', () => {
      const input = {
        query: 'login',
      };

      const result = logSearchSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should validate date ranges', () => {
      const input = {
        query: 'login',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = logSearchSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date);
        expect(result.data.endDate).toBeInstanceOf(Date);
      }
    });
  });

  describe('aggregationSchema', () => {
    it('should validate aggregation parameters', () => {
      const input = {
        field: 'category',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 10,
      };

      const result = aggregationSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field).toBe('category');
        expect(result.data.limit).toBe(10);
      }
    });

    it('should only allow valid aggregation fields', () => {
      const input = {
        field: 'invalid',
      };

      const result = aggregationSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});



