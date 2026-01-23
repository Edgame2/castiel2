# Container Apps CI/CD Deployment Guide

## Overview

This guide describes the CI/CD workflow for deploying Container Apps to Azure. The workflow supports multiple environments with different deployment strategies.

## Supported Environments

### 1. Hybrid-Dev (`hybrid-dev`)
- **Purpose**: Infrastructure-only deployment for local development
- **Deploys**: Only Azure infrastructure services (Cosmos DB, Redis, Key Vault, Blob Storage, Application Insights)
- **Does NOT deploy**: Container Apps, Container Registry, or Docker images
- **Use case**: Developers running containers locally but connecting to Azure services

### 2. Development (`dev`)
- **Purpose**: Full development environment
- **Deploys**: All infrastructure + all Container Apps
- **Trigger**: Push to `develop` branch or manual workflow dispatch

### 3. Staging (`staging`)
- **Purpose**: Pre-production testing environment
- **Deploys**: All infrastructure + all Container Apps (blue/green deployment for API)
- **Trigger**: Push to `main` branch or manual workflow dispatch

### 4. Production (`production`)
- **Purpose**: Production environment
- **Deploys**: All infrastructure + all Container Apps (with approval)
- **Trigger**: Push to `main` branch (after staging) or manual workflow dispatch
- **Requires**: Manual approval in GitHub Actions

## Workflow Structure

### Job 1: Build and Push Docker Images
- **Condition**: Runs for all environments except `hybrid-dev`
- **Actions**:
  - Builds Docker images for all services (api, web, workers-sync, workers-processing, workers-ingestion)
  - Pushes images to Azure Container Registry
  - Tags images with commit SHA and `latest`

### Job 2: Deploy Infrastructure for Hybrid-Dev
- **Condition**: Only runs when `environment == 'hybrid-dev'`
- **Actions**:
  - Runs Terraform plan and apply
  - Uses `terraform.hybrid-dev.tfvars`
  - Deploys only infrastructure resources (no Container Apps)

### Job 3: Deploy to Development
- **Condition**: Runs for `dev` environment
- **Actions**:
  - Checks if Container Apps exist (fails if infrastructure not deployed)
  - Updates Container Apps with new images
  - Performs health checks

### Job 4: Deploy to Staging
- **Condition**: Runs for `staging` environment
- **Actions**:
  - Checks if Container Apps exist
  - Creates new revision for API (blue/green deployment)
  - Updates all other Container Apps
  - Runs smoke tests

### Job 5: Deploy to Production
- **Condition**: Runs for `production` environment (after staging)
- **Actions**:
  - Switches traffic to new revision (100% to latest)
  - Performs health checks
  - Sends Slack notifications

## Resource Naming Conventions

All resources follow the pattern: `castiel-{environment}-{resource-type}`

Examples:
- Resource Group: `castiel-dev-rg`, `castiel-hybrid-dev-rg`, `castiel-production-rg`
- Container App: `castiel-api-dev`, `castiel-api-production`
- Container Registry: `castiel-acr-dev`, `castiel-acr-production`

## Prerequisites

### GitHub Secrets

Configure the following secrets in your GitHub repository:

```
AZURE_CREDENTIALS_DEV       # Service principal JSON for dev/hybrid-dev
AZURE_CREDENTIALS_PROD      # Service principal JSON for staging/production
AZURE_CLIENT_ID            # Azure AD client ID (for ACR login)
AZURE_CLIENT_SECRET        # Azure AD client secret (for ACR login)
SLACK_WEBHOOK              # (Optional) Slack webhook for notifications
```

### Service Principal Permissions

The service principal needs:
- **Contributor** role on resource groups
- **AcrPush** role on Container Registry
- **Container App Contributor** role for Container Apps

## Usage

### Manual Deployment

1. Go to **Actions** → **Deploy Container Apps**
2. Click **Run workflow**
3. Select:
   - **Environment**: `hybrid-dev`, `dev`, `staging`, or `production`
   - **Service**: Leave empty for all services, or select a specific service

### Automatic Deployment

- **Push to `develop`**: Deploys to `dev` environment
- **Push to `main`**: Deploys to `staging`, then `production` (with approval)

### Deploying Specific Services

You can deploy individual services by selecting them in the workflow dispatch:

- `api`: Main API service
- `web`: Web frontend
- `workers-sync`: Sync workers
- `workers-processing`: Processing workers
- `workers-ingestion`: Ingestion workers

## Troubleshooting

### Container Apps Not Found

**Error**: `Container App 'castiel-api-dev' does not exist`

**Solution**: Deploy infrastructure first using Terraform:
```bash
cd infrastructure/terraform
terraform init
terraform plan -var-file=terraform.dev.tfvars
terraform apply
```

### Container Registry Not Found

**Error**: `Container Registry not found in resource group`

**Solution**: Ensure Terraform has been applied for the target environment. The Container Registry is only created for `dev`, `staging`, and `production` environments (not `hybrid-dev`).

### Build Failures

**Error**: Docker build fails

**Solution**:
1. Check Dockerfile syntax
2. Verify all dependencies are in `package.json`
3. Check build logs for specific errors

### Deployment Failures

**Error**: Container App update fails

**Solution**:
1. Verify Container App exists: `az containerapp show --name <name> --resource-group <rg>`
2. Check Container Registry permissions
3. Verify image exists: `az acr repository show-tags --name <acr> --repository <service>`

## Environment-Specific Notes

### Hybrid-Dev
- No Container Apps are deployed
- No Docker images are built
- Only infrastructure services are created
- Use for local development with Azure services

### Development
- All services deployed
- Auto-scaling: 0-3 replicas
- Single revision mode
- Health checks enabled

### Staging
- All services deployed
- Blue/green deployment for API
- Auto-scaling: 1-10 replicas
- Smoke tests run after deployment

### Production
- All services deployed
- Blue/green deployment for API
- Auto-scaling: 1-10 replicas
- Manual approval required
- Enhanced monitoring and alerting

## Best Practices

1. **Always deploy infrastructure first** before deploying Container Apps
2. **Test in staging** before promoting to production
3. **Use service-specific deployments** for faster iteration during development
4. **Monitor health checks** after deployment
5. **Review Terraform plans** before applying infrastructure changes

## Related Documentation

- [Hybrid Local-Azure Setup Guide](../development/HYBRID_LOCAL_AZURE_SETUP.md)
- [Terraform Deployment Guide](../infrastructure/terraform/DEPLOYMENT_MODES.md)
- [Container Apps Architecture](../architecture/CONTAINER_APPS.md)

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Container Apps CI/CD fully documented

#### Implemented Features (✅)

- ✅ Multi-environment support (hybrid-dev, dev, staging, production)
- ✅ Docker image build and push
- ✅ Infrastructure deployment
- ✅ Container Apps deployment
- ✅ Health checks
- ✅ Blue/green deployment for API

#### Known Limitations

- ⚠️ **CI/CD Testing** - CI/CD pipeline may need more testing
  - **Recommendation:**
    1. Test CI/CD pipeline in staging
    2. Add more automated tests
    3. Document CI/CD procedures

- ⚠️ **Deployment Automation** - Some deployment steps may be manual
  - **Recommendation:**
    1. Automate all deployment steps
    2. Add deployment verification
    3. Document automation procedures

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](../infrastructure/README.md) - Infrastructure overview
- [Health Checks](../operations/HEALTH_CHECKS.md) - Health check procedures



