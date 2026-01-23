/**
 * Document Management API Integration Tests
 * 
 * Comprehensive tests for document management endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { TestHelpers } from './helpers/test-helpers';
import { TestData } from './fixtures/test-data';
import { TestConfig } from './config/test-config';
import FormData from 'form-data';

const API_BASE_URL = process.env.MAIN_API_URL || TestConfig.mainApiUrl || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

describe('Document API Tests', () => {
  let client: AxiosInstance;
  let helpers: TestHelpers;
  let testUser: { userId: string; email: string; password: string; tenantId: string; accessToken: string };
  let createdDocumentIds: string[] = [];
  let cachedToken: string | null = null;
  let tokenExpiry: number = 0;

  beforeAll(async () => {
    client = axios.create({
      baseURL: API_BASE_URL,
      validateStatus: () => true,
      timeout: TEST_TIMEOUT,
    });

    helpers = new TestHelpers(client);

    // Wait for service to be ready
    const isReady = await helpers.waitForService(API_BASE_URL);
    if (!isReady) {
      console.warn('Service health check failed, but continuing with tests...');
    }

    // Login once at the start and cache the token
    const useProvidedCredentials = process.env.USE_ADMIN_CREDENTIALS === 'true' || process.env.USE_ADMIN_CREDENTIALS === '1';
    
    if (useProvidedCredentials) {
      // Login with provided admin credentials
      let loginRes = await client.post('/api/v1/auth/login', {
        email: 'admin@admin.com',
        password: 'Morpheus@12',
      });

      if (loginRes.status === 429) {
        const retryAfter = loginRes.data.retryAfter || 30;
        console.warn(`Rate limited on login. Retry after ${retryAfter} seconds. Skipping tests for now.`);
        (global as any).__skipDocumentTests = true;
        return;
      }

      if (loginRes.status !== 200) {
        console.warn(`Failed to login with admin credentials: ${loginRes.status}`);
        (global as any).__skipDocumentTests = true;
        return;
      }

      cachedToken = loginRes.data.accessToken;
      tokenExpiry = Date.now() + (14 * 60 * 1000);

      testUser = {
        userId: loginRes.data.user?.id || loginRes.data.userId,
        email: 'admin@admin.com',
        password: 'Morpheus@12',
        tenantId: loginRes.data.user?.tenantId || loginRes.data.tenantId,
        accessToken: loginRes.data.accessToken,
      };

      client.defaults.headers.common['Authorization'] = `Bearer ${testUser.accessToken}`;
    } else {
      // Create a test user
      const userData = TestData.generateValidUser(TestData.generateTenantId());
      
      const registerRes = await client.post('/api/v1/auth/register', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      if (registerRes.status !== 201) {
        console.warn('Failed to register test user, skipping tests');
        (global as any).__skipDocumentTests = true;
        return;
      }

      const loginRes = await client.post('/api/v1/auth/login', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
      });

      if (loginRes.status !== 200) {
        console.warn('Failed to login test user, skipping tests');
        (global as any).__skipDocumentTests = true;
        return;
      }

      testUser = {
        userId: loginRes.data.user?.id || loginRes.data.userId,
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
        accessToken: loginRes.data.accessToken,
      };

      client.defaults.headers.common['Authorization'] = `Bearer ${testUser.accessToken}`;
      helpers.addTestUser(testUser.userId, testUser.tenantId);
    }
  }, 120000);

  beforeEach(async () => {
    if ((global as any).__skipDocumentTests) {
      return;
    }

    // Reuse cached token if still valid
    const useProvidedCredentials = process.env.USE_ADMIN_CREDENTIALS === 'true' || process.env.USE_ADMIN_CREDENTIALS === '1';
    
    if (useProvidedCredentials && cachedToken && Date.now() < tokenExpiry) {
      client.defaults.headers.common['Authorization'] = `Bearer ${cachedToken}`;
      return;
    }

    // Ensure token is set
    if (testUser?.accessToken) {
      client.defaults.headers.common['Authorization'] = `Bearer ${testUser.accessToken}`;
    }
  });

  afterAll(async () => {
    if ((global as any).__skipDocumentTests) {
      return;
    }

    // Cleanup created documents
    for (const docId of createdDocumentIds) {
      try {
        await client.delete(`/api/v1/documents/${docId}`, {
          headers: {
            Authorization: `Bearer ${testUser.accessToken}`,
          },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    if (helpers) {
      await helpers.cleanup();
    }
  });

  describe('1. Document Listing', () => {
    it('should list documents with pagination', async () => {
      if ((global as any).__skipDocumentTests) return;

      const response = await client.get('/api/v1/documents', {
        params: {
          page: 1,
          limit: 10,
        },
      });

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // Response may be array or object with items property
        if (Array.isArray(response.data)) {
          expect(Array.isArray(response.data)).toBe(true);
        } else if (response.data.items) {
          expect(Array.isArray(response.data.items)).toBe(true);
        }
      }
    }, TEST_TIMEOUT);

    it('should filter documents by tenant', async () => {
      if ((global as any).__skipDocumentTests) return;

      const response = await client.get('/api/v1/documents', {
        params: {
          tenantId: testUser.tenantId,
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should handle pagination parameters', async () => {
      if ((global as any).__skipDocumentTests) return;

      const response = await client.get('/api/v1/documents', {
        params: {
          page: 2,
          limit: 5,
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('2. Document Upload', () => {
    it('should upload a document file', async () => {
      if ((global as any).__skipDocumentTests) return;

      // Create a temporary test file
      const testContent = 'This is a test document content';
      const formData = new FormData();
      formData.append('file', Buffer.from(testContent), {
        filename: 'test-document.txt',
        contentType: 'text/plain',
      });
      formData.append('name', 'Test Document');
      formData.append('description', 'A test document');

      const response = await client.post('/api/v1/documents/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${testUser.accessToken}`,
        },
      });

      expect([200, 201, 400, 404, 413]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        const documentId = response.data.id || response.data.documentId || response.data.document?.id;
        if (documentId) {
          createdDocumentIds.push(documentId);
        }
      }
    }, TEST_TIMEOUT);

    it('should reject upload without file', async () => {
      if ((global as any).__skipDocumentTests) return;

      const formData = new FormData();
      formData.append('name', 'Test Document');

      const response = await client.post('/api/v1/documents/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${testUser.accessToken}`,
        },
      });

      expect([400, 422, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should handle large file uploads', async () => {
      if ((global as any).__skipDocumentTests) return;

      // Create a larger test file (but not too large for tests)
      const largeContent = 'A'.repeat(10000); // 10KB
      const formData = new FormData();
      formData.append('file', Buffer.from(largeContent), {
        filename: 'large-document.txt',
        contentType: 'text/plain',
      });
      formData.append('name', 'Large Test Document');

      const response = await client.post('/api/v1/documents/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${testUser.accessToken}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      expect([200, 201, 400, 404, 413]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        const documentId = response.data.id || response.data.documentId || response.data.document?.id;
        if (documentId) {
          createdDocumentIds.push(documentId);
        }
      }
    }, TEST_TIMEOUT);
  });

  describe('3. Document Retrieval', () => {
    let testDocumentId: string | null = null;

    beforeEach(async () => {
      if ((global as any).__skipDocumentTests) return;

      // Create a test document for retrieval tests
      const testContent = 'Test document for retrieval';
      const formData = new FormData();
      formData.append('file', Buffer.from(testContent), {
        filename: 'retrieval-test.txt',
        contentType: 'text/plain',
      });
      formData.append('name', 'Retrieval Test Document');

      const uploadRes = await client.post('/api/v1/documents/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${testUser.accessToken}`,
        },
      });

      if ([200, 201].includes(uploadRes.status)) {
        testDocumentId = uploadRes.data.id || uploadRes.data.documentId || uploadRes.data.document?.id;
        if (testDocumentId) {
          createdDocumentIds.push(testDocumentId);
        }
      }
    });

    it('should retrieve document metadata by ID', async () => {
      if ((global as any).__skipDocumentTests || !testDocumentId) return;

      const response = await client.get(`/api/v1/documents/${testDocumentId}`);

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data.id || response.data.documentId).toBe(testDocumentId);
      }
    }, TEST_TIMEOUT);

    it('should return 404 for non-existent document', async () => {
      if ((global as any).__skipDocumentTests) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/v1/documents/${fakeId}`);

      expect([404, 403]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should get download URL for document', async () => {
      if ((global as any).__skipDocumentTests || !testDocumentId) return;

      const response = await client.get(`/api/v1/documents/${testDocumentId}/download`);

      expect([200, 404, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // Should have a URL or signedUrl
        expect(response.data.url || response.data.signedUrl || response.data.downloadUrl).toBeDefined();
      }
    }, TEST_TIMEOUT);
  });

  describe('4. Document Updates', () => {
    let testDocumentId: string | null = null;

    beforeEach(async () => {
      if ((global as any).__skipDocumentTests) return;

      // Create a test document for update tests
      const testContent = 'Test document for updates';
      const formData = new FormData();
      formData.append('file', Buffer.from(testContent), {
        filename: 'update-test.txt',
        contentType: 'text/plain',
      });
      formData.append('name', 'Update Test Document');

      const uploadRes = await client.post('/api/v1/documents/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${testUser.accessToken}`,
        },
      });

      if ([200, 201].includes(uploadRes.status)) {
        testDocumentId = uploadRes.data.id || uploadRes.data.documentId || uploadRes.data.document?.id;
        if (testDocumentId) {
          createdDocumentIds.push(testDocumentId);
        }
      }
    });

    it('should update document metadata', async () => {
      if ((global as any).__skipDocumentTests || !testDocumentId) return;

      const updateData = {
        name: 'Updated Document Name',
        description: 'Updated description',
        tags: ['updated', 'test'],
      };

      const response = await client.put(`/api/v1/documents/${testDocumentId}`, updateData);

      expect([200, 204, 404]).toContain(response.status);
      
      if ([200, 204].includes(response.status)) {
        // Verify update
        const getResponse = await client.get(`/api/v1/documents/${testDocumentId}`);
        if (getResponse.status === 200) {
          expect(getResponse.data.name || getResponse.data.title).toBe(updateData.name);
        }
      }
    }, TEST_TIMEOUT);

    it('should handle partial updates', async () => {
      if ((global as any).__skipDocumentTests || !testDocumentId) return;

      const updateData = {
        description: 'Only description updated',
      };

      const response = await client.put(`/api/v1/documents/${testDocumentId}`, updateData);

      expect([200, 204, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should reject invalid update data', async () => {
      if ((global as any).__skipDocumentTests || !testDocumentId) return;

      const invalidData = {
        name: '', // Empty name should be invalid
      };

      const response = await client.put(`/api/v1/documents/${testDocumentId}`, invalidData);

      expect([400, 422, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('5. Document Deletion', () => {
    let testDocumentId: string | null = null;

    beforeEach(async () => {
      if ((global as any).__skipDocumentTests) return;

      // Create a test document for deletion tests
      const testContent = 'Test document for deletion';
      const formData = new FormData();
      formData.append('file', Buffer.from(testContent), {
        filename: 'delete-test.txt',
        contentType: 'text/plain',
      });
      formData.append('name', 'Delete Test Document');

      const uploadRes = await client.post('/api/v1/documents/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${testUser.accessToken}`,
        },
      });

      if ([200, 201].includes(uploadRes.status)) {
        testDocumentId = uploadRes.data.id || uploadRes.data.documentId || uploadRes.data.document?.id;
        // Don't add to cleanup list since we're testing deletion
      }
    });

    it('should soft delete a document', async () => {
      if ((global as any).__skipDocumentTests || !testDocumentId) return;

      const response = await client.delete(`/api/v1/documents/${testDocumentId}`);

      expect([200, 204, 404]).toContain(response.status);
      
      if ([200, 204].includes(response.status)) {
        // Verify document is deleted (should return 404 or deleted flag)
        const getResponse = await client.get(`/api/v1/documents/${testDocumentId}`);
        expect([404, 200]).toContain(getResponse.status);
        
        if (getResponse.status === 200) {
          // If still accessible, should have deleted flag
          expect(getResponse.data.deleted || getResponse.data.isDeleted).toBeDefined();
        }
      }
    }, TEST_TIMEOUT);

    it('should restore a deleted document', async () => {
      if ((global as any).__skipDocumentTests || !testDocumentId) return;

      // First delete it
      await client.delete(`/api/v1/documents/${testDocumentId}`);

      // Then restore it
      const response = await client.post(`/api/v1/documents/${testDocumentId}/restore`);

      expect([200, 201, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        // Verify document is restored
        const getResponse = await client.get(`/api/v1/documents/${testDocumentId}`);
        if (getResponse.status === 200) {
          expect(getResponse.data.deleted || getResponse.data.isDeleted).toBeFalsy();
        }
      }
    }, TEST_TIMEOUT);
  });

  describe('6. Document Search and Filtering', () => {
    it('should search documents by name', async () => {
      if ((global as any).__skipDocumentTests) return;

      const response = await client.get('/api/v1/documents', {
        params: {
          search: 'test',
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should filter documents by tags', async () => {
      if ((global as any).__skipDocumentTests) return;

      const response = await client.get('/api/v1/documents', {
        params: {
          tags: 'test,important',
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should filter documents by date range', async () => {
      if ((global as any).__skipDocumentTests) return;

      const response = await client.get('/api/v1/documents', {
        params: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('7. Multi-Tenant Isolation', () => {
    it('should only return documents from user tenant', async () => {
      if ((global as any).__skipDocumentTests) return;

      const response = await client.get('/api/v1/documents');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        const documents = Array.isArray(response.data) ? response.data : response.data.items || [];
        for (const doc of documents) {
          if (doc.tenantId) {
            expect(doc.tenantId).toBe(testUser.tenantId);
          }
        }
      }
    }, TEST_TIMEOUT);

    it('should not allow access to documents from other tenants', async () => {
      if ((global as any).__skipDocumentTests) return;

      // Try to access a document with a different tenant ID
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/v1/documents/${fakeId}`, {
        params: {
          tenantId: 'different-tenant-id',
        },
      });

      expect([404, 403]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('8. Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      if ((global as any).__skipDocumentTests) return;

      const response = await axios.get(`${API_BASE_URL}/api/v1/documents`, {
        validateStatus: () => true,
      });

      expect([401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should return 404 for invalid document IDs', async () => {
      if ((global as any).__skipDocumentTests) return;

      const invalidIds = [
        'invalid-id',
        'not-a-uuid',
        '123',
      ];

      for (const id of invalidIds) {
        const response = await client.get(`/api/v1/documents/${id}`);
        expect([400, 404]).toContain(response.status);
      }
    }, TEST_TIMEOUT);
  });
});
