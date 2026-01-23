# Dev Environment Cost Optimization Guide

## Goal
Deploy a dev environment with **minimum cost** while staying **close to production architecture**.

## Current Dev Cost: ~$150-200/month
## Optimized Dev Cost: ~$80-120/month

## Cost Optimization Strategy

### 1. Redis Cache: Standard → Basic (Biggest Savings)

**Current**: Standard C2 = $100/month  
**Optimized**: Basic C0 = $16/month  
**Savings**: $84/month (84% reduction)

**Trade-off**: 
- Basic has no persistence/replication (fine for dev)
- Same functionality for development
- Can upgrade to Standard when needed

### 2. App Service Plan: B2 → B1 (Optional)

**Current**: B2 = $55/month (3.5 GB RAM, 1 core)  
**Optimized**: B1 = $13/month (1.75 GB RAM, 1 core)  
**Savings**: $42/month

**Trade-off**:
- Less memory (may need B2 if app is memory-intensive)
- Same CPU (1 core)
- **Recommendation**: Start with B1, upgrade to B2 if needed

### 3. Service Bus: Keep Standard (Required)

**Cost**: $10/month  
**Reason**: Standard features needed (sessions, dead-letter queues)  
**Cannot reduce**: Basic tier doesn't support required features

### 4. Cosmos DB: Keep Serverless (Already Optimal)

**Cost**: $20-50/month (pay per use)  
**Already optimized**: Serverless is cheapest for low usage

### 5. Function App: Keep Consumption (Already Optimal)

**Cost**: $5-20/month (pay per execution)  
**Already optimized**: Consumption is cheapest for dev

## Optimized Configuration

### Option 1: Maximum Savings (~$80/month)

```hcl
# In terraform.dev.tfvars or override variables:
# - Redis: Basic C0
# - App Service: B1
# - Everything else: Same as current
```

**Total**: ~$80/month

### Option 2: Balanced (Recommended) (~$100/month)

```hcl
# - Redis: Basic C0
# - App Service: B2 (keep for memory)
# - Everything else: Same as current
```

**Total**: ~$100/month  
**Best balance**: Close to production, significant savings

## Implementation Steps

### Step 1: Create Optimized Variables File

I've created `terraform.dev-optimized.tfvars` - you can use this or modify existing.

### Step 2: Update Redis Configuration

Edit `redis.tf` to use Basic tier for dev:

```hcl
# In redis.tf, change:
sku_name = var.environment == "production" ? "Standard" : "Basic"
capacity = var.environment == "production" ? 2 : 0  # C0 for Basic
family   = var.environment == "production" ? "C" : "C"
```

### Step 3: Update App Service Plan (Optional)

Edit `app-services.tf` to use B1 for dev:

```hcl
# In app-services.tf, change:
sku_name = var.environment == "production" ? "P1v3" : "B1"  # Changed from B2
```

### Step 4: Deploy

```bash
terraform plan -var-file="terraform.dev.tfvars" -out=tfplan-dev
terraform apply tfplan-dev
```

## Cost Comparison

| Configuration | Monthly Cost | Savings |
|--------------|-------------|---------|
| **Current Dev** | $150-200 | - |
| **Optimized (Balanced)** | $100-120 | $50-80 (33-40%) |
| **Optimized (Maximum)** | $80-100 | $70-100 (47-50%) |

## What Stays the Same (Production-Like)

✅ **Architecture**: Same structure, networking, security  
✅ **Services**: All services present (App Service, Functions, Cosmos DB, Service Bus)  
✅ **Monitoring**: Application Insights, alerts  
✅ **Configuration**: Same app settings, environment variables  
✅ **Scalability**: Can easily upgrade when needed  

## What's Different (Cost Optimizations)

⚠️ **Redis**: Basic instead of Standard (no replication, fine for dev)  
⚠️ **App Service**: B1 instead of B2 (less memory, upgrade if needed)  
⚠️ **No WAF**: WAF only in production (saves $100/month)  
⚠️ **No Traffic Manager**: Only in production  
⚠️ **No DDoS Protection**: Only in production  

## Upgrade Path to Production

When ready for production:

1. **Redis**: Basic → Standard (change SKU)
2. **App Service**: B1/B2 → P1v3 (change SKU)
3. **Add WAF**: Enable Application Gateway
4. **Add Traffic Manager**: Enable multi-region
5. **Scale**: Increase instances as needed

All changes are simple SKU updates - no architecture changes needed!

## Recommended Approach

**Start with Balanced Option** (~$100/month):
- Redis: Basic C0
- App Service: B2 (keep for memory)
- Everything else: Current configuration

**Why**: 
- 40% cost savings
- Still close to production
- Easy to upgrade when needed
- No functionality loss for dev

## Quick Implementation

I can update the Terraform files to implement these optimizations. Would you like me to:

1. ✅ Update `redis.tf` to use Basic for dev
2. ✅ Update `app-services.tf` to use B1 for dev (or keep B2)
3. ✅ Create optimized variables file
4. ✅ Update cost estimates

Let me know which option you prefer!



