# Redirect URIs and OAuth Configuration

This document provides a comprehensive list of all redirect URIs and OAuth configurations needed for the Castiel API authentication system.

## Azure AD B2C Application Redirect URIs

### Auth Broker Application

**Application Name:** Castiel Auth Broker

**Redirect URIs (Web Platform):**
```
# Development
http://localhost:3001/auth/callback

# Staging
https://auth-staging.castiel.com/auth/callback

# Production
https://auth.castiel.com/auth/callback
```

**Front-channel logout URL:**
```
# Development
http://localhost:3001/auth/logout

# Production
https://auth.castiel.com/auth/logout
```

**Implicit Grant Settings:**
- ✅ ID tokens (used for implicit and hybrid flows)
- ❌ Access tokens (using authorization code flow)

### Main API Application

**Application Name:** Castiel Main API

**Application ID URI:**
```
https://api.castiel.com
```

**Exposed API Scopes:**
- `Shards.Read` - Read shards
- `Shards.Write` - Create and update shards
- `Shards.Delete` - Delete shards
- `Users.Read` - Read user information
- `Users.Write` - Update user information

**No redirect URIs needed** (API only, no user interaction)

---

## OAuth Provider Configurations

### Google OAuth 2.0

**Console:** https://console.cloud.google.com/apis/credentials

**Application Type:** Web application

**Authorized JavaScript Origins:**
```
# Development
http://localhost:3001

# Production
https://auth.castiel.com
```

**Authorized Redirect URIs:**
```
# Azure AD B2C Redirect (required)
https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/oauth2/authresp

# Custom domain (if configured)
https://auth.castiel.com/oauth2/authresp
```

**Scopes Requested:**
- `openid` - OpenID Connect scope
- `profile` - User's profile information
- `email` - User's email address

**Environment Variables:**
```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### GitHub OAuth App

**Console:** https://github.com/settings/developers

**Application Name:** Castiel Auth

**Homepage URL:**
```
https://castiel.com
```

**Authorization Callback URL:**
```
# Azure AD B2C Redirect (required)
https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/oauth2/authresp

# Custom domain (if configured)
https://auth.castiel.com/oauth2/authresp
```

**Scopes Requested:**
- `user:email` - Access to user's email
- `read:user` - Read user profile information

**Environment Variables:**
```bash
GITHUB_CLIENT_ID=Iv1.abcdef1234567890
GITHUB_CLIENT_SECRET=1234567890abcdef1234567890abcdef12345678
```

---

## Enterprise SSO Configurations

### Okta SAML 2.0

**Okta Application Type:** SAML 2.0

**Single Sign-On URL:**
```
https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/samlp/sso/assertionconsumer
```

**Audience URI (SP Entity ID):**
```
https://castiel-auth.b2clogin.com/te/castiel-auth.onmicrosoft.com/B2C_1A_SAML
```

**Name ID Format:**
- EmailAddress

**Application Username:**
- Email

**Attribute Statements:**
```
email       -> user.email
given_name  -> user.firstName
surname     -> user.lastName
groups      -> appuser.groups (optional)
```

**Download:** Federation Metadata XML or note the Metadata URL

---

### Azure AD (Enterprise) SAML

**Application Type:** Non-gallery application

**Entity ID:**
```
https://castiel-auth.b2clogin.com/te/castiel-auth.onmicrosoft.com/B2C_1A_SAML
```

**Reply URL:**
```
https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/samlp/sso/assertionconsumer
```

**Sign-on URL:**
```
https://auth.castiel.com/auth/sso/{organizationId}
```

**Logout URL:**
```
https://auth.castiel.com/auth/logout
```

**Claims Configuration:**
```
emailaddress -> user.mail
givenname    -> user.givenname
surname      -> user.surname
name         -> user.displayname
objectid     -> user.objectid
groups       -> user.groups (optional)
```

**Download:** Federation Metadata XML

---

### Google Workspace SAML

**Application Name:** Castiel API

**ACS URL:**
```
https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/samlp/sso/assertionconsumer
```

**Entity ID:**
```
https://castiel-auth.b2clogin.com/te/castiel-auth.onmicrosoft.com/B2C_1A_SAML
```

**Start URL:**
```
https://auth.castiel.com/auth/sso/{organizationId}
```

**Name ID Format:**
- EMAIL

**Name ID:**
- Basic Information > Primary Email

**Attribute Mapping:**
```
email       -> Primary email
given_name  -> First name
surname     -> Last name
displayName -> Full name (optional)
```

**Download:** IDP Metadata (XML)

---

## Custom Domain Configuration

### Azure Front Door / CDN

**Custom Domain:** `auth.castiel.com`

**Backend Pool:**
```
castiel-auth.b2clogin.com
```

**Routing Rules:**
```
/auth/*     -> Azure AD B2C
/api/*      -> Not applicable (separate domain: api.castiel.com)
```

**SSL Certificate:**
- Use Azure-managed certificate or upload custom certificate

---

## CORS Configuration

### Auth Broker Service

**Allowed Origins:**
```javascript
const allowedOrigins = [
  'http://localhost:3000',           // Development frontend
  'http://localhost:3001',           // Development auth broker
  'https://app.castiel.com',         // Production frontend
  'https://app-staging.castiel.com', // Staging frontend
  'https://auth.castiel.com',        // Production auth
];
```

**Allowed Methods:**
```
GET, POST, PUT, DELETE, OPTIONS
```

**Allowed Headers:**
```
Authorization, Content-Type, Accept, Origin, X-Requested-With
```

**Credentials:**
```
include (allow cookies and authorization headers)
```

---

## Frontend Integration

### Login Button Configuration

```typescript
// Environment-specific configuration
const authConfig = {
  development: {
    authUrl: 'http://localhost:3001',
    redirectUri: 'http://localhost:3000/auth/callback',
  },
  staging: {
    authUrl: 'https://auth-staging.castiel.com',
    redirectUri: 'https://app-staging.castiel.com/auth/callback',
  },
  production: {
    authUrl: 'https://auth.castiel.com',
    redirectUri: 'https://app.castiel.com/auth/callback',
  },
};

// Login with email/password
const loginUrl = `${authUrl}/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}`;

// Login with Google
const googleLoginUrl = `${authUrl}/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;

// Login with GitHub
const githubLoginUrl = `${authUrl}/auth/github?redirect_uri=${encodeURIComponent(redirectUri)}`;

// SSO for organization
const ssoLoginUrl = `${authUrl}/auth/sso/${orgId}?redirect_uri=${encodeURIComponent(redirectUri)}`;
```

---

## Security Considerations

### State Parameter

Always include a state parameter for CSRF protection:

```typescript
import crypto from 'crypto';

// Generate state
const state = crypto.randomBytes(32).toString('hex');

// Store in session or encrypted cookie
session.oauthState = state;

// Include in authorization URL
const authUrl = `${baseUrl}?state=${state}&redirect_uri=${redirectUri}`;

// Validate on callback
if (request.query.state !== session.oauthState) {
  throw new Error('Invalid state parameter');
}
```

### Redirect URI Validation

Always validate redirect URIs against a whitelist:

```typescript
const ALLOWED_REDIRECT_URIS = [
  'http://localhost:3000/auth/callback',
  'https://app.castiel.com/auth/callback',
  'https://app-staging.castiel.com/auth/callback',
];

function validateRedirectUri(uri: string): boolean {
  return ALLOWED_REDIRECT_URIS.includes(uri);
}
```

---

## Testing Endpoints

### Development Testing

```bash
# Test email/password login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test token validation
curl -X GET http://localhost:3001/api/profile \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Test token refresh
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"${REFRESH_TOKEN}"}'
```

---

## Checklist

### Initial Setup
- [ ] Azure AD B2C tenant created
- [ ] Auth Broker application registered
- [ ] Main API application registered
- [ ] User flows created (sign-up/sign-in, password reset, profile edit)
- [ ] Client secrets generated and stored securely

### OAuth Providers
- [ ] Google OAuth credentials created
- [ ] Google redirect URI configured
- [ ] GitHub OAuth app created
- [ ] GitHub redirect URI configured
- [ ] Identity providers added to Azure AD B2C
- [ ] Identity providers enabled in user flow

### Enterprise SSO
- [ ] SAML configuration documented for Okta
- [ ] SAML configuration documented for Azure AD
- [ ] SAML configuration documented for Google Workspace
- [ ] Certificates downloaded and stored securely
- [ ] Test SSO configuration with pilot organization

### Custom Domain
- [ ] Custom domain verified (auth.castiel.com)
- [ ] DNS CNAME record added
- [ ] SSL certificate configured
- [ ] All redirect URIs updated to use custom domain

### Security
- [ ] All client secrets stored in Azure Key Vault
- [ ] CORS configured correctly
- [ ] State parameter validation implemented
- [ ] Redirect URI whitelist configured
- [ ] Rate limiting enabled on auth endpoints

### Testing
- [ ] Test email/password signup
- [ ] Test email/password login
- [ ] Test password reset flow
- [ ] Test Google OAuth login
- [ ] Test GitHub OAuth login
- [ ] Test SSO with enterprise provider
- [ ] Test token refresh
- [ ] Test token revocation

---

## References

- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [SAML 2.0 Specification](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
- [Azure AD B2C Redirect URIs](https://docs.microsoft.com/en-us/azure/active-directory-b2c/tutorial-register-applications)

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Redirect URI configuration fully documented

#### Implemented Features (✅)

- ✅ Redirect URI configuration documented
- ✅ OAuth provider configurations documented
- ✅ Enterprise SSO configurations documented
- ✅ CORS configuration documented
- ✅ Security considerations documented
- ✅ Testing endpoints documented
- ✅ Setup checklist provided

#### Known Limitations

- ⚠️ **Configuration Verification** - Actual configuration may need verification
  - **Recommendation:**
    1. Verify all redirect URIs are configured correctly
    2. Test OAuth flows
    3. Verify SSO configurations
    4. Test CORS settings

- ⚠️ **Environment-Specific Configuration** - Configuration may vary by environment
  - **Recommendation:**
    1. Document environment-specific differences
    2. Verify all environments are configured
    3. Test configuration in each environment

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Authentication Guide](../guides/authentication.md) - Authentication documentation
- [Azure AD B2C Setup](./azure-ad-b2c.md) - Azure AD B2C setup guide
