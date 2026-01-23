/**
 * Test Data Fixtures
 * 
 * Provides test data for authentication tests
 */

export interface UserData {
  email: string;
  password: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Test data generator and fixtures
 */
export class TestData {
  // Standard valid password for testing
  static readonly VALID_PASSWORD = 'TestPassword123!';

  /**
   * Generate a valid user with random email
   */
  static generateValidUser(tenantId: string): UserData {
    return {
      email: this.generateEmail(),
      password: this.VALID_PASSWORD,
      tenantId,
      firstName: 'Test',
      lastName: 'User',
    };
  }

  /**
   * Generate a user with specific email
   */
  static generateUser(email: string, tenantId: string): UserData {
    return {
      email,
      password: this.VALID_PASSWORD,
      tenantId,
      firstName: 'Test',
      lastName: 'User',
    };
  }

  /**
   * Generate a random email address
   */
  static generateEmail(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `test-${timestamp}-${random}@test.local`;
  }

  /**
   * Generate a random tenant ID
   */
  static generateTenantId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `tenant-${timestamp}-${random}`;
  }

  /**
   * Get invalid email addresses for testing
   */
  static getInvalidEmails(): string[] {
    return [
      'notanemail',
      'missing@domain',
      '@nodomain.com',
      'spaces in@email.com',
      'email@',
      '',
      'no-at-symbol.com',
      'multiple@@at.com',
      'trailing-dot@domain.',
      '.leading-dot@domain.com',
    ];
  }

  /**
   * Get weak passwords for testing
   */
  static getWeakPasswords(): string[] {
    return [
      'short', // Too short
      'alllowercase', // No uppercase
      'ALLUPPERCASE', // No lowercase
      'NoNumbers!', // No numbers
      'NoSpecial123', // No special characters
      '1234567', // Too short and weak
      'password', // Common password
      '12345678', // Sequential numbers
      'qwerty', // Common keyboard pattern
    ];
  }

  /**
   * Get strong passwords for testing
   */
  static getStrongPasswords(): string[] {
    return [
      'StrongPass123!',
      'C0mpl3x&P@ssw0rd',
      'MyP@ssw0rd2024!',
      'S3cur3P@ss!',
      'V3ryStr0ng!Pass',
      'T3st!ngP@ssw0rd',
      'Secur1ty!First',
      'P@ssw0rd!123',
    ];
  }

  /**
   * Get malicious input for testing
   */
  static getMaliciousInputs(): string[] {
    return [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '"><script>alert(1)</script>',
      "'; DROP TABLE users; --",
      '../../etc/passwd',
      '${7*7}',
      '{{7*7}}',
      '<iframe src="javascript:alert(1)">',
    ];
  }

  /**
   * Get SQL injection attempts for testing
   */
  static getSQLInjections(): string[] {
    return [
      "' OR '1'='1",
      "admin'--",
      "' OR 1=1--",
      "'; DROP TABLE users; --",
      "1' UNION SELECT NULL--",
      "admin' OR '1'='1'#",
    ];
  }

  /**
   * Get XSS attempts for testing
   */
  static getXSSAttempts(): string[] {
    return [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<body onload=alert(1)>',
      '<iframe src="javascript:alert(1)">',
      '<input onfocus=alert(1) autofocus>',
    ];
  }

  /**
   * Get special characters for testing
   */
  static getSpecialCharacters(): string[] {
    return [
      '!@#$%^&*()',
      '[]{}|\\',
      '<>?/~`',
      '"\';--',
      '±§',
      '©®™',
      '¡¢£¤¥',
    ];
  }

  /**
   * Get UTF-8 characters for testing
   */
  static getUTF8Characters(): string[] {
    return [
      '李明', // Chinese
      'Müller', // German
      'José', // Spanish
      'Владимир', // Russian
      'محمد', // Arabic
      'Αλέξανδρος', // Greek
      '山田太郎', // Japanese
      '김민준', // Korean
    ];
  }

  /**
   * Get emoji characters for testing
   */
  static getEmojis(): string[] {
    return [
      '😀',
      '🎉',
      '❤️',
      '🚀',
      '⭐',
      '🌟',
      '💯',
      '🔥',
    ];
  }

  /**
   * Generate a random string
   */
  static randomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  /**
   * Generate a random number
   */
  static randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a random boolean
   */
  static randomBoolean(): boolean {
    return Math.random() < 0.5;
  }

  /**
   * Get sample tenant configurations
   */
  static getTenantConfigs(): Array<{
    tenantId: string;
    name: string;
    settings: any;
  }> {
    return [
      {
        tenantId: 'tenant-enterprise-1',
        name: 'Enterprise Corp',
        settings: {
          passwordPolicy: {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumber: true,
            requireSpecial: true,
          },
          mfaRequired: true,
          sessionTimeout: 3600,
        },
      },
      {
        tenantId: 'tenant-startup-1',
        name: 'Startup Inc',
        settings: {
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumber: true,
            requireSpecial: true,
          },
          mfaRequired: false,
          sessionTimeout: 7200,
        },
      },
      {
        tenantId: 'tenant-default',
        name: 'Default Tenant',
        settings: {
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumber: true,
            requireSpecial: true,
          },
          mfaRequired: false,
          sessionTimeout: 3600,
        },
      },
    ];
  }

  /**
   * Get sample user data
   */
  static getSampleUsers(tenantId: string): UserData[] {
    return [
      {
        email: 'admin@test.local',
        password: 'AdminPass123!',
        tenantId,
        firstName: 'Admin',
        lastName: 'User',
      },
      {
        email: 'user1@test.local',
        password: 'UserPass123!',
        tenantId,
        firstName: 'John',
        lastName: 'Doe',
      },
      {
        email: 'user2@test.local',
        password: 'UserPass456!',
        tenantId,
        firstName: 'Jane',
        lastName: 'Smith',
      },
    ];
  }
}
