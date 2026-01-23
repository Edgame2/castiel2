# Azure Key Vault Setup for Castiel

This guide covers the complete setup of Azure Key Vault for secure secrets management in the Castiel platform.

> **Note:** For gap analysis, see [Gap Analysis](../GAP_ANALYSIS.md) and [AI Features Guide](../guides/ai-features.md)

## Overview

Azure Key Vault provides centralized secrets management with:
- **Managed Identity authentication** (no credentials in code)
- **Audit logging** for all secret access
- **Secret rotation** with versioning
- **Access policies** with least privilege
- **Soft delete and purge protection** for disaster recovery

## Architecture

```
┌─────────────────────┐         ┌──────────────────┐
│  Auth Broker        │────────▶│  Azure Key Vault │
│  (Managed Identity) │         │                  │
└─────────────────────┘         │  - Redis secrets │
                                │  - JWT secrets   │
┌─────────────────────┐         │  - B2C secrets   │
│  Main API           │────────▶│  - Cosmos keys   │
│  (Managed Identity) │         │  - SendGrid keys │
└─────────────────────┘         └──────────────────┘
```

## Prerequisites

- Azure subscription
- Azure CLI installed and authenticated
- Resource group created
- App Services deployed (auth-broker, main-api)

## Step 1: Create Azure Key Vault

### Using Azure Portal

1. Navigate to **Create a resource** → **Security** → **Key Vault**
2. Fill in the details:
   - **Subscription**: Your subscription
   - **Resource Group**: Select your resource group
   - **Key Vault Name**: `castiel-keyvault-prod` (or your naming convention)
   - **Region**: Same as your app services
   - **Pricing Tier**: Standard (or Premium if you need HSM)
3. Click **Review + Create** → **Create**

### Using Azure CLI

```bash
# Variables
RESOURCE_GROUP="castiel-rg"
KEY_VAULT_NAME="castiel-keyvault-prod"
LOCATION="eastus"

# Create Key Vault
az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku standard \
  --enable-soft-delete true \
  --soft-delete-retention-days 90 \
  --enable-purge-protection true
```

## Step 2: Enable Managed Identity for App Services

### Auth Broker Service

```bash
AUTH_BROKER_NAME="castiel-auth-broker"

# Enable system-assigned managed identity
az webapp identity assign \
  --name $AUTH_BROKER_NAME \
  --resource-group $RESOURCE_GROUP

# Get the principal ID (save this)
AUTH_BROKER_IDENTITY=$(az webapp identity show \
  --name $AUTH_BROKER_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

echo "Auth Broker Identity: $AUTH_BROKER_IDENTITY"
```

### Main API Service

```bash
MAIN_API_NAME="castiel-main-api"

# Enable system-assigned managed identity
az webapp identity assign \
  --name $MAIN_API_NAME \
  --resource-group $RESOURCE_GROUP

# Get the principal ID
MAIN_API_IDENTITY=$(az webapp identity show \
  --name $MAIN_API_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

echo "Main API Identity: $MAIN_API_IDENTITY"
```

## Step 3: Grant Access Policies

Grant the App Services access to Key Vault secrets:

```bash
# Grant access to Auth Broker
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $AUTH_BROKER_IDENTITY \
  --secret-permissions get list

# Grant access to Main API
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $MAIN_API_IDENTITY \
  --secret-permissions get list
```

**Note**: Use `--secret-permissions get list` for read-only access (recommended for production). Add `set delete` only if the service needs to manage secrets.

## Step 4: Add Secrets to Key Vault

### Required Secrets for Auth Broker

```bash
# Redis
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name redis-primary-connection-string \
  --value "your-redis-connection-string"

# Azure AD B2C
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name azure-ad-b2c-client-secret \
  --value "your-b2c-client-secret"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name azure-ad-b2c-tenant-name \
  --value "your-tenant.onmicrosoft.com"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name azure-ad-b2c-client-id \
  --value "your-client-id"

# JWT Secrets (generate strong random values)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name jwt-access-secret \
  --value "$(openssl rand -base64 64)"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name jwt-refresh-secret \
  --value "$(openssl rand -base64 64)"

# SendGrid
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name sendgrid-api-key \
  --value "your-sendgrid-api-key"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name sendgrid-from-email \
  --value "noreply@yourdomain.com"
```

### Required Secrets for Main API

```bash
# Cosmos DB
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name cosmos-db-primary-key \
  --value "your-cosmos-primary-key"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name cosmos-db-secondary-key \
  --value "your-cosmos-secondary-key"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name cosmos-db-endpoint \
  --value "https://your-cosmos.documents.azure.com:443/"

# Application Insights
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name app-insights-connection-string \
  --value "your-app-insights-connection-string"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name app-insights-instrumentation-key \
  --value "your-instrumentation-key"
```

### OAuth Provider Secrets

```bash
# Google OAuth
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name google-oauth-client-id \
  --value "your-google-client-id"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name google-oauth-client-secret \
  --value "your-google-client-secret"

# GitHub OAuth
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name github-oauth-client-id \
  --value "your-github-client-id"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name github-oauth-client-secret \
  --value "your-github-client-secret"
```

### SAML Certificates (for Enterprise SSO)

```bash
# Upload SAML certificate (base64 encoded)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name saml-certificate \
  --file path/to/certificate.pem

# Upload SAML private key (base64 encoded)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name saml-private-key \
  --file path/to/private-key.pem
```

## Step 5: Configure App Services

Add the Key Vault URL to your App Service configuration:

```bash
# Auth Broker
az webapp config appsettings set \
  --name $AUTH_BROKER_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings KEY_VAULT_URL="https://${KEY_VAULT_NAME}.vault.azure.net/" \
             USE_MANAGED_IDENTITY="true"

# Main API
az webapp config appsettings set \
  --name $MAIN_API_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings KEY_VAULT_URL="https://${KEY_VAULT_NAME}.vault.azure.net/" \
             USE_MANAGED_IDENTITY="true"
```

## Step 6: Local Development Setup

### Option 1: Service Principal (Recommended)

Create a service principal for local development:

```bash
# Create service principal
SP_NAME="castiel-dev-sp"
SUBSCRIPTION_ID=$(az account show --query id --output tsv)

SP_CREDENTIALS=$(az ad sp create-for-rbac \
  --name $SP_NAME \
  --role Reader \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP)

# Extract values
TENANT_ID=$(echo $SP_CREDENTIALS | jq -r '.tenant')
CLIENT_ID=$(echo $SP_CREDENTIALS | jq -r '.appId')
CLIENT_SECRET=$(echo $SP_CREDENTIALS | jq -r '.password')

# Grant Key Vault access
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --spn $CLIENT_ID \
  --secret-permissions get list

echo "Add these to your .env file:"
echo "KEY_VAULT_URL=https://${KEY_VAULT_NAME}.vault.azure.net/"
echo "AZURE_TENANT_ID=$TENANT_ID"
echo "AZURE_CLIENT_ID=$CLIENT_ID"
echo "AZURE_CLIENT_SECRET=$CLIENT_SECRET"
echo "USE_MANAGED_IDENTITY=false"
```

### Option 2: Fallback to Environment Variables

For local development, you can disable Key Vault and use environment variables:

```bash
# In .env file
KEY_VAULT_URL=""  # Leave empty to disable Key Vault
REDIS_PRIMARY_CONNECTION_STRING="localhost:6379"
JWT_ACCESS_SECRET="local-dev-secret"
# ... other secrets
```

The KeyVaultService will automatically fall back to environment variables when Key Vault is unavailable or disabled.

## Secret Rotation

### Manual Rotation

```bash
# Update a secret
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name jwt-access-secret \
  --value "$(openssl rand -base64 64)"

# The old version is preserved
az keyvault secret list-versions \
  --vault-name $KEY_VAULT_NAME \
  --name jwt-access-secret
```

### Automatic Rotation (Recommended for Production)

Set up secret rotation policies:

```bash
# Set expiration policy (90 days)
az keyvault secret set-attributes \
  --vault-name $KEY_VAULT_NAME \
  --name jwt-access-secret \
  --expires "2024-12-31T23:59:59Z"

# Enable notification before expiry (30 days)
# Configure Azure Event Grid to trigger rotation workflow
```

## Monitoring and Auditing

### Enable Diagnostic Logging

```bash
# Create Log Analytics workspace
LOG_WORKSPACE="castiel-logs"
az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LOG_WORKSPACE

# Get workspace ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LOG_WORKSPACE \
  --query id \
  --output tsv)

# Enable diagnostic settings
az monitor diagnostic-settings create \
  --name "keyvault-diagnostics" \
  --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME" \
  --workspace $WORKSPACE_ID \
  --logs '[{"category": "AuditEvent", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

### Create Alerts

```bash
# Alert on failed secret access
az monitor metrics alert create \
  --name "keyvault-access-denied" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME" \
  --condition "count ServiceApiResult where ResultType == 'Unauthorized' > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group "your-action-group"
```

## Security Best Practices

### 1. Least Privilege Access

```bash
# Production: Read-only access
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $IDENTITY \
  --secret-permissions get list

# Admin: Full access (use sparingly)
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $ADMIN_IDENTITY \
  --secret-permissions get list set delete backup restore recover purge
```

### 2. Network Security

```bash
# Restrict to specific VNet (production)
az keyvault network-rule add \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --vnet-name "castiel-vnet" \
  --subnet "app-services-subnet"

# Remove default allow
az keyvault update \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --default-action Deny
```

### 3. Soft Delete and Purge Protection

Already enabled during creation. To verify:

```bash
az keyvault show \
  --name $KEY_VAULT_NAME \
  --query "[enableSoftDelete, enablePurgeProtection]"
```

### 4. Secret Expiration

Set expiration dates for all secrets:

```bash
az keyvault secret set-attributes \
  --vault-name $KEY_VAULT_NAME \
  --name jwt-access-secret \
  --expires "2025-03-31T23:59:59Z"
```

### 5. Regular Audits

```bash
# List all secrets
az keyvault secret list \
  --vault-name $KEY_VAULT_NAME \
  --query "[].{name:name, expires:attributes.expires}" \
  --output table

# Check access policies
az keyvault show \
  --name $KEY_VAULT_NAME \
  --query "properties.accessPolicies" \
  --output table
```

## Disaster Recovery

### Backup Key Vault

```bash
# Backup all secrets
BACKUP_DIR="./keyvault-backup"
mkdir -p $BACKUP_DIR

for secret in $(az keyvault secret list --vault-name $KEY_VAULT_NAME --query "[].name" -o tsv); do
  az keyvault secret backup \
    --vault-name $KEY_VAULT_NAME \
    --name $secret \
    --file "$BACKUP_DIR/$secret.backup"
done
```

### Restore Key Vault

```bash
# Restore secrets
for backup in $BACKUP_DIR/*.backup; do
  az keyvault secret restore \
    --vault-name $KEY_VAULT_NAME \
    --file $backup
done
```

## Troubleshooting

### Error: "The user, group or application does not have secrets get permission"

```bash
# Check access policies
az keyvault show \
  --name $KEY_VAULT_NAME \
  --query "properties.accessPolicies[?objectId=='$IDENTITY'].permissions.secrets"

# Grant access
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $IDENTITY \
  --secret-permissions get list
```

### Error: "Key Vault health check failed"

Check:
1. Key Vault URL is correct
2. Managed Identity is enabled
3. Access policies are configured
4. Network rules allow access
5. Key Vault is not soft-deleted

```bash
# Verify Key Vault exists
az keyvault list --query "[?name=='$KEY_VAULT_NAME']"

# Check if soft-deleted
az keyvault list-deleted --query "[?name=='$KEY_VAULT_NAME']"

# Recover if needed
az keyvault recover --name $KEY_VAULT_NAME
```

### Local Development Issues

If Key Vault is not accessible locally:

1. Ensure service principal credentials are correct
2. Check `USE_MANAGED_IDENTITY=false` in `.env`
3. Or disable Key Vault by leaving `KEY_VAULT_URL` empty
4. Service will fall back to environment variables

## Multi-Environment Setup

### Development

```bash
KEY_VAULT_NAME="castiel-keyvault-dev"
# Less restrictive policies, shorter retention
```

### Staging

```bash
KEY_VAULT_NAME="castiel-keyvault-staging"
# Similar to production, use production-like secrets
```

### Production

```bash
KEY_VAULT_NAME="castiel-keyvault-prod"
# Strict policies, long retention, network restrictions
```

## Cost Optimization

- **Standard tier** is sufficient for most use cases ($0.03 per 10,000 transactions)
- **Premium tier** ($1/month per key) only needed for HSM-backed keys
- Cache secrets in application (5-minute TTL) to reduce API calls
- Monitor usage with Azure Cost Management

## Resources

- [Azure Key Vault Documentation](https://docs.microsoft.com/azure/key-vault/)
- [Managed Identity Documentation](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/)
- [Secret Rotation Best Practices](https://docs.microsoft.com/azure/key-vault/secrets/tutorial-rotation)

## Next Steps

1. ✅ Create Key Vault
2. ✅ Enable Managed Identity
3. ✅ Configure access policies
4. ✅ Add secrets
5. ✅ Configure App Services
6. ✅ Test connectivity
7. ⚠️ Set up secret rotation (partially implemented)
8. ⚠️ Configure monitoring and alerts (partially implemented)
9. ⚠️ Document secret owners and rotation schedule (needs improvement)
10. ⚠️ Conduct security audit (recommended)

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Mostly Complete** - Key Vault setup guide fully documented

#### Implemented Features (✅)

- ✅ Key Vault creation and configuration
- ✅ Managed Identity setup
- ✅ Access policies configuration
- ✅ Secret management
- ✅ App Services integration
- ✅ Local development setup
- ✅ Secret rotation procedures (documented)

#### Known Limitations

- ⚠️ **Secret Rotation** - Procedures documented but may not be fully automated
  - **Recommendation:**
    1. Implement automated secret rotation
    2. Set up rotation schedules
    3. Document rotation procedures

- ⚠️ **Monitoring and Alerts** - Monitoring setup may not be complete
  - **Recommendation:**
    1. Set up comprehensive monitoring
    2. Configure alerts for secret access
    3. Document alert procedures

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [AI Features Guide](../guides/ai-features.md) - AI features with Key Vault integration
- [Infrastructure README](../infrastructure/README.md) - Infrastructure overview
