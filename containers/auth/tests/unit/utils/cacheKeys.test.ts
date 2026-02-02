/**
 * Cache Keys utility unit tests
 */

import { describe, it, expect } from 'vitest';
import { cacheKeys } from '../../../src/utils/cacheKeys';

describe('cacheKeys', () => {
  it('should generate sessionData key', () => {
    expect(cacheKeys.sessionData('sess-123')).toBe('session:sess-123');
  });

  it('should generate sessionBlacklist key', () => {
    expect(cacheKeys.sessionBlacklist('sess-123')).toBe('session:blacklist:sess-123');
  });

  it('should generate sessionActivity key', () => {
    expect(cacheKeys.sessionActivity('sess-123')).toBe('session:activity:sess-123');
  });

  it('should generate userSessions key', () => {
    expect(cacheKeys.userSessions('user-456')).toBe('user:sessions:user-456');
  });

  it('should generate loginAttempts key', () => {
    expect(cacheKeys.loginAttempts('user@example.com')).toBe('login:attempts:user@example.com');
  });

  it('should generate passwordReset key', () => {
    expect(cacheKeys.passwordReset('token-abc')).toBe('password:reset:token-abc');
  });

  it('should generate emailVerification key', () => {
    expect(cacheKeys.emailVerification('token-xyz')).toBe('email:verification:token-xyz');
  });
});
