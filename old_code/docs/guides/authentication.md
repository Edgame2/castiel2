# Castiel API - Authentication & Integration Guide

## Table of Contents
1. [Authentication Overview](#authentication-overview)
2. [Authentication Flows](#authentication-flows)
3. [OAuth 2.0 Integration](#oauth-20-integration)
4. [Code Examples](#code-examples)
5. [API Reference](#api-reference)
6. [Postman Collection](#postman-collection)

---

## Authentication Overview

Castiel API now exposes first-party authentication endpoints directly from the **Main API** service. The legacy auth-broker has been fully decommissioned, so email/password, MFA, token refresh, and session management all run inside `services/main-api`. References to the former broker remain in this document for historical context and will be removed as the rollout completes.

> ℹ️ The guidance below reflects the current (November 2025) state where the frontend talks straight to the Main API on `http://localhost:3001`. Use the "Direct Email/Password Flow" section to validate the experience locally.

### Architecture (current)

```
┌─────────────────┐      1. /auth/* request
│   Client App    │ ─────────────────────────┐
└────────┬────────┘                          │
         │                                    ↓
         ↓ 2. Tokens + cookies        ┌─────────────────┐
                                   │   Main API      │ ← AuthN/AuthZ, MFA, sessions
                                   └─────────────────┘
```

The Main API issues both access and refresh tokens, persists sessions in Redis, and talks to Cosmos DB for user records.

### Direct Email/Password Flow (Local Quickstart)

1. **Provision the Castiel tenant & admin defaults**
  ```bash
  cd castiel
  pnpm tenant:provision
  ```
  This script ensures the `Castiel` tenant exists, marks it as the default for `admin@admin.com`, and adds the super-admin role. If the account does not exist yet, register it once (see below) and rerun the provisioning script.

2. **Create or activate a user**
  ```bash
  cd castiel
  pnpm exec tsx ./scripts/activate-admin-user.ts   # optional: promotes admin@admin.com
  ```
   or call `/auth/register` directly:
   ```bash
   curl -X POST http://localhost:3001/auth/register \
     -H 'Content-Type: application/json' \
     -d '{
       "email":"demo@example.com",
       "password":"Password123!",
       "firstName":"Demo",
       "lastName":"User",
       "tenantId":"default"
     }'
   ```

3. **Log in with email/password**
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H 'Content-Type: application/json' \
     -d '{
       "email":"demo@example.com",
       "password":"Password123!",
       "tenantId":"default"
     }'
   ```
   Response body contains `{ accessToken, refreshToken, user }`. The frontend stores those via `/api/auth/set-tokens` to issue httpOnly cookies.

4. **Refresh tokens / manage sessions**
   ```bash
   curl -X POST http://localhost:3001/auth/refresh \
     -H 'Content-Type: application/json' \
     -d '{ "refreshToken": "<rt_from_login>" }'
   ```

5. **Forgot / reset password workflow**
   ```bash
   curl -X POST http://localhost:3001/auth/forgot-password \
     -H 'Content-Type: application/json' \
     -d '{ "email":"demo@example.com" }'

   curl -X POST http://localhost:3001/auth/reset-password \
     -H 'Content-Type: application/json' \
     -d '{
       "token":"<copy_from_email_or_logs>",
       "password":"NewPassword123!"
     }'
   ```

6. **Automated regression tests** – run the focused Vitest suite that stubs Cosmos DB/Redis and exercises every email/password endpoint:
  ```bash
  cd castiel
  pnpm --filter @castiel/main-api exec vitest run tests/unit/auth.controller.test.ts
  ```

These tests cover registration, login (including unverified email blocking), forgot/reset password, and refresh token rotation. They run quickly without network dependencies, giving fast feedback before launching the full stack via `pnpm dev`.

### Supported Authentication Methods

- ✅ **Email/Password** with bcrypt hashing
- ✅ **OAuth 2.0** (Google, GitHub, Microsoft)
- ✅ **Enterprise SSO** (Okta, Azure AD) via SAML
- ✅ **Magic Link** (passwordless)
- ✅ **MFA** (TOTP, SMS, Email OTP)

### Token Types

| Token | Purpose | Lifetime | Storage |
|-------|---------|----------|---------|
| **Access Token** | API authentication | 9 hours (configurable) | Memory/localStorage |
| **Refresh Token** | Renew access token | 30 days | httpOnly cookie |
| **ID Token** | User info (OpenID Connect) | N/A | Not stored |

---

## Authentication Flows

### 1. Email/Password Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant AB as Auth Broker
    participant DB as Database
    participant MA as Main API

    C->>AB: POST /auth/login
    Note right of C: { email, password }
    
    AB->>DB: Query user by email
    DB-->>AB: User record
    
    AB->>AB: Verify password (bcrypt)
    
    alt Password Valid
        AB->>AB: Generate JWT tokens
        AB-->>C: 200 OK + tokens
        Note right of AB: { accessToken, refreshToken, user }
        
        C->>MA: GET /api/shards
        Note right of C: Authorization: Bearer <accessToken>
        
        MA->>MA: Validate JWT
        MA->>AB: Introspect token (if needed)
        AB-->>MA: Token valid, user info
        MA-->>C: 200 OK + data
    else Password Invalid
        AB-->>C: 401 Unauthorized
        Note right of AB: { error: "Invalid credentials" }
    end
```

**Request:**
```bash
POST https://auth.castiel.com/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "rt_abc123...",
  "expiresIn": 32400,
  "tokenType": "Bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "tenantId": "123e4567-e89b-12d3-a456-426614174000",
    "roles": ["user"],
    "emailVerified": true
  }
}
```

---

### 2. OAuth 2.0 Flow (Google, GitHub, Microsoft)

```mermaid
sequenceDiagram
    participant C as Client
    participant AB as Auth Broker
    participant OP as OAuth Provider
    participant DB as Database

    C->>AB: GET /auth/oauth/google
    AB-->>C: 302 Redirect to Google
    Note right of AB: https://accounts.google.com/o/oauth2/v2/auth?...
    
    C->>OP: User authorizes
    OP-->>AB: Callback with code
    Note right of OP: /auth/callback/google?code=...
    
    AB->>OP: Exchange code for tokens
    OP-->>AB: Access token + ID token
    
    AB->>OP: GET user profile
    OP-->>AB: User data
    
    AB->>DB: Find or create user
    DB-->>AB: User record
    
    AB->>AB: Generate JWT tokens
    AB-->>C: 302 Redirect to app
    Note right of AB: https://app.castiel.com/auth/callback?token=...
```

**Step 1: Initiate OAuth**
```bash
GET https://auth.castiel.com/auth/oauth/google?redirect_uri=https://app.castiel.com/callback
```

**Step 2: User Authorizes (on Google)**
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://auth.castiel.com/auth/callback/google&
  response_type=code&
  scope=openid email profile&
  state=random_state_string
```

**Step 3: Callback with Tokens**
```bash
GET https://app.castiel.com/callback?token=eyJhbGciOiJSUzI1NiIs...&refresh_token=rt_abc123...
```

---

### 3. Enterprise SSO Flow (SAML)

```mermaid
sequenceDiagram
    participant U as User
    participant SP as Castiel (Service Provider)
    participant IdP as Identity Provider (Okta/Azure AD)
    participant AB as Auth Broker

    U->>SP: Access app
    SP->>IdP: SAML Auth Request
    Note right of SP: <samlp:AuthnRequest>
    
    IdP->>U: Show login page
    U->>IdP: Authenticate
    
    IdP->>SP: SAML Response + Assertion
    Note right of IdP: <samlp:Response>
    
    SP->>AB: Validate SAML assertion
    AB->>AB: Parse user attributes
    AB->>AB: Create/update user
    AB->>AB: Generate JWT tokens
    AB-->>U: Set tokens + Redirect to app
```

**SAML Configuration (per tenant):**
```json
{
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "ssoProvider": "okta",
  "ssoConfig": {
    "entityId": "https://castiel.com/saml/metadata",
    "acsUrl": "https://auth.castiel.com/auth/saml/acs",
    "ssoUrl": "https://dev-123456.okta.com/app/abc/sso/saml",
    "certificate": "-----BEGIN CERTIFICATE-----\n...",
    "signatureAlgorithm": "sha256"
  }
}
```

---

### 4. MFA Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant AB as Auth Broker
    participant DB as Database

    C->>AB: POST /auth/login
    Note right of C: { email, password }
    
    AB->>DB: Verify credentials
    DB-->>AB: User valid, MFA required
    
    AB->>C: 200 OK (MFA challenge)
    Note right of AB: { mfaRequired: true, mfaToken: "..." }
    
    alt TOTP (Authenticator App)
        C->>AB: POST /auth/mfa/verify
        Note right of C: { mfaToken, code: "123456" }
        AB->>AB: Verify TOTP code
    else SMS
        AB->>C: Send SMS with code
        C->>AB: POST /auth/mfa/verify
        AB->>AB: Verify SMS code
    else Email
        AB->>C: Send email with code
        C->>AB: POST /auth/mfa/verify
        AB->>AB: Verify email code
    end
    
    alt Code Valid
        AB->>AB: Generate JWT tokens
        AB-->>C: 200 OK + tokens
    else Code Invalid
        AB-->>C: 401 Unauthorized
    end
```

**Step 1: Login (MFA Required)**
```bash
POST https://auth.castiel.com/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "mfaRequired": true,
  "mfaToken": "mfa_abc123...",
  "mfaMethods": ["totp", "sms", "email"],
  "expiresIn": 300
}
```

**Step 2: Verify MFA**
```bash
POST https://auth.castiel.com/auth/mfa/verify
Content-Type: application/json

{
  "mfaToken": "mfa_abc123...",
  "code": "123456",
  "method": "totp"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "rt_abc123...",
  "expiresIn": 32400,
  "tokenType": "Bearer"
}
```

---

### 5. Token Refresh Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant AB as Auth Broker
    participant DB as Database

    C->>AB: POST /auth/refresh
    Note right of C: { refreshToken }
    
    AB->>DB: Verify refresh token
    DB-->>AB: Token valid
    
    AB->>AB: Generate new access token
    AB-->>C: 200 OK
    Note right of AB: { accessToken, expiresIn }
```

**Request:**
```bash
POST https://auth.castiel.com/auth/refresh
Content-Type: application/json

{
  "refreshToken": "rt_abc123..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": 32400,
  "tokenType": "Bearer"
}
```

---

## OAuth 2.0 Integration

### For Third-Party Applications

Castiel API implements **OAuth 2.0 Authorization Server** for third-party integrations.

### Supported Grant Types

- ✅ **Authorization Code** (recommended for web apps)
- ✅ **Client Credentials** (for server-to-server)
- ✅ **Refresh Token** (for token renewal)

### OAuth 2.0 Authorization Code Flow

```mermaid
sequenceDiagram
    participant TP as Third-Party App
    participant U as User
    participant AB as Castiel Auth Broker
    participant MA as Castiel Main API

    TP->>AB: 1. Authorization Request
    Note right of TP: /oauth/authorize?client_id=...
    
    AB->>U: 2. Show consent screen
    U->>AB: 3. Grant permission
    
    AB-->>TP: 4. Redirect with code
    Note right of AB: callback?code=abc123
    
    TP->>AB: 5. Exchange code for tokens
    Note right of TP: POST /oauth/token
    AB-->>TP: 6. Access + Refresh tokens
    
    TP->>MA: 7. API Request
    Note right of TP: Authorization: Bearer <token>
    MA-->>TP: 8. Response
```

### Step-by-Step Integration

#### 1. Register Your Application

```bash
POST https://auth.castiel.com/oauth/clients/register
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "name": "My Integration",
  "redirectUris": [
    "https://myapp.com/callback"
  ],
  "scopes": ["read:shards", "write:shards"],
  "grantTypes": ["authorization_code", "refresh_token"]
}
```

**Response:**
```json
{
  "clientId": "client_abc123...",
  "clientSecret": "secret_xyz789...",
  "name": "My Integration",
  "redirectUris": ["https://myapp.com/callback"],
  "scopes": ["read:shards", "write:shards"]
}
```

#### 2. Authorization Request

Redirect user to:
```
https://auth.castiel.com/oauth/authorize?
  client_id=client_abc123&
  redirect_uri=https://myapp.com/callback&
  response_type=code&
  scope=read:shards write:shards&
  state=random_state_string
```

#### 3. Handle Callback

User approves, redirected back to:
```
https://myapp.com/callback?code=auth_code_123&state=random_state_string
```

#### 4. Exchange Code for Tokens

```bash
POST https://auth.castiel.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=auth_code_123&
redirect_uri=https://myapp.com/callback&
client_id=client_abc123&
client_secret=secret_xyz789
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "rt_refresh_123...",
  "token_type": "Bearer",
  "expires_in": 32400,
  "scope": "read:shards write:shards"
}
```

#### 5. Use Access Token

```bash
GET https://api.castiel.com/api/shards
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

#### 6. Refresh Token

```bash
POST https://auth.castiel.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=rt_refresh_123...&
client_id=client_abc123&
client_secret=secret_xyz789
```

---

## Code Examples

### JavaScript/TypeScript (Node.js)

```typescript
import axios from 'axios';

class CastielClient {
  private baseURL = 'https://api.castiel.com';
  private authURL = 'https://auth.castiel.com';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  /**
   * Authenticate with email/password
   */
  async login(email: string, password: string) {
    const response = await axios.post(`${this.authURL}/auth/login`, {
      email,
      password,
    });

    this.accessToken = response.data.accessToken;
    this.refreshToken = response.data.refreshToken;

    return response.data.user;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${this.authURL}/auth/refresh`, {
      refreshToken: this.refreshToken,
    });

    this.accessToken = response.data.accessToken;
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(method: string, path: string, data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${path}`,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        data,
      });

      return response.data;
    } catch (error: any) {
      // Handle token expiration
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        
        // Retry request
        const response = await axios({
          method,
          url: `${this.baseURL}${path}`,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          data,
        });

        return response.data;
      }

      throw error;
    }
  }

  /**
   * Get shards
   */
  async getShards(params?: { limit?: number; offset?: number }) {
    return this.apiRequest('GET', '/api/shards?' + new URLSearchParams(params as any));
  }

  /**
   * Create shard
   */
  async createShard(shard: {
    shardTypeId: string;
    structuredData: object;
    unstructuredData?: string;
  }) {
    return this.apiRequest('POST', '/api/shards', shard);
  }
}

// Usage
const client = new CastielClient();
await client.login('user@example.com', 'password');
const shards = await client.getShards({ limit: 10 });
console.log(shards);
```

### Python

```python
import requests
from typing import Optional, Dict, Any

class CastielClient:
    def __init__(self):
        self.base_url = 'https://api.castiel.com'
        self.auth_url = 'https://auth.castiel.com'
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate with email/password"""
        response = requests.post(
            f'{self.auth_url}/auth/login',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()
        
        data = response.json()
        self.access_token = data['accessToken']
        self.refresh_token = data['refreshToken']
        
        return data['user']

    def refresh_access_token(self):
        """Refresh access token"""
        if not self.refresh_token:
            raise ValueError('No refresh token available')
        
        response = requests.post(
            f'{self.auth_url}/auth/refresh',
            json={'refreshToken': self.refresh_token}
        )
        response.raise_for_status()
        
        self.access_token = response.json()['accessToken']

    def api_request(self, method: str, path: str, data: Optional[Dict] = None) -> Any:
        """Make authenticated API request"""
        headers = {'Authorization': f'Bearer {self.access_token}'}
        
        response = requests.request(
            method,
            f'{self.base_url}{path}',
            headers=headers,
            json=data
        )
        
        # Handle token expiration
        if response.status_code == 401:
            self.refresh_access_token()
            headers = {'Authorization': f'Bearer {self.access_token}'}
            response = requests.request(
                method,
                f'{self.base_url}{path}',
                headers=headers,
                json=data
            )
        
        response.raise_for_status()
        return response.json()

    def get_shards(self, limit: int = 10, offset: int = 0):
        """Get shards"""
        return self.api_request('GET', f'/api/shards?limit={limit}&offset={offset}')

    def create_shard(self, shard: Dict[str, Any]):
        """Create shard"""
        return self.api_request('POST', '/api/shards', shard)

# Usage
client = CastielClient()
user = client.login('user@example.com', 'password')
shards = client.get_shards(limit=10)
print(shards)
```

### cURL

```bash
#!/bin/bash

# 1. Login
LOGIN_RESPONSE=$(curl -s -X POST https://auth.castiel.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')

echo "Access Token: $ACCESS_TOKEN"

# 2. Get shards
curl -X GET https://api.castiel.com/api/shards \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 3. Create shard
curl -X POST https://api.castiel.com/api/shards \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shardTypeId": "550e8400-e29b-41d4-a716-446655440000",
    "structuredData": {
      "title": "My Document",
      "content": "Document content here"
    }
  }'

# 4. Refresh token (when expired)
REFRESH_RESPONSE=$(curl -s -X POST https://auth.castiel.com/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.accessToken')
echo "New Access Token: $NEW_ACCESS_TOKEN"
```

---

## API Reference

### Authentication Endpoints (Auth Broker)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Email/password login |
| `/auth/register` | POST | Register new user |
| `/auth/logout` | POST | Logout and invalidate tokens |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/oauth/:provider` | GET | Initiate OAuth flow |
| `/auth/callback/:provider` | GET | OAuth callback |
| `/auth/magic-link` | POST | Request magic link |
| `/auth/mfa/setup` | POST | Setup MFA |
| `/auth/mfa/verify` | POST | Verify MFA code |
| `/oauth/authorize` | GET | OAuth authorization |
| `/oauth/token` | POST | OAuth token exchange |

### Main API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/shards` | GET | List shards |
| `/api/shards` | POST | Create shard |
| `/api/shards/:id` | GET | Get shard |
| `/api/shards/:id` | PATCH | Update shard |
| `/api/shards/:id` | DELETE | Delete shard |
| `/api/shard-types` | GET | List shard types |
| `/api/shard-types/:id` | GET | Get shard type |
| `/api/vector-search` | POST | Vector similarity search |
| `/api/graphql` | POST | GraphQL endpoint |

---

## Postman Collection

Download the complete Postman collection:

**Castiel API.postman_collection.json**

```json
{
  "info": {
    "name": "Castiel API",
    "description": "Complete API collection for Castiel platform",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{accessToken}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "authURL",
      "value": "https://auth.castiel.com",
      "type": "string"
    },
    {
      "key": "apiURL",
      "value": "https://api.castiel.com",
      "type": "string"
    },
    {
      "key": "accessToken",
      "value": "",
      "type": "string"
    },
    {
      "key": "refreshToken",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "const response = pm.response.json();",
                  "pm.collectionVariables.set('accessToken', response.accessToken);",
                  "pm.collectionVariables.set('refreshToken', response.refreshToken);"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"SecurePassword123!\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{authURL}}/auth/login",
              "host": ["{{authURL}}"],
              "path": ["auth", "login"]
            }
          }
        },
        {
          "name": "Refresh Token",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "const response = pm.response.json();",
                  "pm.collectionVariables.set('accessToken', response.accessToken);"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"refreshToken\": \"{{refreshToken}}\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{authURL}}/auth/refresh",
              "host": ["{{authURL}}"],
              "path": ["auth", "refresh"]
            }
          }
        }
      ]
    },
    {
      "name": "Shards",
      "item": [
        {
          "name": "List Shards",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{apiURL}}/api/shards?limit=10&offset=0",
              "host": ["{{apiURL}}"],
              "path": ["api", "shards"],
              "query": [
                {
                  "key": "limit",
                  "value": "10"
                },
                {
                  "key": "offset",
                  "value": "0"
                }
              ]
            }
          }
        },
        {
          "name": "Create Shard",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"shardTypeId\": \"550e8400-e29b-41d4-a716-446655440000\",\n  \"structuredData\": {\n    \"title\": \"My Document\",\n    \"content\": \"Document content here\"\n  }\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{apiURL}}/api/shards",
              "host": ["{{apiURL}}"],
              "path": ["api", "shards"]
            }
          }
        }
      ]
    }
  ]
}
```

**Import into Postman:**
1. Open Postman
2. Click "Import"
3. Paste JSON above or upload file
4. Set environment variables: `authURL`, `apiURL`
5. Run "Login" request first to get tokens
6. Tokens are automatically saved for subsequent requests

---

**Last Updated**: January 2025
**Maintained By**: Castiel API Team

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Authentication system fully implemented

#### Implemented Features (✅)

- ✅ Email/Password authentication
- ✅ OAuth 2.0 (Google, GitHub, Microsoft)
- ✅ Enterprise SSO (SAML 2.0, Azure AD B2C)
- ✅ Magic Links (passwordless)
- ✅ MFA (TOTP, SMS, Email OTP, Recovery codes)
- ✅ Token management (Access + Refresh)
- ✅ Session management
- ✅ Password reset workflow
- ✅ Email verification

#### Known Limitations

- ⚠️ **Token Storage Security** - Access tokens may be stored in localStorage (XSS vulnerable)
  - **Code Reference:**
    - Frontend token storage may need review
  - **Recommendation:**
    1. Use httpOnly cookies for token storage
    2. Implement CSRF protection
    3. Review token storage security

- ⚠️ **MFA Enforcement** - MFA available but may not be enforced for sensitive operations
  - **Code Reference:**
    - MFA service exists but enforcement may be incomplete
  - **Recommendation:**
    1. Enforce MFA for sensitive operations
    2. Require MFA for admin users
    3. Document MFA enforcement policies

### Code References

- **Backend Services:**
  - `apps/api/src/services/auth/` - Authentication services
  - `apps/api/src/services/auth/mfa.service.ts` - MFA service
  - `apps/api/src/services/auth/magic-link.service.ts` - Magic link service
  - `apps/api/src/services/auth/oauth.service.ts` - OAuth service
  - `apps/api/src/services/auth/sso.service.ts` - SSO service

- **API Routes:**
  - `/api/v1/auth/*` - Authentication endpoints
  - `/api/v1/mfa/*` - MFA endpoints
  - `/api/v1/magic-link/*` - Magic link endpoints
  - `/api/v1/oauth/*` - OAuth endpoints
  - `/api/v1/sso/*` - SSO endpoints

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Azure AD B2C Setup](../setup/azure-ad-b2c.md) - Azure AD B2C configuration
- [Backend Documentation](../backend/README.md) - Backend implementation
