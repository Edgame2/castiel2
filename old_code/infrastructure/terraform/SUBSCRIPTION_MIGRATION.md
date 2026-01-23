# Subscription Migration Guide

## Situation

You've changed from subscription:
- **Old**: Pay-As-You-Go (08f7229a-9bfe-48fc-a81a-2d27971dcb45)
- **New**: Main (90357f88-9f70-4a1b-9ea4-b5b739799237)

## What Happened

The Terraform state file contained references to resources in the old subscription. Since you're now deploying to a new subscription, the state has been cleared to allow fresh resource creation.

## Next Steps

### 1. Verify Subscription

```bash
az account show
```

Should show: **Main** (90357f88-9f70-4a1b-9ea4-b5b739799237)

### 2. Plan Deployment

```bash
cd infrastructure/terraform
terraform plan -var-file="terraform.dev.tfvars"
```

This will show all resources that will be created in the new subscription.

### 3. Apply Deployment

```bash
terraform apply -var-file="terraform.dev.tfvars"
```

## Important Notes

### Resource Names

Resource names must be globally unique. If you get naming conflicts:
- The configuration uses a random suffix to ensure uniqueness
- You can change `resource_prefix` in `terraform.dev.tfvars` if needed

### Quota Check

Before deploying, verify quota in the new subscription:

```bash
az vm list-usage --location eastus --output table | grep -E "App Service|Dynamic"
```

If quota is insufficient, request increases via Azure Portal.

### Old Resources

If you need to manage resources in the old subscription:
1. Switch back: `az account set --subscription "08f7229a-9bfe-48fc-a81a-2d27971dcb45"`
2. Use a separate Terraform workspace or directory

### State Backup

Your old state has been backed up as:
- `terraform.tfstate.backup-YYYYMMDD-HHMMSS`
- `terraform.tfstate.backup.backup-YYYYMMDD-HHMMSS`

If you need to restore, copy the backup back to `terraform.tfstate`.

## Troubleshooting

### Error: "Resource already exists"
- Check if resources exist in the new subscription
- Either delete them or import into Terraform state

### Error: "Insufficient quota"
- Request quota increase for the new subscription
- Or use a different Azure region

### Error: "Permission denied"
- Ensure you have Contributor role on the new subscription
- Check: `az role assignment list --assignee $(az account show --query user.name -o tsv)`



