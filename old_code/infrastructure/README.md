# Infrastructure

This directory contains infrastructure-as-code and deployment configurations.

## Structure

- `terraform/` - Terraform configurations for Azure resources
  - Infrastructure definitions
  - Environment-specific variables
  - Outputs and state management

## Documentation

- [Terraform Deployment Guide](../docs/infrastructure/TERRAFORM_DEPLOYMENT.md)
- [Azure Infrastructure Setup](../docs/infrastructure/AZURE_INFRASTRUCTURE_SETUP.md)

## Quick Start

```bash
cd infrastructure/terraform
terraform init
terraform plan -var-file=terraform.dev.tfvars
terraform apply -var-file=terraform.dev.tfvars
```



