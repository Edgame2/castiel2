/**
 * Test Helper Functions
 * 
 * Provides utility functions for:
 * - Service health checks
 * - Test user management
 * - Test data cleanup
 * - Common operations
 */

import type { AxiosInstance } from 'axios';

export interface TestUser {
  userId: string;
  email: string;
  password: string;
  tenantId: string;
}

/**
 * Helper class for managing test operations
 */
export class TestHelpers {
  private client: AxiosInstance;
  private testUsers: TestUser[] = [];
  private maxRetries = 30;
  private retryDelay = 1000;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  /**
   * Wait for service to be ready
   */
  async waitForService(url: string): Promise<boolean> {
    console.log(`Waiting for service at ${url}...`);
    
    // Try multiple health check endpoints
    const healthEndpoints = ['/health', '/api/health', '/health/ready', '/api/health/ready'];
    
    for (let i = 0; i < this.maxRetries; i++) {
      for (const endpoint of healthEndpoints) {
        try {
          const response = await this.client.get(endpoint, {
            timeout: 5000,
            validateStatus: () => true,
          });
          
          if (response.status === 200 || response.status === 204) {
            console.log(`Service is ready! (checked ${endpoint})`);
            return true;
          }
        } catch (error) {
          // Try next endpoint
          continue;
        }
      }
      
      // If no endpoint worked, wait and retry
      if (i < this.maxRetries - 1) {
        await this.sleep(this.retryDelay);
      }
    }
    
    // If health check fails, try a simple API endpoint to see if service is up
    try {
      const response = await this.client.get('/api/auth/me', {
        timeout: 2000,
        validateStatus: () => true,
      });
      // If we get any response (even 401), service is up
      if (response.status !== undefined) {
        console.log('Service appears to be running (health check failed but API responds)');
        return true;
      }
    } catch (error) {
      // Service not responding
    }
    
    console.warn('Service did not become ready in time');
    return false;
  }

  /**
   * Create a test user
   */
  async createTestUser(tenantId: string): Promise<TestUser> {
    const email = this.generateEmail();
    const password = 'TestPass123!';
    
      const response = await this.client.post('/api/v1/auth/register', {
      email,
      password,
      tenantId,
      firstName: 'Test',
      lastName: 'User',
    });
    
    if (response.status !== 201) {
      throw new Error(`Failed to create test user: ${response.status}`);
    }
    
    const testUser: TestUser = {
      userId: response.data.userId,
      email,
      password,
      tenantId,
    };
    
    this.testUsers.push(testUser);
    
    return testUser;
  }

  /**
   * Add a test user to cleanup list
   */
  addTestUser(userId: string, tenantId: string): void {
    // Only add if not already in list
    const exists = this.testUsers.some(u => u.userId === userId && u.tenantId === tenantId);
    
    if (!exists) {
      this.testUsers.push({
        userId,
        email: '',
        password: '',
        tenantId,
      });
    }
  }

  /**
   * Generate a random email address
   */
  generateEmail(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `test-${timestamp}-${random}@test.local`;
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup all test data
   */
  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.testUsers.length} test users...`);
    
    // In a real scenario, you would call a cleanup endpoint or delete users
    // For now, we'll just log the cleanup
    
    // Note: Implement actual cleanup based on your API
    // Example:
    // for (const user of this.testUsers) {
    //   try {
    //     await this.client.delete(`/users/${user.userId}`, {
    //       params: { tenantId: user.tenantId }
    //     });
    //   } catch (error) {
    //     console.warn(`Failed to delete user ${user.userId}:`, error);
    //   }
    // }
    
    this.testUsers = [];
  }

  /**
   * Get list of test users
   */
  getTestUsers(): TestUser[] {
    return [...this.testUsers];
  }

  /**
   * Clear test users list
   */
  clearTestUsers(): void {
    this.testUsers = [];
  }

  /**
   * Login a user and return tokens
   */
  async loginUser(email: string, password: string, tenantId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  } | null> {
    try {
      const response = await this.client.post('/api/v1/auth/login', {
        email,
        password,
        tenantId,
      });
      
      if (response.status === 200) {
        return {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify an email (for testing purposes)
   */
  async verifyEmail(token: string, tenantId: string): Promise<boolean> {
    try {
      const response = await this.client.get(`/api/v1/auth/verify-email/${token}`, {
        params: { tenantId },
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string, tenantId: string): Promise<boolean> {
    try {
      const response = await this.client.post('/api/v1/auth/forgot-password', {
        email,
        tenantId,
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string, tenantId: string): Promise<boolean> {
    try {
      const response = await this.client.post('/api/v1/auth/reset-password', {
        token,
        password: newPassword,
        tenantId,
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  } | null> {
    try {
      const response = await this.client.post('/api/v1/auth/refresh', {
        refreshToken,
      });
      
      if (response.status === 200) {
        return {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Logout user
   */
  async logout(accessToken: string, refreshToken: string): Promise<boolean> {
    try {
      const response = await this.client.post('/api/v1/auth/logout', {
        refreshToken,
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      return [200, 204].includes(response.status);
    } catch (error) {
      return false;
    }
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const response = await this.client.post('/api/v1/auth/revoke', {
        token,
      });
      
      return [200, 204].includes(response.status);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await this.client.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (response.status === 200) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Introspect token
   */
  async introspectToken(token: string): Promise<any> {
    try {
      const response = await this.client.post('/api/v1/auth/introspect', {
        token,
      });
      
      if (response.status === 200) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute a function with retry logic
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxAttempts) {
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError || new Error('Retry failed');
  }
}
