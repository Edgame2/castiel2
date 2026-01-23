/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { validateSecretValue, validateSecretName } from '../../../src/utils/validation';
import { InvalidSecretValueError } from '../../../src/errors/SecretErrors';

describe('validateSecretValue', () => {
  describe('API_KEY', () => {
    it('should validate correct API_KEY', () => {
      expect(() => {
        validateSecretValue('API_KEY', { type: 'API_KEY', key: 'test-key' });
      }).not.toThrow();
    });

    it('should reject API_KEY with missing key', () => {
      expect(() => {
        validateSecretValue('API_KEY', { type: 'API_KEY' } as any);
      }).toThrow(InvalidSecretValueError);
    });

    it('should reject API_KEY with empty key', () => {
      expect(() => {
        validateSecretValue('API_KEY', { type: 'API_KEY', key: '' });
      }).toThrow(InvalidSecretValueError);
    });

    it('should reject API_KEY with wrong type', () => {
      expect(() => {
        validateSecretValue('API_KEY', { type: 'GENERIC', value: 'test' });
      }).toThrow(InvalidSecretValueError);
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
      expect(() => {
        validateSecretValue('USERNAME_PASSWORD', {
          type: 'USERNAME_PASSWORD',
          password: 'pass',
        } as any);
      }).toThrow(InvalidSecretValueError);
    });

    it('should reject USERNAME_PASSWORD with empty username', () => {
      expect(() => {
        validateSecretValue('USERNAME_PASSWORD', {
          type: 'USERNAME_PASSWORD',
          username: '',
          password: 'pass',
        });
      }).toThrow(InvalidSecretValueError);
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
      expect(() => {
        validateSecretValue('OAUTH2_TOKEN', { type: 'OAUTH2_TOKEN' } as any);
      }).toThrow(InvalidSecretValueError);
    });
  });

  describe('GENERIC', () => {
    it('should validate correct GENERIC', () => {
      expect(() => {
        validateSecretValue('GENERIC', { type: 'GENERIC', value: 'test' });
      }).not.toThrow();
    });

    it('should reject GENERIC with missing value', () => {
      expect(() => {
        validateSecretValue('GENERIC', { type: 'GENERIC' } as any);
      }).toThrow(InvalidSecretValueError);
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
    expect(() => {
      validateSecretName('');
    }).toThrow(InvalidSecretValueError);
  });

  it('should reject name with spaces', () => {
    expect(() => {
      validateSecretName('my secret');
    }).toThrow(InvalidSecretValueError);
  });

  it('should reject name with special characters', () => {
    expect(() => {
      validateSecretName('my@secret');
    }).toThrow(InvalidSecretValueError);
  });

  it('should reject name longer than 255 characters', () => {
    expect(() => {
      validateSecretName('a'.repeat(256));
    }).toThrow(InvalidSecretValueError);
  });

  it('should accept name exactly 255 characters', () => {
    expect(() => {
      validateSecretName('a'.repeat(255));
    }).not.toThrow();
  });
});



