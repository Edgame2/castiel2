# Azure AD B2C Setup Guide

This guide provides step-by-step instructions for setting up Azure AD B2C for the Castiel API authentication system.

> **Note:** For gap analysis, see [Gap Analysis](../GAP_ANALYSIS.md) and [Authentication Guide](../guides/authentication.md)

## Overview

Azure AD B2C will serve as the identity provider for:
- Email/Password authentication
- Social login (Google, GitHub)
- Enterprise SSO (Okta, Azure AD, Google Workspace via SAML)
- Multi-tenant support with custom branding per tenant

## Prerequisites

- Azure subscription with appropriate permissions
- Azure CLI installed (`az` command)
- Owner or Contributor role on the subscription

## Step 1: Create Azure AD B2C Tenant

### Via Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → Search for **Azure Active Directory B2C**
3. Click **Create a new Azure AD B2C Tenant**
4. Fill in the details:
   - **Organization name**: `Castiel-B2C` (or your preferred name)
   - **Initial domain name**: `castiel-auth` (must be globally unique)
   - **Country/Region**: Select your primary region
   - **Subscription**: Select your Azure subscription
   - **Resource group**: Create new → `castiel-auth-rg`
5. Click **Review + Create** → **Create**
6. Wait 2-3 minutes for tenant creation
7. Click **Create tenant** link to switch to the new B2C tenant

### Via Azure CLI

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create resource group
az group create \
  --name castiel-auth-rg \
  --location eastus

# Create Azure AD B2C tenant
az ad b2c tenant create \
  --display-name "Castiel B2C" \
  --domain-name castiel-auth \
  --resource-group castiel-auth-rg \
  --location "United States"
```

**Important**: After creation, note down:
- Tenant name: `castiel-auth.onmicrosoft.com`
- Tenant ID: (GUID from Azure Portal)

## Step 2: Register Application

### Register Auth Broker Application

1. In the Azure AD B2C tenant, navigate to **App registrations**
2. Click **New registration**
3. Fill in the details:
   - **Name**: `Castiel Auth Broker`
   - **Supported account types**: Accounts in any identity provider or organizational directory (for authenticating users with user flows)
   - **Redirect URI**: 
     - Platform: **Web**
     - URI: `http://localhost:3001/auth/callback` (for development)
   - Click **Register**

4. Note down the **Application (client) ID**

5. Click **Certificates & secrets** → **New client secret**
   - Description: `auth-broker-secret`
   - Expires: 24 months
   - Click **Add**
   - **⚠️ CRITICAL**: Copy the secret value immediately (you won't see it again)

6. Click **API permissions**
   - Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
   - Add: `openid`, `profile`, `email`, `offline_access`
   - Click **Add permissions**
   - Click **Grant admin consent** (if you have permissions)

7. Click **Authentication**
   - Under **Platform configurations** → **Web**
   - Add additional redirect URIs:
     - `https://auth.castiel.com/auth/callback` (production)
     - `https://auth-staging.castiel.com/auth/callback` (staging)
   - Under **Implicit grant and hybrid flows**:
     - ✅ Check **ID tokens**
   - Under **Allow public client flows**: **No**
   - Click **Save**

### Register Main API Application

1. Click **New registration**
2. Fill in:
   - **Name**: `Castiel Main API`
   - **Redirect URI**: None (API only)
3. Note down the **Application (client) ID**
4. Click **Expose an API**
   - Click **Set** next to Application ID URI
   - Accept default: `api://{clientId}` or use custom: `https://api.castiel.com`
   - Click **Save**
5. Click **Add a scope**
   - Scope name: `Shards.Read`
   - Admin consent display name: `Read shards`
   - Admin consent description: `Allows the app to read shards`
   - State: **Enabled**
   - Click **Add scope**
6. Repeat for additional scopes:
   - `Shards.Write`
   - `Shards.Delete`
   - `Users.Read`
   - `Users.Write`

## Step 3: Create User Flows

### Sign-up and Sign-in Flow (Email/Password)

1. In Azure AD B2C, navigate to **User flows**
2. Click **New user flow**
3. Select **Sign up and sign in** → **Recommended** → **Create**
4. Configure:
   - **Name**: `B2C_1_signupsignin` (prefix B2C_1_ is automatic)
   - **Identity providers**:
     - ✅ Email signup
   - **Multifactor authentication**: 
     - Type: **Email** or **SMS** (recommended for enterprise)
     - Enforcement: **Conditional** (allow per-tenant override)
   - **User attributes and token claims**:
     - Collect during sign-up:
       - ✅ Display Name
       - ✅ Email Address
       - ✅ Given Name
       - ✅ Surname
       - ✅ Job Title (optional)
       - ✅ Country/Region (optional)
     - Return in token:
       - ✅ Display Name
       - ✅ Email Addresses
       - ✅ Given Name
       - ✅ Surname
       - ✅ User's Object ID
       - ✅ Identity Provider
   - Click **Create**

### Password Reset Flow

1. Click **New user flow** → **Password reset** → **Recommended**
2. Configure:
   - **Name**: `B2C_1_passwordreset`
   - **Identity providers**: ✅ Reset password using email address
   - **User attributes and token claims**: Same as sign-up
   - Click **Create**

### Profile Editing Flow

1. Click **New user flow** → **Profile editing** → **Recommended**
2. Configure:
   - **Name**: `B2C_1_profileedit`
   - **Identity providers**: ✅ Email
   - **User attributes and token claims**: Allow editing of name, job title, country
   - Click **Create**

## Step 4: Configure Social Identity Providers

### Google OAuth Setup

1. Create Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project: **Castiel Auth**
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: `Castiel Auth Broker`
   - Authorized redirect URIs:
     - `https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/oauth2/authresp`
   - Click **Create**
   - Note down **Client ID** and **Client Secret**

2. Add Google as identity provider in Azure AD B2C:
   - Navigate to **Identity providers** in Azure AD B2C
   - Click **New OpenID Connect provider**
   - Configure:
     - **Name**: `Google`
     - **Metadata URL**: `https://accounts.google.com/.well-known/openid-configuration`
     - **Client ID**: (from Google)
     - **Client Secret**: (from Google)
     - **Scope**: `openid profile email`
     - **Response type**: `code`
     - **Response mode**: `form_post`
     - Click **Save**

3. Add Google to user flow:
   - Go to **User flows** → **B2C_1_signupsignin**
   - Click **Identity providers**
   - ✅ Check **Google**
   - Click **Save**

### GitHub OAuth Setup

1. Create GitHub OAuth App:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click **New OAuth App**
   - Fill in:
     - **Application name**: `Castiel Auth`
     - **Homepage URL**: `https://castiel.com`
     - **Authorization callback URL**: 
       - `https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/oauth2/authresp`
   - Click **Register application**
   - Generate a **Client Secret**
   - Note down **Client ID** and **Client Secret**

2. Add GitHub as identity provider:
   - In Azure AD B2C, go to **Identity providers**
   - Click **New OpenID Connect provider**
   - Configure:
     - **Name**: `GitHub`
     - **Metadata URL**: `https://token.actions.githubusercontent.com/.well-known/openid-configuration`
     - **Client ID**: (from GitHub)
     - **Client Secret**: (from GitHub)
     - **Scope**: `user:email read:user`
     - **Response type**: `code`
     - **Response mode**: `form_post`
     - Click **Save**

3. Add GitHub to user flow (same as Google)

## Step 5: Configure Enterprise SSO (SAML)

### Okta SAML Setup

1. In Okta Admin Console:
   - Applications → Create App Integration
   - Sign-in method: **SAML 2.0**
   - General Settings:
     - App name: `Castiel API`
   - SAML Settings:
     - Single sign-on URL: `https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/samlp/sso/assertionconsumer`
     - Audience URI (SP Entity ID): `https://castiel-auth.b2clogin.com/te/castiel-auth.onmicrosoft.com/B2C_1A_SAML`
     - Name ID format: **EmailAddress**
     - Application username: **Email**
   - Download **Metadata XML** or note the **Metadata URL**

2. In Azure AD B2C:
   - Navigate to **Identity providers** → **New SAML provider**
   - Configure:
     - **Name**: `Okta`
     - **Metadata URL**: (from Okta)
     - **Issuer**: (auto-filled from metadata)
     - **Sign-in endpoint**: (auto-filled)
     - **Sign-out endpoint**: (optional)
     - Click **Save**

### Azure AD SAML Setup

1. In Azure AD (source tenant):
   - Enterprise applications → New application
   - Create your own application: `Castiel B2C Integration`
   - Select **Integrate any other application (Non-gallery)**
   - Configure SAML single sign-on
   - Set:
     - Entity ID: `https://castiel-auth.b2clogin.com/te/castiel-auth.onmicrosoft.com/B2C_1A_SAML`
     - Reply URL: `https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/samlp/sso/assertionconsumer`
   - Download **Federation Metadata XML**

2. Add to Azure AD B2C (same process as Okta)

### Google Workspace SAML Setup

1. In Google Admin Console:
   - Apps → Web and mobile apps → Add app → Add custom SAML app
   - App name: `Castiel API`
   - Google IdP metadata: Download or copy
   - Service provider details:
     - ACS URL: `https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/samlp/sso/assertionconsumer`
     - Entity ID: `https://castiel-auth.b2clogin.com/te/castiel-auth.onmicrosoft.com/B2C_1A_SAML`
     - Start URL: `https://auth.castiel.com/auth/sso/{orgId}`
   - Attribute mapping:
     - Primary email → email
     - First name → given_name
     - Last name → surname

2. Add to Azure AD B2C (same process)

## Step 6: Configure Custom Domains (Production)

1. Purchase/Configure custom domain:
   - Recommended: `auth.castiel.com`

2. In Azure AD B2C:
   - Navigate to **Company branding** → **Custom domains**
   - Click **Add custom domain**
   - Enter: `auth.castiel.com`
   - Follow DNS verification steps (add CNAME record)
   - Wait for verification (can take up to 24 hours)

3. Update all redirect URIs to use custom domain

## Step 7: Environment Variables Configuration

After completing the above steps, collect all values and update `.env` files:

```bash
# Azure AD B2C Configuration
AZURE_AD_B2C_TENANT_NAME=castiel-auth
AZURE_AD_B2C_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_AD_B2C_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_AD_B2C_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_AD_B2C_DOMAIN=castiel-auth.b2clogin.com
AZURE_AD_B2C_CUSTOM_DOMAIN=auth.castiel.com

# User Flows
AZURE_AD_B2C_POLICY_SIGNUP_SIGNIN=B2C_1_signupsignin
AZURE_AD_B2C_POLICY_PASSWORD_RESET=B2C_1_passwordreset
AZURE_AD_B2C_POLICY_PROFILE_EDIT=B2C_1_profileedit

# OAuth Providers
GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Redirect URIs
AUTH_BROKER_URL=http://localhost:3001
AUTH_REDIRECT_URI=http://localhost:3001/auth/callback
FRONTEND_URL=http://localhost:3000

# Production
# AUTH_BROKER_URL=https://auth.castiel.com
# AUTH_REDIRECT_URI=https://auth.castiel.com/auth/callback
# FRONTEND_URL=https://app.castiel.com
```

## Step 8: Test Authentication Flow

1. Test Email/Password signup:
   ```bash
   # Navigate to the sign-up URL
   https://castiel-auth.b2clogin.com/castiel-auth.onmicrosoft.com/oauth2/v2.0/authorize?p=B2C_1_signupsignin&client_id={YOUR_CLIENT_ID}&redirect_uri={YOUR_REDIRECT_URI}&response_type=code&scope=openid%20profile%20email
   ```

2. Test Google OAuth:
   - Use same URL, click "Sign in with Google"
   - Verify email claim is included in token

3. Test GitHub OAuth:
   - Use same URL, click "Sign in with GitHub"
   - Verify user info is retrieved correctly

## Security Best Practices

1. **Secrets Management**:
   - Never commit client secrets to git
   - Use Azure Key Vault for production secrets
   - Rotate secrets every 6 months

2. **Token Configuration**:
   - Access token lifetime: 15 minutes (non-configurable in B2C, we'll handle this in our service)
   - Refresh token lifetime: 7 days
   - Enable token rotation

3. **MFA Configuration**:
   - Enable MFA for all production tenants
   - Support TOTP, SMS, and Email OTP
   - Allow per-tenant MFA enforcement

4. **Rate Limiting**:
   - Implement rate limiting on all auth endpoints
   - Use Redis for distributed rate limiting
   - Standard: 5 attempts per 15 minutes per IP

5. **Audit Logging**:
   - Log all authentication events to Azure Application Insights
   - Include: userId, tenantId, IP, user agent, timestamp, success/failure
   - Retain logs for 7 years (compliance requirement)

## Troubleshooting

### Common Issues

1. **"AADB2C90118: The user has forgotten their password"**
   - User clicked "Forgot password?"
   - Redirect to password reset flow: `B2C_1_passwordreset`

2. **"AADB2C90091: The user has cancelled entering self-asserted information"**
   - User cancelled the flow
   - Redirect back to login page

3. **Invalid redirect URI**
   - Verify redirect URI is registered in app registration
   - Check for typos (http vs https, trailing slash)

4. **Token validation fails**
   - Verify tenant name and policy name in token issuer
   - Check token expiration
   - Ensure correct signing keys are cached

### Debug Mode

Enable detailed logging in development:

```typescript
// Enable MSAL logging
import { LogLevel } from '@azure/msal-node';

const msalConfig = {
  system: {
    loggerOptions: {
      logLevel: LogLevel.Verbose,
      loggerCallback: (level, message, containsPii) => {
        console.log(`[MSAL] ${message}`);
      },
      piiLoggingEnabled: false,
    },
  },
};
```

## Next Steps

After completing this setup:

1. ✅ Proceed to **Task 4**: Initialize auth-broker Fastify service
2. ✅ Implement authentication routes using Azure AD B2C
3. ✅ Setup token validation middleware
4. ✅ Integrate with Redis for session management

## References

- [Azure AD B2C Documentation](https://docs.microsoft.com/en-us/azure/active-directory-b2c/)
- [Azure AD B2C Custom Policies](https://docs.microsoft.com/en-us/azure/active-directory-b2c/custom-policy-overview)
- [MSAL Node Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [OAuth 2.0 Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Azure AD B2C setup guide fully documented

#### Implemented Features (✅)

- ✅ Azure AD B2C tenant creation
- ✅ Application registration
- ✅ User flows configuration
- ✅ Social identity providers (Google, GitHub)
- ✅ Enterprise SSO (SAML) configuration
- ✅ Custom domains setup
- ✅ Environment variables configuration
- ✅ Security best practices

#### Known Limitations

- ⚠️ **Custom Policies** - Custom policies mentioned but may not be fully documented
- ⚠️ **Multi-Tenant B2C** - Multi-tenant configuration may need additional documentation

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Authentication Guide](../guides/authentication.md) - Authentication implementation
- [Backend Documentation](../backend/README.md) - Backend implementation
