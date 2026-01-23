# Deployment Readiness Checklist

> **Purpose**: Verify all components are ready for deployment to Azure Container Apps  
> **Last Updated**: 2025-01-28

---

## Pre-Deployment Verification

### 1. Code Quality ✅

- [x] All worker applications compile without errors
- [x] TypeScript type checking passes
- [x] No critical TODOs in worker code
- [x] Health checks implemented for all services
- [x] Environment variable validation in place
- [x] Error handling implemented
- [x] Logging standardized

### 2. Infrastructure Configuration ✅

- [x] Terraform configurations for all environments
  - [x] Hybrid Dev (`terraform.hybrid-dev.tfvars`)
  - [x] Dev (`terraform.dev.tfvars`)
  - [x] Production (`terraform.production.tfvars`)
- [x] Container Apps resources defined
- [x] Container Registry configured
- [x] Networking configured (conditional)
- [x] Monitoring and alerting configured
- [x] Key Vault access policies configured
- [x] Cosmos DB access policies configured

### 3. Queue System ✅

- [x] Service Bus removed from active code
- [x] BullMQ queue system implemented
- [x] Redis connection configured
- [x] Queue producers working
- [x] Queue consumers (workers) implemented
- [x] Queue names centralized in `QueueName` enum

### 4. CI/CD Pipeline ✅

- [x] GitHub Actions workflow updated
- [x] Docker builds configured
- [x] Container Registry push configured
- [x] Deployment jobs for all environments
- [x] Conditional builds for hybrid-dev
- [x] Terraform deployment for hybrid-dev

### 5. Documentation ✅

- [x] Migration documentation complete
- [x] Development guides updated
- [x] Build verification guide created
- [x] Environment variables documented
- [x] Health checks documented
- [x] CI/CD deployment guide created

---

## Deployment Steps

### Step 1: Hybrid Dev Environment (Infrastructure Only)

**Purpose**: Deploy infrastructure services for local development

```bash
# 1. Navigate to Terraform directory
cd infrastructure/terraform

# 2. Initialize Terraform
terraform init

# 3. Plan deployment
terraform plan -var-file=terraform.hybrid-dev.tfvars

# 4. Apply deployment
terraform apply -var-file=terraform.hybrid-dev.tfvars

# 5. Get connection strings
terraform output redis_connection_string
terraform output blob_storage_connection_string
```

**Expected Resources**:
- ✅ Cosmos DB Account
- ✅ Redis Cache (Basic tier)
- ✅ Key Vault
- ✅ Blob Storage Account
- ✅ Application Insights
- ❌ No Container Apps
- ❌ No Container Registry
- ❌ No Networking

**Verification**:
- [ ] Cosmos DB accessible from local machine
- [ ] Redis accessible from local machine
- [ ] Key Vault accessible (with authentication)
- [ ] Blob Storage accessible
- [ ] Application Insights receiving data

---

### Step 2: Dev Environment (Full Deployment)

**Purpose**: Deploy complete application to development environment

**Option A: Manual Deployment**

```bash
# 1. Build and push Docker images
docker-compose build
# Or use CI/CD pipeline

# 2. Deploy infrastructure
cd infrastructure/terraform
terraform init
terraform plan -var-file=terraform.dev.tfvars
terraform apply -var-file=terraform.dev.tfvars

# 3. Deploy Container Apps (via CI/CD or Azure CLI)
# See CI/CD documentation
```

**Option B: CI/CD Deployment**

```bash
# 1. Push to GitHub
git push origin main

# 2. Trigger workflow
# Go to GitHub Actions and run workflow with environment=dev
```

**Expected Resources**:
- ✅ All infrastructure services
- ✅ Container Registry
- ✅ Container Apps Environment
- ✅ Container Apps (api, web, workers-sync, workers-processing, workers-ingestion)
- ✅ Networking (if configured)
- ✅ Monitoring and alerting

**Verification**:
- [ ] All Container Apps deployed
- [ ] Health checks responding
- [ ] API accessible
- [ ] Web frontend accessible
- [ ] Workers processing jobs
- [ ] Monitoring data flowing

---

### Step 3: Production Environment

**Purpose**: Deploy to production with production-tier resources

**Prerequisites**:
- [ ] Dev environment tested and verified
- [ ] All issues resolved
- [ ] Performance testing completed
- [ ] Security review completed

**Deployment**:
```bash
# Use CI/CD pipeline with environment=production
# Or manual deployment with terraform.production.tfvars
```

**Expected Resources**:
- ✅ All infrastructure services (production-tier SKUs)
- ✅ Container Apps with production settings
- ✅ Enhanced monitoring and alerting
- ✅ Multi-region support (if applicable)
- ✅ Backup and disaster recovery configured

**Verification**:
- [ ] All services operational
- [ ] Performance metrics acceptable
- [ ] Error rates within acceptable range
- [ ] Monitoring and alerting working
- [ ] Backup and recovery tested

---

## Post-Deployment Verification

### 1. Health Checks

Verify all health endpoints:
```bash
# API
curl https://<api-fqdn>/health

# Web
curl https://<web-fqdn>/api/health

# Workers (internal)
curl https://<workers-sync-fqdn>/health
curl https://<workers-processing-fqdn>/health
curl https://<workers-ingestion-fqdn>/health
```

### 2. Queue Operations

Verify queue operations:
- [ ] Jobs can be enqueued
- [ ] Workers process jobs
- [ ] Failed jobs handled correctly
- [ ] Dead letter queue working (if configured)

### 3. End-to-End Workflows

Test complete workflows:
- [ ] Document upload → processing → embedding
- [ ] External sync (Salesforce, Google Drive, Slack)
- [ ] Content generation
- [ ] Risk evaluation
- [ ] Notification delivery

### 4. Monitoring

Verify monitoring:
- [ ] Application Insights receiving data
- [ ] Custom metrics working
- [ ] Alerts configured and tested
- [ ] Logs accessible

### 5. Performance

Verify performance:
- [ ] Response times acceptable
- [ ] Auto-scaling working
- [ ] Resource utilization within limits
- [ ] No memory leaks

---

## Rollback Plan

If issues occur during deployment:

### 1. Infrastructure Rollback

```bash
# Revert Terraform changes
cd infrastructure/terraform
terraform plan -var-file=terraform.<env>.tfvars
terraform apply -var-file=terraform.<env>.tfvars -auto-approve
```

### 2. Container Apps Rollback

```bash
# Revert to previous revision
az containerapp revision activate \
  --name <app-name> \
  --resource-group <rg-name> \
  --revision <previous-revision>
```

### 3. Queue System Rollback

If queue issues occur:
- Check Redis connection
- Verify queue names match
- Check worker configurations
- Review error logs

---

## Troubleshooting

### Common Issues

1. **Container Apps not starting**
   - Check environment variables
   - Verify health checks
   - Review logs in Application Insights

2. **Queue jobs not processing**
   - Verify Redis connection
   - Check worker configurations
   - Review queue names

3. **Health checks failing**
   - Check dependencies (Redis, Cosmos DB)
   - Verify environment variables
   - Review application logs

4. **Build failures**
   - Check Docker build logs
   - Verify package dependencies
   - Check TypeScript compilation

---

## Support Resources

- **Documentation**: See [Migration Complete Summary](./MIGRATION_COMPLETE_SUMMARY.md)
- **Development**: See [Development Guide](../DEVELOPMENT.md)
- **Operations**: See [Health Checks](../operations/HEALTH_CHECKS.md)
- **CI/CD**: See [Container Apps Deployment](../ci-cd/CONTAINER_APPS_DEPLOYMENT.md)

---

**Status**: ✅ **READY FOR DEPLOYMENT**



