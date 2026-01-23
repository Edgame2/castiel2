#!/bin/bash

# Azure AD B2C Setup Script
# This script automates the creation and configuration of Azure AD B2C resources
# Prerequisites: Azure CLI installed and logged in

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="castiel-auth-rg"
LOCATION="eastus"
B2C_TENANT_NAME="castiel-auth"
B2C_DISPLAY_NAME="Castiel B2C"
FRONTEND_APP_NAME="Castiel Frontend"
API_APP_NAME="Castiel Main API"

echo -e "${GREEN}======================================"
echo -e "Azure AD B2C Setup Script"
echo -e "======================================${NC}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed${NC}"
    echo "Please install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
echo -e "${YELLOW}Checking Azure CLI authentication...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Not logged in. Running 'az login'...${NC}"
    az login
fi

# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo -e "${GREEN}Using subscription: ${SUBSCRIPTION_ID}${NC}"
echo ""

# Confirm with user
echo -e "${YELLOW}This script will create the following resources:${NC}"
echo "  - Resource Group: ${RESOURCE_GROUP}"
echo "  - Location: ${LOCATION}"
echo "  - Azure AD B2C Tenant: ${B2C_TENANT_NAME}"
echo "  - Application Registration: ${FRONTEND_APP_NAME}"
echo "  - API Application: ${API_APP_NAME}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled by user${NC}"
    exit 0
fi

# Step 1: Create Resource Group
echo -e "${YELLOW}Step 1: Creating resource group...${NC}"
if az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo -e "${GREEN}Resource group already exists${NC}"
else
    az group create \
        --name $RESOURCE_GROUP \
        --location $LOCATION \
        --output none
    echo -e "${GREEN}✓ Resource group created${NC}"
fi
echo ""

# Step 2: Create Azure AD B2C Tenant
echo -e "${YELLOW}Step 2: Creating Azure AD B2C tenant...${NC}"
echo -e "${RED}Note: B2C tenant creation must be done manually via Azure Portal${NC}"
echo "  1. Go to: https://portal.azure.com"
echo "  2. Search for 'Azure Active Directory B2C'"
echo "  3. Click 'Create a new Azure AD B2C Tenant'"
echo "  4. Enter the following details:"
echo "     - Organization name: ${B2C_DISPLAY_NAME}"
echo "     - Initial domain: ${B2C_TENANT_NAME}"
echo "     - Country/Region: United States"
echo "     - Subscription: ${SUBSCRIPTION_ID}"
echo "     - Resource group: ${RESOURCE_GROUP}"
echo ""
read -p "Press Enter after you've created the B2C tenant..."
echo ""

# Get the B2C tenant ID
echo -e "${YELLOW}Please enter the B2C Tenant ID (GUID):${NC}"
read B2C_TENANT_ID

if [[ ! $B2C_TENANT_ID =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    echo -e "${RED}Error: Invalid tenant ID format${NC}"
    exit 1
fi

# Step 3: Switch to B2C tenant
echo -e "${YELLOW}Step 3: Switching to B2C tenant...${NC}"
echo -e "${RED}Note: You need to manually switch to the B2C tenant in Azure Portal${NC}"
echo "  1. In Azure Portal, click on your profile (top right)"
echo "  2. Click 'Switch directory'"
echo "  3. Select the B2C tenant: ${B2C_TENANT_NAME}"
echo ""
read -p "Press Enter after you've switched to the B2C tenant..."
echo ""

# Step 4: Register Frontend Application
echo -e "${YELLOW}Step 4: Registering Frontend application...${NC}"
echo -e "${YELLOW}Creating app registration...${NC}"

echo -e "${RED}⚠️  Manual Step Required:${NC}"
echo "Please register the application manually in Azure Portal:"
echo ""
echo "  1. Navigate to: Azure AD B2C → App registrations"
echo "  2. Click 'New registration'"
echo "  3. Configure:"
echo "     - Name: ${FRONTEND_APP_NAME}"
echo "     - Supported account types: Accounts in any identity provider"
echo "     - Redirect URI (Web): http://localhost:3000/auth/callback"
echo "  4. Click 'Register'"
echo "  5. Note down the 'Application (client) ID'"
echo "  6. Go to 'Certificates & secrets' → 'New client secret'"
echo "     - Description: frontend-app-secret"
echo "     - Expires: 24 months"
echo "  7. Copy the secret value immediately"
echo "  8. Go to 'Authentication'"
echo "     - Add redirect URIs:"
echo "       * https://app.castiel.com/auth/callback"
echo "       * https://app-staging.castiel.com/auth/callback"
echo "     - Under 'Implicit grant': Check 'ID tokens'"
echo "  9. Go to 'API permissions'"
echo "     - Add Microsoft Graph permissions: openid, profile, email, offline_access"
echo "     - Grant admin consent"
echo ""
read -p "Press Enter after you've registered the Frontend application..."
echo ""

echo -e "${YELLOW}Please enter the Frontend Application (client) ID:${NC}"
read FRONTEND_CLIENT_ID

if [[ ! $FRONTEND_CLIENT_ID =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    echo -e "${RED}Error: Invalid client ID format${NC}"
    exit 1
fi

echo -e "${YELLOW}Please paste the Frontend Client Secret:${NC}"
read -s FRONTEND_CLIENT_SECRET
echo ""

# Step 5: Register Main API Application
echo -e "${YELLOW}Step 5: Registering Main API application...${NC}"
echo -e "${RED}⚠️  Manual Step Required:${NC}"
echo "Please register the API application manually:"
echo ""
echo "  1. Azure AD B2C → App registrations → New registration"
echo "  2. Configure:"
echo "     - Name: ${API_APP_NAME}"
echo "     - Supported account types: Accounts in any identity provider"
echo "     - Redirect URI: (None)"
echo "  3. Click 'Register'"
echo "  4. Go to 'Expose an API'"
echo "     - Click 'Set' next to Application ID URI"
echo "     - Use: https://api.castiel.com"
echo "  5. Add scopes:"
echo "     - Shards.Read"
echo "     - Shards.Write"
echo "     - Shards.Delete"
echo "     - Users.Read"
echo "     - Users.Write"
echo ""
read -p "Press Enter after you've registered the Main API application..."
echo ""

echo -e "${YELLOW}Please enter the Main API Application (client) ID:${NC}"
read API_CLIENT_ID

if [[ ! $API_CLIENT_ID =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    echo -e "${RED}Error: Invalid client ID format${NC}"
    exit 1
fi

# Step 6: Create User Flows
echo -e "${YELLOW}Step 6: Creating user flows...${NC}"
echo -e "${RED}⚠️  Manual Step Required:${NC}"
echo "Please create the following user flows in Azure Portal:"
echo ""
echo "  Sign-up and Sign-in Flow:"
echo "    1. Azure AD B2C → User flows → New user flow"
echo "    2. Select 'Sign up and sign in' → Recommended → Create"
echo "    3. Name: signupsignin"
echo "    4. Identity providers: ✓ Email signup"
echo "    5. MFA: Email (Conditional)"
echo "    6. User attributes: Display Name, Email, Given Name, Surname"
echo "    7. Return claims: Same as above + Object ID, Identity Provider"
echo ""
echo "  Password Reset Flow:"
echo "    1. Azure AD B2C → User flows → New user flow"
echo "    2. Select 'Password reset' → Recommended → Create"
echo "    3. Name: passwordreset"
echo "    4. Identity providers: ✓ Email"
echo ""
echo "  Profile Editing Flow:"
echo "    1. Azure AD B2C → User flows → New user flow"
echo "    2. Select 'Profile editing' → Recommended → Create"
echo "    3. Name: profileedit"
echo "    4. Identity providers: ✓ Email"
echo ""
read -p "Press Enter after you've created all user flows..."
echo ""

# Step 7: OAuth Provider Setup Instructions
echo -e "${YELLOW}Step 7: OAuth Provider Setup${NC}"
echo -e "${RED}⚠️  Manual Steps Required for OAuth Providers:${NC}"
echo ""
echo "Google OAuth:"
echo "  1. Go to: https://console.cloud.google.com"
echo "  2. Create OAuth 2.0 credentials"
echo "  3. Authorized redirect URI:"
echo "     https://${B2C_TENANT_NAME}.b2clogin.com/${B2C_TENANT_NAME}.onmicrosoft.com/oauth2/authresp"
echo ""
echo "GitHub OAuth:"
echo "  1. Go to: https://github.com/settings/developers"
echo "  2. Create OAuth App"
echo "  3. Authorization callback URL:"
echo "     https://${B2C_TENANT_NAME}.b2clogin.com/${B2C_TENANT_NAME}.onmicrosoft.com/oauth2/authresp"
echo ""
echo "Then add them as identity providers in Azure AD B2C:"
echo "  1. Azure AD B2C → Identity providers → New OpenID Connect provider"
echo "  2. Add Google and GitHub with their credentials"
echo "  3. Add to user flow: B2C_1_signupsignin"
echo ""
read -p "Press Enter to continue..."
echo ""

# Step 8: Generate .env file
echo -e "${YELLOW}Step 8: Generating .env file...${NC}"

cat > services/main-api/.env << EOF
# Main API Service Environment Variables

# Server Configuration
PORT=3001
NODE_ENV=development
HOST=0.0.0.0
LOG_LEVEL=info
PUBLIC_API_BASE_URL=http://localhost:3001

# Monitoring (Azure Application Insights)
MONITORING_ENABLED=false
MONITORING_PROVIDER=mock
APPINSIGHTS_INSTRUMENTATION_KEY=
MONITORING_SAMPLING_RATE=1.0

# Azure Cosmos DB
COSMOS_DB_ENDPOINT=https://your-cosmosdb-account.documents.azure.com:443/
COSMOS_DB_KEY=<your-cosmosdb-key>
COSMOS_DB_DATABASE_ID=castiel
COSMOS_DB_SHARDS_CONTAINER=shards
COSMOS_DB_SHARD_TYPES_CONTAINER=shard-types
COSMOS_DB_REVISIONS_CONTAINER=revisions
COSMOS_DB_ROLES_CONTAINER=roles
COSMOS_DB_USERS_CONTAINER=users
COSMOS_DB_TENANTS_CONTAINER=tenants
COSMOS_DB_SSO_CONFIGS_CONTAINER=sso-configs
COSMOS_DB_OAUTH2_CLIENTS_CONTAINER=oauth2-clients

# Azure Cache for Redis
REDIS_HOST=your-redis-cache.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=<your-redis-password>
REDIS_TLS=true
REDIS_DB=0

# JWT Configuration
JWT_VALIDATION_CACHE_ENABLED=true
JWT_VALIDATION_CACHE_TTL=300
JWT_ACCESS_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
JWT_REFRESH_TOKEN_EXPIRY=7d
JWT_ISSUER=castiel
JWT_AUDIENCE=${FRONTEND_APP_NAME// /-}

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# GraphQL
GRAPHQL_ENABLED=true
GRAPHQL_PLAYGROUND=true
GRAPHQL_PATH=/graphql

# Resend (Email)
RESEND_API_KEY=<your-resend-api-key>
RESEND_FROM_EMAIL=noreply@castiel.com
RESEND_FROM_NAME=Castiel

# Azure AD B2C
AZURE_AD_B2C_TENANT_NAME=${B2C_TENANT_NAME}
AZURE_AD_B2C_TENANT_ID=${B2C_TENANT_ID}
AZURE_AD_B2C_CLIENT_ID=${FRONTEND_CLIENT_ID}
AZURE_AD_B2C_CLIENT_SECRET=${FRONTEND_CLIENT_SECRET}
AZURE_AD_B2C_DOMAIN=${B2C_TENANT_NAME}.b2clogin.com
AZURE_AD_B2C_CUSTOM_DOMAIN=auth.castiel.com
AZURE_AD_B2C_POLICY_SIGNUP_SIGNIN=B2C_1_signupsignin
AZURE_AD_B2C_POLICY_PASSWORD_RESET=B2C_1_passwordreset
AZURE_AD_B2C_POLICY_PROFILE_EDIT=B2C_1_profileedit

# OAuth Providers (replace with your credentials)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# URLs
FRONTEND_URL=http://localhost:3000
EOF

echo -e "${GREEN}✓ .env file created at services/main-api/.env${NC}"
echo ""

# Summary
echo -e "${GREEN}======================================"
echo -e "Setup Complete!"
echo -e "======================================${NC}"
echo ""
echo "Summary of created resources:"
echo "  - Resource Group: ${RESOURCE_GROUP}"
echo "  - B2C Tenant: ${B2C_TENANT_NAME}.onmicrosoft.com"
echo "  - B2C Tenant ID: ${B2C_TENANT_ID}"
echo "  - Frontend Client ID: ${FRONTEND_CLIENT_ID}"
echo "  - Main API Client ID: ${API_CLIENT_ID}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Update OAuth provider credentials in .env file"
echo "  2. Configure Cosmos DB and Redis (if not already done)"
echo "  3. Configure SendGrid API key"
echo "  4. Configure Application Insights instrumentation key"
echo "  5. Update .env.example files with the correct values"
echo "  6. Never commit the .env file to git!"
echo ""
echo -e "${GREEN}Configuration saved to: services/main-api/.env${NC}"
echo ""
echo "For detailed setup instructions, see:"
echo "  - docs/azure-ad-b2c-setup.md"
echo ""
