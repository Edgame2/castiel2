/**
 * User Test Fixtures
 */

export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    name: 'Test User',
    username: 'testuser',
  },
  invalidUser: {
    email: 'invalid-email',
    password: '123',
  },
  oauthUser: {
    email: 'oauth@example.com',
    firstName: 'OAuth',
    lastName: 'User',
    provider: 'google',
    providerUserId: 'google-123',
  },
};

export const testTokens = {
  validJWT: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJpYXQiOjE2MDAwMDAwMDB9.test-signature',
  invalidJWT: 'invalid.jwt.token',
  expiredJWT: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJleHAiOjE2MDAwMDAwMDB9.expired-signature',
};

export const testPasswords = {
  valid: 'TestPassword123!',
  tooShort: 'Short1!',
  tooWeak: 'password',
  common: 'password123',
  withPersonalInfo: 'TestUser123!',
};


