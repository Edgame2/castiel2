# Terraform Deployment Cost Estimate

## ⚠️ Important: `terraform apply` WILL Deploy Resources

**Yes, `terraform apply` will create real resources in Azure and you will be charged.**

Always run `terraform plan` first to review what will be created!

## Cost Estimates by Environment

### Development Environment (`terraform.dev.tfvars`)

**Estimated Monthly Cost: ~$150-200 USD**

| Resource | SKU/Tier | Monthly Cost (Est.) |
|----------|----------|---------------------|
| **App Service Plan** | B2 (Basic) | $55 |
| **App Service** | Included in plan | $0 |
| **Function App Plan** | Y1 (Consumption) | $0* |
| **Function App** | Consumption | ~$5-20* |
| **Cosmos DB** | Serverless | ~$20-50* |
| **Redis Cache** | Standard C2 | $100 |
| **Service Bus** | Standard | $10 |
| **Key Vault** | Standard | $0.03 |
| **Application Insights** | Pay-as-you-go | ~$5-10* |
| **Log Analytics** | Per GB | ~$2-5* |
| **Storage Account** | Standard LRS | $0.50 |
| **Virtual Network** | Free | $0 |
| **Total** | | **~$150-200** |

*Variable costs based on usage

### Production Environment (`terraform.prod.tfvars`)

**Estimated Monthly Cost: ~$800-1000 USD**

| Resource | SKU/Tier | Monthly Cost (Est.) |
|----------|----------|---------------------|
| **App Service Plan** | P1v3 (2-10 instances) | $200-400 |
| **App Service** | Included in plan | $0 |
| **Function App Plan** | EP1 (Premium) | $150 |
| **Function App** | Premium EP1 | $0 (included) |
| **Cosmos DB** | Serverless | ~$200-300* |
| **Redis Cache** | Standard C2 | $100 |
| **Service Bus** | Standard | $50 |
| **Key Vault** | Standard | $0.03 |
| **Application Insights** | Pay-as-you-go | ~$10-20* |
| **Log Analytics** | Per GB | ~$5-10* |
| **Storage Account** | Standard ZRS | $1 |
| **Application Gateway WAF** | WAF_v2 (2 instances) | $100 |
| **Traffic Manager** | Performance | $0 |
| **Virtual Network** | Free | $0 |
| **DDoS Protection** | Standard | $3,000** |
| **Total** | | **~$800-1,000** |

*Variable costs based on usage  
**DDoS Protection Standard is expensive - consider if needed

## Cost Breakdown Details

### App Service Plan (Dev: B2, Prod: P1v3)

- **B2 (Dev)**: $55/month - 3.5 GB RAM, 1 core
- **P1v3 (Prod)**: $146/month per instance (2-10 instances = $292-1,460)

### Function App

- **Consumption (Dev)**: Pay per execution (~$0.20 per million executions)
- **Premium EP1 (Prod)**: $150/month flat rate

### Cosmos DB (Serverless)

- **Dev**: ~$20-50/month (low usage)
- **Prod**: ~$200-300/month (higher RU consumption)
- Charges per Request Unit (RU) consumed

### Redis Cache

- **Standard C2**: $100/month (2.5 GB cache)
- Same for both environments

### Service Bus

- **Standard**: $10/month base + $0.05 per million operations
- **Dev**: ~$10/month
- **Prod**: ~$50/month (higher message volume)

### Application Gateway WAF (Production Only)

- **WAF_v2**: ~$100/month (2 instances)
- Only created for production environment

### DDoS Protection (Production Only)

- **Standard**: $3,000/month (very expensive!)
- Currently configured but can be removed if not needed
- Basic DDoS protection is free and included

## Cost Optimization Tips

### For Development

1. **Use Consumption Plan for Functions** ✅ (already configured)
2. **Use Basic App Service Plan** ✅ (already configured)
3. **Serverless Cosmos DB** ✅ (already configured)
4. **No WAF in dev** ✅ (already configured)
5. **Auto-shutdown** (not configured - can add)

### For Production

1. **Reserved Instances**: Save 20-30% on App Service Plan
2. **Right-size resources**: Monitor and adjust based on actual usage
3. **Remove DDoS Protection Standard**: Use Basic (free) unless needed
4. **Optimize Cosmos DB queries**: Reduce RU consumption
5. **Archive old logs**: Reduce Application Insights costs

## Before Running `terraform apply`

### 1. Review What Will Be Created

```bash
terraform plan -var-file="terraform.dev.tfvars" > plan-output.txt
# Review plan-output.txt carefully
```

### 2. Check Azure Subscription

```bash
az account show
az account list  # If you have multiple subscriptions
```

### 3. Set Budget Alerts

```bash
# Budget alerts are configured in cost-management.tf
# They will notify you at 50%, 80%, and 100% of budget
```

### 4. Start with Dev Environment

```bash
# Always test in dev first!
terraform apply -var-file="terraform.dev.tfvars"
```

## Cost Monitoring

After deployment, monitor costs:

1. **Azure Portal**: Cost Management + Billing
2. **Budget Alerts**: Configured in Terraform (production)
3. **Cost Analysis**: Review daily/weekly

## Estimated First Month Costs

### Development
- **First month**: ~$150-200
- **Ongoing**: ~$150-200/month

### Production
- **First month**: ~$800-1,000
- **Ongoing**: ~$800-1,000/month (can optimize to ~$600-800)

## Important Notes

1. ⚠️ **DDoS Protection Standard costs $3,000/month** - Consider removing if not needed
2. ⚠️ **Production autoscaling** - Costs increase with scale-out (2-10 instances)
3. ⚠️ **Cosmos DB serverless** - Costs scale with usage
4. ⚠️ **Application Insights** - Data retention costs increase over time
5. ✅ **WAF only in production** - Dev environment has no WAF cost

## Cost Reduction Strategies

1. **Remove DDoS Protection Standard**: Save $3,000/month
2. **Use Reserved Instances**: Save 20-30% on App Service Plan
3. **Optimize Cosmos DB**: Reduce RU consumption
4. **Archive Application Insights**: Reduce retention costs
5. **Right-size App Service Plan**: Start with 2 instances, scale as needed

## Summary

- **Dev Environment**: ~$150-200/month
- **Production Environment**: ~$800-1,000/month (or ~$600-800 with optimizations)
- **Always run `terraform plan` first!**
- **Start with dev environment for testing**



