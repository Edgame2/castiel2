/**
 * Password Utilities Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, verifyPassword, validatePassword } from '../../../src/utils/passwordUtils';

// Mock hibp
vi.mock('hibp', () => ({
  pwnedPassword: vi.fn(async (password: string) => {
    // Mock: return 0 for most passwords, high count for 'pwnedpassword'
    if (password.toLowerCase() === 'pwnedpassword') {
      return 1000;
    }
    return 0;
  }),
}));

// Mock bcrypt with a working implementation
const bcryptPasswordMap = new Map<string, string>();
let hashCounter = 0;

vi.mock('bcrypt', () => {
  const mockHash = vi.fn(async (password: string, rounds: number) => {
    // Create a unique hash for each call (simulating different salts)
    // Use counter to ensure uniqueness - put it first so it affects the base64 output
    hashCounter++;
    const timestamp = process.hrtime.bigint().toString();
    const random1 = Math.random().toString(36).substring(2, 15);
    const random2 = Math.random().toString(36).substring(2, 15);
    // Put counter FIRST in the input so it affects the base64 output from the start
    const saltInput = `${hashCounter}-${timestamp}-${random1}-${random2}-salt-${password}`;
    const saltFull = Buffer.from(saltInput).toString('base64');
    // Take first 22 chars for bcrypt salt format
    // Since counter is first, each hash will have different first chars
    let salt = saltFull.substring(0, 22);
    // Ensure we have exactly 22 chars
    if (salt.length < 22) {
      const padding = `${hashCounter}-${random1}-${random2}`;
      salt = (salt + padding).substring(0, 22);
    }
    const hash = `$2b$${rounds}$${salt}`;
    // Store mapping for verification
    bcryptPasswordMap.set(hash, password);
    return hash;
  });
  
  const mockCompare = vi.fn(async (password: string, hash: string) => {
    // Check our stored mappings
    const storedPassword = bcryptPasswordMap.get(hash);
    return storedPassword === password;
  });
  
  // Export as namespace (import * as bcryptjs)
  return {
    hash: mockHash,
    compare: mockCompare,
  };
});

describe('Password Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bcryptPasswordMap.clear();
    hashCounter = 0;
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt hash starts with $2
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      // The counter ensures uniqueness even without delay
      const hash2 = await hashPassword(password);
      
      // Verify they're different (counter ensures this)
      expect(hash1).not.toBe(hash2);
      // Also verify they're both valid bcrypt hashes
      expect(hash1.startsWith('$2')).toBe(true);
      expect(hash2.startsWith('$2')).toBe(true);
      // Verify they have the same structure
      expect(hash1.split('$').length).toBe(4);
      expect(hash2.split('$').length).toBe(4);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept a valid password', async () => {
      // Use a password that doesn't contain personal info
      // "TestPassword123!" contains "Test" which matches firstName "Test"
      const result = await validatePassword('SecurePass123!@#', {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a password that is too short', async () => {
      const result = await validatePassword('Short1!', {
        email: 'test@example.com',
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('8 characters'))).toBe(true);
    });

    it('should reject common passwords', async () => {
      const result = await validatePassword('password123', {
        email: 'test@example.com',
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('common') || e.includes('weak'))).toBe(true);
    });

    it('should reject passwords containing personal information', async () => {
      const result = await validatePassword('TestUser123!', {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('personal') || e.includes('name'))).toBe(true);
    });

    it('should reject pwned passwords', async () => {
      // Use 'pwnedpassword' which the HIBP mock returns 1000 for
      const result = await validatePassword('pwnedpassword', {
        email: 'test@example.com',
      });
      
      // The HIBP mock returns 1000 for 'pwnedpassword', so validation should fail
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('breach') || e.includes('compromised') || e.includes('exposed'))).toBe(true);
    });
  });
});
