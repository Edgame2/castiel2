# Castiel API - Azure Infrastructure

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Remote state storage
  # Configure backend for production:
  # terraform init -backend-config="storage_account_name=castieltfstate" \
  #                -backend-config="container_name=tfstate" \
  #                -backend-config="key=castiel-${var.environment}.terraform.tfstate" \
  #                -backend-config="resource_group_name=castiel-tfstate-rg"
  
  # For now, using local state. Uncomment and configure for production:
  # backend "azurerm" {
  #   resource_group_name  = "castiel-tfstate-rg"
  #   storage_account_name = "castieltfstate${random_string.suffix.result}"
  #   container_name       = "tfstate"
  #   key                  = "castiel-${var.environment}.terraform.tfstate"
  #   use_azuread_auth     = true
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (hybrid-dev, dev, staging, production)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["hybrid-dev", "dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: hybrid-dev, dev, staging, production"
  }
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "resource_prefix" {
  description = "Prefix for all resources"
  type        = string
  default     = "castiel"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "Castiel"
    ManagedBy   = "Terraform"
    Environment = "dev"
  }
}

# Current Azure AD tenant data (used by multiple resources)
data "azurerm_client_config" "current" {}

# Locals
locals {
  resource_group_name = "${var.resource_prefix}-${var.environment}-rg"
  app_service_plan_name = "${var.resource_prefix}-${var.environment}-asp"
  main_api_name = "${var.resource_prefix}-api-${var.environment}"
  cosmos_db_name = "${var.resource_prefix}-cosmos-${var.environment}"
  redis_name = "${var.resource_prefix}-redis-${var.environment}"
  key_vault_name = "${var.resource_prefix}-kv-${var.environment}"
  app_insights_name = "${var.resource_prefix}-ai-${var.environment}"
  vnet_name = "${var.resource_prefix}-vnet-${var.environment}"
  service_bus_name = "${var.resource_prefix}-sb-${var.environment}"
  functions_name = "${var.resource_prefix}-functions-${var.environment}"
  
  # Deployment mode flags
  is_hybrid_dev = var.environment == "hybrid-dev"
  is_full_deployment = !local.is_hybrid_dev
  
  common_tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Random suffix for globally unique names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}
