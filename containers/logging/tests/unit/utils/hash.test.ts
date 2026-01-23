/**
 * Hash Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import { generateLogHash, verifyLogHash, verifyHashChain } from '../../../src/utils/hash';
import { LogCategory, LogSeverity, AuditLog } from '../../../src/types';

describe('Hash Utilities', () => {
  const mockLogEntry = {
    id: 'test-id-1',
    organizationId: 'org-1',
    timestamp: new Date('2025-01-22T10:00:00Z'),
    receivedAt: new Date('2025-01-22T10:00:00Z'),
    userId: 'user-1',
    sessionId: 'session-1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    geolocation: null,
    action: 'user.login',
    category: LogCategory.SECURITY,
    severity: LogSeverity.INFO,
    resourceType: 'user',
    resourceId: 'user-1',
    message: 'User logged in successfully',
    metadata: { method: 'password' },
    previousHash: null,
    source: 'auth-service',
    correlationId: 'corr-1',
  };

  describe('generateLogHash', () => {
    it('should generate consistent hash for same input', () => {
      const hash1 = generateLogHash(mockLogEntry, null);
      const hash2 = generateLogHash(mockLogEntry, null);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different inputs', () => {
      const hash1 = generateLogHash(mockLogEntry, null);
      const hash2 = generateLogHash({ ...mockLogEntry, message: 'Different message' }, null);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should include previous hash in calculation', () => {
      const hash1 = generateLogHash(mockLogEntry, null);
      const hash2 = generateLogHash(mockLogEntry, 'previous-hash');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should use sha256 by default', () => {
      const hash = generateLogHash(mockLogEntry, null);
      
      // SHA256 produces 64 character hex string
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should support sha512', () => {
      const hash = generateLogHash(mockLogEntry, null, 'sha512');
      
      // SHA512 produces 128 character hex string
      expect(hash).toHaveLength(128);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('verifyLogHash', () => {
    it('should verify valid hash', () => {
      const hash = generateLogHash(mockLogEntry, null);
      const auditLog: AuditLog = {
        ...mockLogEntry,
        hash,
        createdAt: new Date(),
      };
      
      const isValid = verifyLogHash(auditLog);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid hash', () => {
      const auditLog: AuditLog = {
        ...mockLogEntry,
        hash: 'invalid-hash',
        createdAt: new Date(),
      };
      
      const isValid = verifyLogHash(auditLog);
      
      expect(isValid).toBe(false);
    });

    it('should reject modified log', () => {
      const hash = generateLogHash(mockLogEntry, null);
      const auditLog: AuditLog = {
        ...mockLogEntry,
        message: 'Modified message', // Tampered!
        hash,
        createdAt: new Date(),
      };
      
      const isValid = verifyLogHash(auditLog);
      
      expect(isValid).toBe(false);
    });
  });

  describe('verifyHashChain', () => {
    it('should verify valid chain', () => {
      // First log with null previous hash
      const log1Entry = {
        ...mockLogEntry,
        id: 'log-1',
        previousHash: null,
      };
      const log1Hash = generateLogHash(log1Entry, null);
      const log1: AuditLog = {
        ...log1Entry,
        hash: log1Hash,
        createdAt: new Date(),
      };

      // Second log with previous hash pointing to first
      const log2Entry = {
        ...mockLogEntry,
        id: 'log-2',
        previousHash: log1Hash,
        timestamp: new Date('2025-01-22T10:01:00Z'),
      };
      const log2Hash = generateLogHash(log2Entry, log1Hash);
      const log2: AuditLog = {
        ...log2Entry,
        hash: log2Hash,
        createdAt: new Date(),
      };

      const result = verifyHashChain([log1, log2]);
      
      expect(result.valid).toBe(true);
      expect(result.invalidLogIds).toHaveLength(0);
    });

    it('should detect broken chain', () => {
      const log1Hash = generateLogHash(mockLogEntry, null);
      const log1: AuditLog = {
        ...mockLogEntry,
        id: 'log-1',
        hash: log1Hash,
        createdAt: new Date(),
      };

      const log2: AuditLog = {
        ...mockLogEntry,
        id: 'log-2',
        previousHash: 'wrong-hash', // Broken chain!
        hash: 'some-hash',
        createdAt: new Date(),
      };

      const result = verifyHashChain([log1, log2]);
      
      expect(result.valid).toBe(false);
      expect(result.invalidLogIds).toContain('log-2');
    });
  });
});

