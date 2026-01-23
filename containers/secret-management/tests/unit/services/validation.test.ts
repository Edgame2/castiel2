/**
 * Unit tests for validation utilities
 * Additional tests beyond the basic validation.test.ts
 */

import { describe, it, expect } from 'vitest';
import { validateSecretValue, validateSecretName } from '../../../src/utils/validation';
import { InvalidSecretValueError } from '../../../src/errors/SecretErrors';

// Helper to check if error is InvalidSecretValueError (handles module resolution issues)
function isInvalidSecretValueError(error: any): boolean {
  return error instanceof InvalidSecretValueError || 
         error?.name === 'InvalidSecretValueError' ||
         error?.constructor?.name === 'InvalidSecretValueError';
}

describe('validateSecretValue - Additional Tests', () => {
  describe('CONNECTION_STRING', () => {
    it('should validate correct CONNECTION_STRING', () => {
      expect(() => {
        validateSecretValue('CONNECTION_STRING', {
          type: 'CONNECTION_STRING',
          connectionString: 'postgresql://user:pass@host:5432/db',
        });
      }).not.toThrow();
    });

    it('should reject CONNECTION_STRING with missing connectionString', () => {
      expect(() => {
        // Missing connectionString field - validation checks for 'connectionString' in value
        validateSecretValue('CONNECTION_STRING', {
          type: 'CONNECTION_STRING',
        } as any);
      }).toThrow();
      
      // Verify it's the right error type
      try {
        validateSecretValue('CONNECTION_STRING', {
          type: 'CONNECTION_STRING',
        } as any);
      } catch (error: any) {
        expect(isInvalidSecretValueError(error)).toBe(true);
      }
    });
    
    it('should reject CONNECTION_STRING with empty connectionString', () => {
      expect(() => {
        validateSecretValue('CONNECTION_STRING', {
          type: 'CONNECTION_STRING',
          connectionString: '',
        } as any);
      }).toThrow();
      
      try {
        validateSecretValue('CONNECTION_STRING', {
          type: 'CONNECTION_STRING',
          connectionString: '',
        } as any);
      } catch (error: any) {
        expect(isInvalidSecretValueError(error)).toBe(true);
      }
    });
  });

  describe('JSON_CREDENTIAL', () => {
    it('should validate correct JSON_CREDENTIAL', () => {
      expect(() => {
        validateSecretValue('JSON_CREDENTIAL', {
          type: 'JSON_CREDENTIAL',
          credential: { key: 'value' },
        });
      }).not.toThrow();
    });

    it('should reject JSON_CREDENTIAL with missing credential', () => {
      expect(() => {
        validateSecretValue('JSON_CREDENTIAL', {
          type: 'JSON_CREDENTIAL',
        } as any);
      }).toThrow();
      
      try {
        validateSecretValue('JSON_CREDENTIAL', {
          type: 'JSON_CREDENTIAL',
        } as any);
      } catch (error: any) {
        expect(isInvalidSecretValueError(error)).toBe(true);
      }
    });
    
    it('should reject JSON_CREDENTIAL with non-object credential', () => {
      expect(() => {
        validateSecretValue('JSON_CREDENTIAL', {
          type: 'JSON_CREDENTIAL',
          credential: 'not-an-object',
        } as any);
      }).toThrow();
      
      try {
        validateSecretValue('JSON_CREDENTIAL', {
          type: 'JSON_CREDENTIAL',
          credential: 'not-an-object',
        } as any);
      } catch (error: any) {
        expect(isInvalidSecretValueError(error)).toBe(true);
      }
    });
  });

  describe('ENV_VARIABLE_SET', () => {
    it('should validate correct ENV_VARIABLE_SET', () => {
      expect(() => {
        validateSecretValue('ENV_VARIABLE_SET', {
          type: 'ENV_VARIABLE_SET',
          variables: { KEY1: 'value1', KEY2: 'value2' },
        });
      }).not.toThrow();
    });

    it('should reject ENV_VARIABLE_SET with missing variables', () => {
      expect(() => {
        validateSecretValue('ENV_VARIABLE_SET', {
          type: 'ENV_VARIABLE_SET',
        } as any);
      }).toThrow();
      
      try {
        validateSecretValue('ENV_VARIABLE_SET', {
          type: 'ENV_VARIABLE_SET',
        } as any);
      } catch (error: any) {
        expect(isInvalidSecretValueError(error)).toBe(true);
      }
    });
    
    it('should reject ENV_VARIABLE_SET with non-object variables', () => {
      expect(() => {
        validateSecretValue('ENV_VARIABLE_SET', {
          type: 'ENV_VARIABLE_SET',
          variables: 'not-an-object',
        } as any);
      }).toThrow();
      
      try {
        validateSecretValue('ENV_VARIABLE_SET', {
          type: 'ENV_VARIABLE_SET',
          variables: 'not-an-object',
        } as any);
      } catch (error: any) {
        expect(isInvalidSecretValueError(error)).toBe(true);
      }
    });
  });

  describe('CERTIFICATE', () => {
    it('should validate correct CERTIFICATE', () => {
      expect(() => {
        validateSecretValue('CERTIFICATE', {
          type: 'CERTIFICATE',
          certificate: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
        });
      }).not.toThrow();
    });

    it('should reject CERTIFICATE with missing certificate', () => {
      expect(() => {
        validateSecretValue('CERTIFICATE', {
          type: 'CERTIFICATE',
        } as any);
      }).toThrow();
      
      try {
        validateSecretValue('CERTIFICATE', {
          type: 'CERTIFICATE',
        } as any);
      } catch (error: any) {
        expect(isInvalidSecretValueError(error)).toBe(true);
      }
    });
    
    it('should reject CERTIFICATE with non-string certificate', () => {
      expect(() => {
        validateSecretValue('CERTIFICATE', {
          type: 'CERTIFICATE',
          certificate: 123,
        } as any);
      }).toThrow();
      
      try {
        validateSecretValue('CERTIFICATE', {
          type: 'CERTIFICATE',
          certificate: 123,
        } as any);
      } catch (error: any) {
        expect(isInvalidSecretValueError(error)).toBe(true);
      }
    });
  });

  describe('SSH_KEY', () => {
    it('should validate correct SSH_KEY', () => {
      expect(() => {
        validateSecretValue('SSH_KEY', {
          type: 'SSH_KEY',
          privateKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
        });
      }).not.toThrow();
    });

    it('should reject SSH_KEY with missing privateKey', () => {
      expect(() => {
        validateSecretValue('SSH_KEY', {
          type: 'SSH_KEY',
        } as any);
      }).toThrow();
      
      try {
        validateSecretValue('SSH_KEY', {
          type: 'SSH_KEY',
        } as any);
      } catch (error: any) {
        expect(isInvalidSecretValueError(error)).toBe(true);
      }
    });
    
    it('should reject SSH_KEY with non-string privateKey', () => {
      expect(() => {
        validateSecretValue('SSH_KEY', {
          type: 'SSH_KEY',
          privateKey: 123,
        } as any);
      }).toThrow();
      
      try {
        validateSecretValue('SSH_KEY', {
          type: 'SSH_KEY',
          privateKey: 123,
        } as any);
      } catch (error: any) {
        expect(isInvalidSecretValueError(error)).toBe(true);
      }
    });
  });
});

describe('validateSecretName - Edge Cases', () => {
  it('should accept name with numbers', () => {
    expect(() => {
      validateSecretName('secret123');
    }).not.toThrow();
  });

  it('should accept name starting with number', () => {
    expect(() => {
      validateSecretName('123secret');
    }).not.toThrow();
  });

  it('should reject name with invalid characters', () => {
    expect(() => {
      validateSecretName('secret@name');
    }).toThrow();
    
    try {
      validateSecretName('secret@name');
    } catch (error: any) {
      expect(isInvalidSecretValueError(error)).toBe(true);
    }
  });
  
  it('should reject name with only special characters', () => {
    expect(() => {
      validateSecretName('secret#name');
    }).toThrow();
    
    try {
      validateSecretName('secret#name');
    } catch (error: any) {
      expect(isInvalidSecretValueError(error)).toBe(true);
    }
  });
  
  it('should reject whitespace-only name', () => {
    expect(() => {
      validateSecretName('   ');
    }).toThrow();
    
    try {
      validateSecretName('   ');
    } catch (error: any) {
      expect(isInvalidSecretValueError(error)).toBe(true);
    }
  });
  
  it('should reject empty name', () => {
    expect(() => {
      validateSecretName('');
    }).toThrow();
    
    try {
      validateSecretName('');
    } catch (error: any) {
      expect(isInvalidSecretValueError(error)).toBe(true);
    }
  });
});

