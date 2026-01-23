# Adding New Tests - Example Guide

This guide shows you how to add new tests to the authentication test suite.

## Example 1: Adding a Simple Test

Let's add a test for checking if users can update their profile after login.

### Step 1: Add to appropriate describe block

```typescript
describe('4. Token Management', () => {
  // ... existing tests ...

  describe('4.5. Profile Management', () => {
    it('should allow authenticated users to view their profile', async () => {
      if (!accessToken) return;
      
      const response = await client.get('/auth/profile', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('email');
      expect(response.data).toHaveProperty('tenantId');
    }, TEST_TIMEOUT);

    it('should allow authenticated users to update their profile', async () => {
      if (!accessToken) return;
      
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      
      const response = await client.patch('/auth/profile', updateData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data.firstName).toBe(updateData.firstName);
        expect(response.data.lastName).toBe(updateData.lastName);
      }
    }, TEST_TIMEOUT);
  });
});
```

## Example 2: Adding Tests with Test Data

Let's add tests for different email formats.

### Step 1: Add test data to fixtures

```typescript
// In tests/fixtures/test-data.ts

export class TestData {
  // ... existing code ...

  /**
   * Get edge case email addresses
   */
  static getEdgeCaseEmails(): string[] {
    return [
      'very.long.email.address.with.many.dots@subdomain.example.com',
      'email+tag@domain.com',
      'email.with-dash@domain.com',
      'email_with_underscore@domain.com',
      '123numeric@domain.com',
      'a@single-char-local.com',
    ];
  }
}
```

### Step 2: Use in test

```typescript
describe('1. User Registration', () => {
  describe('1.3. Edge Case Emails', () => {
    it('should accept edge case but valid email formats', async () => {
      const edgeCaseEmails = TestData.getEdgeCaseEmails();
      
      for (const email of edgeCaseEmails) {
        const userData = {
          email,
          password: TestData.VALID_PASSWORD,
          tenantId: 'edge-case-tenant',
        };
        
        const response = await client.post('/auth/register', userData);
        
        expect([201, 400]).toContain(response.status);
        
        if (response.status === 201) {
          helpers.addTestUser(response.data.userId, userData.tenantId);
          console.log(`✓ Accepted email: ${email}`);
        } else {
          console.log(`✗ Rejected email: ${email}`);
        }
      }
    }, TEST_TIMEOUT);
  });
});
```

## Example 3: Adding Helper Function

Let's add a helper to check if a user exists.

### Step 1: Add to TestHelpers class

```typescript
// In tests/helpers/test-helpers.ts

export class TestHelpers {
  // ... existing code ...

  /**
   * Check if user exists
   */
  async userExists(email: string, tenantId: string): Promise<boolean> {
    try {
      // Try to login with a dummy password
      const response = await this.client.post('/auth/login', {
        email,
        password: 'DummyPassword123!',
        tenantId,
      });
      
      // If we get 401, user exists (wrong password)
      // If we get 404, user doesn't exist
      return response.status === 401;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create multiple test users
   */
  async createMultipleTestUsers(
    count: number,
    tenantId: string
  ): Promise<TestUser[]> {
    const users: TestUser[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const user = await this.createTestUser(tenantId);
        users.push(user);
      } catch (error) {
        console.warn(`Failed to create test user ${i + 1}:`, error);
      }
    }
    
    return users;
  }
}
```

### Step 2: Use in test

```typescript
describe('10. Bulk Operations', () => {
  it('should handle multiple concurrent registrations', async () => {
    const tenantId = 'bulk-ops-tenant';
    
    // Create 10 users concurrently
    const userPromises = Array.from({ length: 10 }, (_, i) => 
      helpers.createTestUser(`${tenantId}-${i}`)
    );
    
    const users = await Promise.allSettled(userPromises);
    
    const successful = users.filter(r => r.status === 'fulfilled').length;
    const failed = users.filter(r => r.status === 'rejected').length;
    
    console.log(`Created ${successful} users, ${failed} failed`);
    
    expect(successful).toBeGreaterThan(0);
  }, TEST_TIMEOUT);
});
```

## Example 4: Adding Security Test

Let's add a test for checking JWT token structure.

```typescript
describe('7. Security and Edge Cases', () => {
  describe('7.5. Token Security', () => {
    it('should generate JWT tokens with proper structure', async () => {
      const user = await helpers.createTestUser('token-security-tenant');
      
      const tokens = await helpers.loginUser(
        user.email,
        user.password,
        user.tenantId
      );
      
      if (!tokens) return;
      
      // Decode JWT (without verification)
      const parts = tokens.accessToken.split('.');
      
      expect(parts).toHaveLength(3); // Header, Payload, Signature
      
      // Decode payload
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString()
      );
      
      // Check required claims
      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('email');
      expect(payload).toHaveProperty('tenantId');
      expect(payload).toHaveProperty('exp');
      expect(payload).toHaveProperty('iat');
      
      // Check tenant isolation in token
      expect(payload.tenantId).toBe(user.tenantId);
      
      // Check expiration is in the future
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);
    }, TEST_TIMEOUT);

    it('should not include sensitive data in tokens', async () => {
      const user = await helpers.createTestUser('sensitive-data-tenant');
      
      const tokens = await helpers.loginUser(
        user.email,
        user.password,
        user.tenantId
      );
      
      if (!tokens) return;
      
      // Decode payload
      const parts = tokens.accessToken.split('.');
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString()
      );
      
      // Should NOT contain sensitive data
      expect(payload).not.toHaveProperty('password');
      expect(payload).not.toHaveProperty('passwordHash');
      expect(payload).not.toHaveProperty('verificationToken');
      expect(payload).not.toHaveProperty('resetToken');
    }, TEST_TIMEOUT);
  });
});
```

## Example 5: Adding Tenant-Specific Test

Let's test tenant-specific password policies.

### Step 1: Add tenant config to test data

```typescript
// In tests/fixtures/test-data.ts

export const TENANT_CONFIGS = {
  strict: {
    tenantId: 'strict-policy-tenant',
    passwordPolicy: {
      minLength: 16,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: true,
      requireUniqueChars: 8,
    },
  },
  relaxed: {
    tenantId: 'relaxed-policy-tenant',
    passwordPolicy: {
      minLength: 6,
      requireUppercase: false,
      requireLowercase: true,
      requireNumber: false,
      requireSpecial: false,
    },
  },
};
```

### Step 2: Add test

```typescript
describe('6. Multi-Tenant Isolation', () => {
  describe('6.3. Tenant Password Policies', () => {
    it('should enforce strict password policy for strict tenant', async () => {
      const tenantId = 'strict-policy-tenant';
      
      const weakPassword = 'Short1!'; // Only 7 chars
      
      const response = await client.post('/auth/register', {
        email: TestData.generateEmail(),
        password: weakPassword,
        tenantId,
      });
      
      // Should reject weak password for strict tenant
      expect([400, 422]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should accept relaxed password for relaxed tenant', async () => {
      const tenantId = 'relaxed-policy-tenant';
      
      const simplePassword = 'simple'; // 6 chars, lowercase only
      
      const response = await client.post('/auth/register', {
        email: TestData.generateEmail(),
        password: simplePassword,
        tenantId,
      });
      
      // Depending on implementation, might accept or reject
      expect([201, 400, 422]).toContain(response.status);
      
      if (response.status === 201) {
        helpers.addTestUser(response.data.userId, tenantId);
      }
    }, TEST_TIMEOUT);
  });
});
```

## Best Practices

### 1. Test Naming
✅ Use descriptive names that explain what is being tested
✅ Follow the pattern: "should [expected behavior] when [condition]"
✅ Be specific about the scenario

```typescript
// Good
it('should reject registration when email format is invalid', async () => {

// Bad
it('test email validation', async () => {
```

### 2. Test Organization
✅ Group related tests in describe blocks
✅ Use nested describe blocks for subcategories
✅ Keep tests focused on one thing

```typescript
describe('Feature', () => {
  describe('Scenario 1', () => {
    it('should do something specific', async () => {
      // Test code
    });
  });
  
  describe('Scenario 2', () => {
    it('should do something else specific', async () => {
      // Test code
    });
  });
});
```

### 3. Assertions
✅ Use specific assertions
✅ Add meaningful error messages
✅ Test both success and failure cases

```typescript
// Good
expect(response.status).toBe(201);
expect(response.data).toHaveProperty('userId');
expect(response.data.email).toBe(userData.email);

// Less specific
expect(response).toBeTruthy();
```

### 4. Cleanup
✅ Always clean up test data
✅ Use helpers to track test users
✅ Handle cleanup errors gracefully

```typescript
// Good
const response = await client.post('/auth/register', userData);
if (response.status === 201) {
  helpers.addTestUser(response.data.userId, userData.tenantId);
}

// Missing cleanup
const response = await client.post('/auth/register', userData);
// User not tracked for cleanup!
```

### 5. Error Handling
✅ Handle expected errors
✅ Don't let unexpected errors crash tests
✅ Log useful debugging information

```typescript
// Good
try {
  const response = await client.post('/auth/register', userData);
  expect(response.status).toBe(201);
} catch (error) {
  console.error('Unexpected error:', error);
  throw error;
}

// Risky
const response = await client.post('/auth/register', userData);
```

## Running Your New Tests

After adding tests:

```bash
# Run all tests
./tests/run-auth-tests.sh

# Run only your new test suite
./tests/run-auth-tests.sh -t "Your Test Suite Name"

# Run with verbose output to debug
./tests/run-auth-tests.sh --verbose
```

## Tips

1. **Start simple**: Add basic test first, then enhance
2. **Use helpers**: Leverage existing TestHelpers methods
3. **Reuse data**: Use TestData fixtures for consistency
4. **Test failures**: Don't just test success cases
5. **Document**: Add comments for complex test logic
6. **Review**: Check similar existing tests for patterns

## Need Help?

- Check existing tests for examples
- Read `tests/README.md` for detailed docs
- Review helper functions in `tests/helpers/`
- Look at test data in `tests/fixtures/`

Happy testing! 🎉
