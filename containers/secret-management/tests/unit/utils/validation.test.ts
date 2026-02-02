/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { validateSecretValue, validateSecretName } from '../../../src/utils/validation';

/** Assert that fn throws an error with name InvalidSecretValueError (avoids instanceof across module boundaries). */
function expectInvalidSecretValueError(fn: () => void): void {
  try {
    fn();
    expect.fail('Expected InvalidSecretValueError');
  } catch (e: unknown) {
    expect((e as Error).name).toBe('InvalidSecretValueError');
  }
}

describe('validateSecretValue', () => {
  describe('API_KEY', () => {
    it('should validate correct API_KEY', () => {
      expect(() => {
        validateSecretValue('API_KEY', { type: 'API_KEY', key: 'test-key' });
      }).not.toThrow();
    });

    it('should reject API_KEY with missing key', () => {
      expectInvalidSecretValueError(() => {
        validateSecretValue('API_KEY', { type: 'API_KEY' } as any);
      });
    });

    it('should reject API_KEY with empty key', () => {
      expectInvalidSecretValueError(() => {
        validateSecretValue('API_KEY', { type: 'API_KEY', key: '' });
      });
    });

    it('should reject API_KEY with wrong type', () => {
      expectInvalidSecretValueError(() => {
        validateSecretValue('API_KEY', { type: 'GENERIC', value: 'test' });
      });
    });
  });

  describe('USERNAME_PASSWORD', () => {
    it('should validate correct USERNAME_PASSWORD', () => {
      expect(() => {
        validateSecretValue('USERNAME_PASSWORD', {
          type: 'USERNAME_PASSWORD',
          username: 'user',
          password: 'pass',
        });
      }).not.toThrow();
    });

    it('should reject USERNAME_PASSWORD with missing username', () => {
      expectInvalidSecretValueError(() => {
        validateSecretValue('USERNAME_PASSWORD', {
          type: 'USERNAME_PASSWORD',
          password: 'pass',
        } as any);
      });
    });

    it('should reject USERNAME_PASSWORD with empty username', () => {
      expectInvalidSecretValueError(() => {
        validateSecretValue('USERNAME_PASSWORD', {
          type: 'USERNAME_PASSWORD',
          username: '',
          password: 'pass',
        });
      });
    });
  });

  describe('OAUTH2_TOKEN', () => {
    it('should validate correct OAUTH2_TOKEN', () => {
      expect(() => {
        validateSecretValue('OAUTH2_TOKEN', {
          type: 'OAUTH2_TOKEN',
          accessToken: 'token',
        });
      }).not.toThrow();
    });

    it('should reject OAUTH2_TOKEN with missing accessToken', () => {
      expectInvalidSecretValueError(() => {
        validateSecretValue('OAUTH2_TOKEN', { type: 'OAUTH2_TOKEN' } as any);
      });
    });
  });

  describe('GENERIC', () => {
    it('should validate correct GENERIC', () => {
      expect(() => {
        validateSecretValue('GENERIC', { type: 'GENERIC', value: 'test' });
      }).not.toThrow();
    });

    it('should reject GENERIC with missing value', () => {
      expectInvalidSecretValueError(() => {
        validateSecretValue('GENERIC', { type: 'GENERIC' } as any);
      });
    });
  });
});

describe('validateSecretName', () => {
  it('should validate correct secret name', () => {
    expect(() => {
      validateSecretName('my-secret');
    }).not.toThrow();
  });

  it('should validate name with dots and underscores', () => {
    expect(() => {
      validateSecretName('my.secret_name');
    }).not.toThrow();
  });

  it('should reject empty name', () => {
    expectInvalidSecretValueError(() => validateSecretName(''));
  });

  it('should reject name with spaces', () => {
    expectInvalidSecretValueError(() => validateSecretName('my secret'));
  });

  it('should reject name with special characters', () => {
    expectInvalidSecretValueError(() => validateSecretName('my@secret'));
  });

  it('should reject name longer than 255 characters', () => {
    expectInvalidSecretValueError(() => validateSecretName('a'.repeat(256)));
  });

  it('should accept name exactly 255 characters', () => {
    expect(() => {
      validateSecretName('a'.repeat(255));
    }).not.toThrow();
  });
});



