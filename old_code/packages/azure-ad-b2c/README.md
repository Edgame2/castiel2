# @castiel/azure-ad-b2c

Azure AD B2C integration utilities for Castiel authentication services.

## Features

- 🔐 **Azure AD B2C Client** - Complete authentication flow management
- ✅ **Token Validation** - JWT token validation with JWKS key caching
- 🔄 **Token Refresh** - Automatic token refresh with rotation
- 👤 **User Flows** - Support for sign-up, sign-in, password reset, profile editing
- 🌐 **OAuth Providers** - Google, GitHub, Microsoft integration
- 🏢 **Enterprise SSO** - SAML 2.0 support for Okta, Azure AD, Google Workspace
- 📝 **TypeScript** - Fully typed with comprehensive interfaces

## Installation

```bash
pnpm add @castiel/azure-ad-b2c
```

## Configuration

Create an Azure AD B2C configuration object:

```typescript
import { AzureAdB2CConfig } from '@castiel/azure-ad-b2c';

const config: AzureAdB2CConfig = {
  tenantName: 'castiel-auth',
  tenantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  clientId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  clientSecret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  domain: 'castiel-auth.b2clogin.com',
  customDomain: 'auth.castiel.com', // Optional
  policies: {
    signUpSignIn: 'B2C_1_signupsignin',
    passwordReset: 'B2C_1_passwordreset',
    profileEdit: 'B2C_1_profileedit',
  },
  redirectUri: 'http://localhost:3001/auth/callback',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  validation: {
    clockSkew: 300, // 5 minutes
    validateIssuer: true,
    validateAudience: true,
  },
};
```

## Usage

### Initialize Client

```typescript
import { AzureAdB2CClient } from '@castiel/azure-ad-b2c';

const b2cClient = new AzureAdB2CClient(config);
```

### Authentication Flows

#### Email/Password Sign-up/Sign-in

```typescript
// Generate login URL
const loginUrl = await b2cClient.buildLoginUrl(
  'http://localhost:3001/auth/callback',
  'random-state-value',
  'user@example.com' // Optional login hint
);

// Redirect user to loginUrl
response.redirect(loginUrl);

// Handle callback
app.post('/auth/callback', async (request, reply) => {
  const { code, state } = request.body;
  
  // Verify state for CSRF protection
  if (state !== storedState) {
    return reply.code(400).send({ error: 'Invalid state' });
  }
  
  // Exchange code for tokens
  const result = await b2cClient.acquireTokenByCode({
    code,
    redirectUri: 'http://localhost:3001/auth/callback',
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    authority: b2cClient.getAuthorityForFlow(UserFlowType.SignUpSignIn),
  });
  
  // Store tokens securely
  await storeTokens(result);
  
  // Access user info from ID token claims
  const userInfo = result.account.idTokenClaims;
  console.log('User:', userInfo.email, userInfo.name);
  
  reply.redirect('/dashboard');
});
```

#### Password Reset Flow

```typescript
// Generate password reset URL
const resetUrl = await b2cClient.buildPasswordResetUrl(
  'http://localhost:3001/auth/callback',
  'random-state-value'
);

response.redirect(resetUrl);

// Handle callback (same as login)
```

#### OAuth Provider Login (Google, GitHub)

```typescript
// Google login
const googleLoginUrl = await b2cClient.buildOAuthLoginUrl(
  'google',
  'http://localhost:3001/auth/callback',
  'random-state-value'
);

// GitHub login
const githubLoginUrl = await b2cClient.buildOAuthLoginUrl(
  'github',
  'http://localhost:3001/auth/callback',
  'random-state-value'
);

response.redirect(googleLoginUrl);
```

#### Enterprise SSO (SAML)

```typescript
// Organization SSO login
const ssoUrl = await b2cClient.buildSsoLoginUrl(
  'org-12345', // Organization ID
  'http://localhost:3001/auth/callback',
  'random-state-value'
);

response.redirect(ssoUrl);
```

### Token Refresh

```typescript
import { MonitoringService } from '@castiel/monitoring';

const monitoring = MonitoringService.getInstance();

// Refresh access token
try {
  const newTokens = await b2cClient.acquireTokenByRefreshToken({
    refreshToken: storedRefreshToken,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    authority: b2cClient.getAuthorityForFlow(UserFlowType.SignUpSignIn),
  });
  
  // Update stored tokens
  await updateTokens(newTokens);
  
  monitoring.trackEvent('token.refreshed', {
    userId: newTokens.account.localAccountId,
  });
} catch (error) {
  monitoring.trackException(error as Error, { operation: 'token_refresh' });
  // Refresh token expired or invalid, redirect to login
  response.redirect('/login');
}
```

### Token Validation

```typescript
import { B2CTokenValidator } from '@castiel/azure-ad-b2c';

const validator = new B2CTokenValidator(config);

// Validate JWT token
const validationResult = await validator.validateToken(accessToken);

if (!validationResult.valid) {
  return reply.code(401).send({
    error: validationResult.error,
    message: validationResult.errorDescription,
  });
}

// Access validated claims
const claims = validationResult.claims!;
console.log('User ID:', claims.sub);
console.log('Email:', claims.emails?.[0]);
console.log('Name:', claims.name);
console.log('Identity Provider:', claims.idp);

// Extract specific information
const userId = validator.getUserIdFromToken(accessToken);
const email = validator.getEmailFromToken(accessToken);
const provider = validator.getIdentityProviderFromToken(accessToken);

// Check if token is expired
if (validator.isTokenExpired(accessToken)) {
  // Attempt to refresh
}
```

### Fastify Middleware Example

```typescript
import { B2CTokenValidator } from '@castiel/azure-ad-b2c';
import type { FastifyRequest, FastifyReply } from 'fastify';

const validator = new B2CTokenValidator(config);

// Authentication middleware
export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  
  // Validate token
  const validation = await validator.validateToken(token);
  
  if (!validation.valid) {
    return reply.code(401).send({
      error: 'Invalid token',
      details: validation.errorDescription,
    });
  }
  
  // Attach user info to request
  (request as any).user = {
    id: validation.claims!.sub,
    email: validation.claims!.emails?.[0],
    name: validation.claims!.name,
    provider: validation.claims!.idp,
    claims: validation.claims,
  };
}

// Protected route
fastify.get('/api/profile', { preHandler: authenticateToken }, async (request, reply) => {
  const user = (request as any).user;
  return { profile: user };
});
```

### Error Handling

```typescript
import { B2CErrorCode } from '@castiel/azure-ad-b2c';

app.post('/auth/callback', async (request, reply) => {
  const { error, error_description } = request.body;
  
  if (error) {
    // Handle B2C errors
    switch (error) {
      case B2CErrorCode.USER_CANCELLED:
        // User cancelled the flow
        return reply.redirect('/login?cancelled=true');
        
      case B2CErrorCode.PASSWORD_RESET_REQUIRED:
        // User forgot password
        const resetUrl = await b2cClient.buildPasswordResetUrl(
          request.body.redirect_uri,
          request.body.state
        );
        return reply.redirect(resetUrl);
        
      case B2CErrorCode.INVALID_GRANT:
        // Authorization code expired or used
        return reply.redirect('/login?error=expired');
        
      default:
        monitoring.trackException(new Error(error_description), {
          errorCode: error,
        });
        return reply.redirect('/login?error=auth_failed');
    }
  }
  
  // Continue with normal flow...
});
```

## API Reference

### AzureAdB2CClient

#### Constructor

```typescript
new AzureAdB2CClient(config: AzureAdB2CConfig)
```

#### Methods

- `getAuthorizationUrl(request: AuthorizationRequest): Promise<string>`
- `acquireTokenByCode(request: TokenRequest): Promise<B2CAuthenticationResult>`
- `acquireTokenByRefreshToken(request: RefreshTokenRequest): Promise<B2CAuthenticationResult>`
- `getAuthority(policyName: string): string`
- `getAuthorityForFlow(flowType: UserFlowType): string`
- `buildLoginUrl(redirectUri: string, state?: string, loginHint?: string): Promise<string>`
- `buildPasswordResetUrl(redirectUri: string, state?: string): Promise<string>`
- `buildProfileEditUrl(redirectUri: string, state?: string, loginHint?: string): Promise<string>`
- `buildOAuthLoginUrl(provider: 'google' | 'github', redirectUri: string, state?: string): Promise<string>`
- `buildSsoLoginUrl(organizationId: string, redirectUri: string, state?: string): Promise<string>`

### B2CTokenValidator

#### Constructor

```typescript
new B2CTokenValidator(config: AzureAdB2CConfig)
```

#### Methods

- `validateToken(token: string): Promise<TokenValidationResult>`
- `decodeToken(token: string): B2CTokenClaims | null`
- `isTokenExpired(token: string): boolean`
- `getUserIdFromToken(token: string): string | null`
- `getEmailFromToken(token: string): string | null`
- `getIdentityProviderFromToken(token: string): string | null`

## Token Claims Structure

```typescript
interface B2CTokenClaims {
  iss: string;                    // Issuer
  exp: number;                    // Expiration time
  nbf: number;                    // Not before
  iat: number;                    // Issued at
  aud: string;                    // Audience (client ID)
  sub: string;                    // Subject (user ID)
  oid: string;                    // Object ID
  emails?: string[];              // Email addresses
  preferred_username?: string;    // Preferred username
  given_name?: string;            // First name
  family_name?: string;           // Last name
  name?: string;                  // Full name
  idp?: string;                   // Identity provider
  tfp?: string;                   // Trust framework policy
  acr?: string;                   // Authentication context
  // ... additional custom claims
}
```

## Best Practices

1. **State Parameter**: Always use a cryptographically random state parameter for CSRF protection
2. **Token Storage**: Store tokens securely (encrypted in database or secure cookie)
3. **Token Refresh**: Implement automatic token refresh before expiration
4. **Token Rotation**: Rotate refresh tokens on each use
5. **JWKS Caching**: The validator automatically caches JWKS keys for 24 hours
6. **Error Handling**: Handle all B2C error codes appropriately
7. **Monitoring**: Track all authentication events with monitoring service
8. **Rate Limiting**: Implement rate limiting on authentication endpoints

## Environment Variables

```env
AZURE_AD_B2C_TENANT_NAME=castiel-auth
AZURE_AD_B2C_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_AD_B2C_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_AD_B2C_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_AD_B2C_DOMAIN=castiel-auth.b2clogin.com
AZURE_AD_B2C_CUSTOM_DOMAIN=auth.castiel.com
AZURE_AD_B2C_POLICY_SIGNUP_SIGNIN=B2C_1_signupsignin
AZURE_AD_B2C_POLICY_PASSWORD_RESET=B2C_1_passwordreset
AZURE_AD_B2C_POLICY_PROFILE_EDIT=B2C_1_profileedit
```

## Testing

Use the mock configuration for testing:

```typescript
const mockConfig: AzureAdB2CConfig = {
  tenantName: 'test-tenant',
  tenantId: 'test-tenant-id',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  domain: 'test.b2clogin.com',
  policies: {
    signUpSignIn: 'B2C_1_test',
    passwordReset: 'B2C_1_test',
    profileEdit: 'B2C_1_test',
  },
  redirectUri: 'http://localhost:3001/auth/callback',
};
```

## References

- [Azure AD B2C Documentation](https://docs.microsoft.com/en-us/azure/active-directory-b2c/)
- [MSAL Node Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)

## License

MIT
