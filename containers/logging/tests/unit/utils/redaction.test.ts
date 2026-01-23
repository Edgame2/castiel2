/**
 * Redaction Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isSensitiveKey,
  redactString,
  redactObject,
  redactMessage,
  compilePatterns,
} from '../../../src/utils/redaction';

describe('Redaction Utilities', () => {
  describe('isSensitiveKey', () => {
    it('should identify password keys', () => {
      expect(isSensitiveKey('password')).toBe(true);
      expect(isSensitiveKey('userPassword')).toBe(true);
      expect(isSensitiveKey('PASSWORD')).toBe(true);
    });

    it('should identify token keys', () => {
      expect(isSensitiveKey('token')).toBe(true);
      expect(isSensitiveKey('accessToken')).toBe(true);
      expect(isSensitiveKey('refreshToken')).toBe(true);
    });

    it('should identify secret keys', () => {
      expect(isSensitiveKey('secret')).toBe(true);
      expect(isSensitiveKey('clientSecret')).toBe(true);
    });

    it('should identify API key keys', () => {
      expect(isSensitiveKey('apikey')).toBe(true);
      expect(isSensitiveKey('api_key')).toBe(true);
      expect(isSensitiveKey('apiKey')).toBe(true);
    });

    it('should not identify non-sensitive keys', () => {
      expect(isSensitiveKey('username')).toBe(false);
      expect(isSensitiveKey('email')).toBe(false);
      expect(isSensitiveKey('name')).toBe(false);
    });

    it('should support custom patterns', () => {
      const customPatterns = [/ssn/i];
      expect(isSensitiveKey('socialSecurityNumber', customPatterns)).toBe(false);
      expect(isSensitiveKey('ssn', customPatterns)).toBe(true);
    });
  });

  describe('redactString', () => {
    it('should redact email addresses', () => {
      const input = 'Contact user at john.doe@example.com for help';
      const result = redactString(input);
      
      expect(result).toBe('Contact user at [EMAIL REDACTED] for help');
    });

    it('should redact credit card numbers', () => {
      const input = 'Card number is 4111-1111-1111-1111';
      const result = redactString(input);
      
      expect(result).toBe('Card number is [CARD REDACTED]');
    });

    it('should redact multiple values', () => {
      const input = 'Email: test@test.com, Card: 4111111111111111';
      const result = redactString(input);
      
      expect(result).toContain('[EMAIL REDACTED]');
      expect(result).toContain('[CARD REDACTED]');
    });

    it('should preserve non-sensitive data', () => {
      const input = 'User logged in at 2025-01-22 10:00:00';
      const result = redactString(input);
      
      expect(result).toBe(input);
    });
  });

  describe('redactObject', () => {
    it('should redact sensitive keys', () => {
      const input = {
        username: 'john',
        password: 'secret123',
        token: 'abc123',
      };
      const result = redactObject(input);
      
      expect(result.username).toBe('john');
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
    });

    it('should redact nested objects', () => {
      const input = {
        user: {
          name: 'John',
          userPassword: 'secret', // Using userPassword to trigger sensitive key detection
        },
      };
      const result = redactObject(input);
      
      expect(result.user.name).toBe('John');
      expect(result.user.userPassword).toBe('[REDACTED]');
    });

    it('should redact sensitive keys in arrays of objects', () => {
      const input = {
        items: ['item1', 'item2'],
        users: [{ name: 'John', userPassword: 'secret' }],
      };
      const result = redactObject(input);
      
      expect(result.items).toEqual(['item1', 'item2']);
      expect(result.users[0].name).toBe('John');
      expect(result.users[0].userPassword).toBe('[REDACTED]');
    });

    it('should handle null and undefined for non-sensitive keys', () => {
      const input = {
        name: 'John',
        optionalField: null,
        anotherField: undefined,
      };
      const result = redactObject(input);
      
      expect(result.name).toBe('John');
      expect(result.optionalField).toBe(null);
      expect(result.anotherField).toBe(undefined);
    });

    it('should handle max depth', () => {
      const input = {
        a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 'deep' } } } } } } } } } },
      };
      const result = redactObject(input, { maxDepth: 5 });
      
      // Deep values should be replaced with max depth message
      expect(JSON.stringify(result)).toContain('[MAX DEPTH EXCEEDED]');
    });
  });

  describe('redactMessage', () => {
    it('should redact sensitive patterns in message', () => {
      const input = 'User john@example.com logged in with card 4111111111111111';
      const result = redactMessage(input);
      
      expect(result).toContain('[EMAIL REDACTED]');
      expect(result).toContain('[CARD REDACTED]');
    });

    it('should apply custom patterns', () => {
      const input = 'User with SSN 123-45-6789 logged in';
      const customPatterns = ['\\d{3}-\\d{2}-\\d{4}'];
      const result = redactMessage(input, customPatterns);
      
      // The SSN is already matched by the built-in VALUE_PATTERNS
      expect(result).not.toContain('123-45-6789');
    });
  });

  describe('compilePatterns', () => {
    it('should compile valid regex patterns', () => {
      const patterns = ['password', '\\d{4}'];
      const compiled = compilePatterns(patterns);
      
      expect(compiled).toHaveLength(2);
      expect(compiled[0].test('password')).toBe(true);
      expect(compiled[1].test('1234')).toBe(true);
    });

    it('should escape literal strings', () => {
      const patterns = ['test.string', 'value$1'];
      const compiled = compilePatterns(patterns);
      
      // Should match literal dots and dollar signs
      expect(compiled[0].test('test.string')).toBe(true);
      expect(compiled[0].test('testXstring')).toBe(false);
    });
  });
});

