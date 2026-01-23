# Backend Authentication API

## Overview

Complete API documentation for the authentication endpoints.

## Base URL

All endpoints are prefixed with `/api/auth`

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### OAuth Authentication

#### Initiate Google OAuth

```http
GET /api/auth/google
```

Initiates the Google OAuth 2.0 flow. Redirects user to Google authorization page.

**Response**: Redirect to Google OAuth

---

#### OAuth Callback

```http
GET /api/auth/google/callback?code=<code>&state=<state>
```

Handles the OAuth callback from Google.

**Query Parameters**:
- `code` (string, required) - Authorization code from Google
- `state` (string, optional) - State parameter for CSRF protection
- `error` (string, optional) - Error from OAuth provider

**Response**: Redirect to frontend with token

**Error Responses**:
- `400` - Invalid authorization code or user data
- `503` - Google OAuth not configured

---

### Email/Password Authentication

#### Login

```http
POST /api/auth/login
```

Authenticate with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Responses**:
- `401` - Invalid credentials
- `423` - Account locked
- `400` - Validation error

---

#### Register

```http
POST /api/auth/register
```

Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "username": "johndoe"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "johndoe"
  }
}
```

**Error Responses**:
- `400` - Validation error or user already exists
- `409` - Email or username already in use

---

#### Logout

```http
POST /api/auth/logout
```

Logout and revoke current session.

**Headers**:
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

---

### Current User

#### Get Current User

```http
GET /api/auth/me
```

Get the currently authenticated user with profile.

**Headers**:
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "username": "johndoe",
  "avatarUrl": "https://...",
  "profile": {
    "role": "Developer",
    "competencies": ["TypeScript", "React"]
  },
  "organizations": [...]
}
```

---

### Token Management

#### Refresh Token

```http
POST /api/auth/refresh
```

Refresh the JWT token.

**Headers**:
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `401` - Invalid or expired token

---

### Password Management

#### Change Password

```http
POST /api/auth/change-password
```

Change the current user's password.

**Headers**:
- `Authorization: Bearer <token>` (required)

**Request Body**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newsecurepassword"
}
```

**Response**:
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses**:
- `400` - Invalid current password or weak new password
- `401` - Not authenticated

---

#### Request Password Reset

```http
POST /api/auth/request-password-reset
```

Request a password reset email.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "Password reset email sent"
}
```

**Note**: Always returns success to prevent email enumeration.

---

#### Reset Password

```http
POST /api/auth/reset-password
```

Reset password using reset token.

**Request Body**:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newsecurepassword"
}
```

**Response**:
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses**:
- `400` - Invalid or expired token
- `400` - Weak password

---

### Provider Management

#### Get Linked Providers

```http
GET /api/auth/providers
```

Get list of linked authentication providers.

**Headers**:
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "providers": ["google", "password"]
}
```

---

#### Link Google Account

```http
POST /api/auth/link-google
```

Link a Google account to the current user.

**Headers**:
- `Authorization: Bearer <token>` (required)

**Request Body**:
```json
{
  "code": "oauth-authorization-code"
}
```

**Response**:
```json
{
  "message": "Google account linked successfully"
}
```

**Error Responses**:
- `400` - Invalid authorization code
- `409` - Provider already linked

---

#### Unlink Provider

```http
POST /api/auth/unlink-provider
```

Unlink an authentication provider.

**Headers**:
- `Authorization: Bearer <token>` (required)

**Request Body**:
```json
{
  "provider": "google"
}
```

**Response**:
```json
{
  "message": "Provider unlinked successfully"
}
```

**Error Responses**:
- `400` - Cannot unlink last provider
- `404` - Provider not found

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": "Additional details (development only)"
}
```

## Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `423` - Locked (account locked)
- `500` - Internal Server Error
- `503` - Service Unavailable (OAuth not configured)

## Rate Limiting

Authentication endpoints may be rate-limited to prevent abuse:
- Login attempts: Limited per IP
- Password reset requests: Limited per email
- OAuth callbacks: Limited per IP

## Security Considerations

1. **Tokens**: JWT tokens expire after 7 days (configurable)
2. **Cookies**: HttpOnly cookies used for token storage
3. **HTTPS**: Required in production
4. **Password**: Minimum strength requirements enforced
5. **Account Locking**: Accounts locked after failed login attempts
