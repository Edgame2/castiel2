# Integration Infrastructure Terraform Configuration
# Azure Blob Storage and Cognitive Services for Castiel Integration System
#
# This file provisions:
# - Azure Blob Storage account with containers for documents, recordings, and attachments
# - Azure Cognitive Services (Computer Vision and Speech Services)
# - Key Vault secrets for secure credential storage

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  
  # Backend configuration (uncomment and configure for remote state)
  # backend "azurerm" {
  #   resource_group_name  = "terraform-state-rg"
  #   storage_account_name = "terraformstate"
  #   container_name       = "tfstate"
  #   key                  = "integration-infrastructure.terraform.tfstate"
  # }
}

# Provider configuration
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

# Resource Group (create if it doesn't exist, or use existing)
# Uncomment and modify if you need to create a new resource group
# resource "azurerm_resource_group" "integration" {
#   name     = "rg-castiel-integration-${var.environment}"
#   location = var.location
#   
#   tags = merge(
#     var.common_tags,
#     {
#       Purpose = "Integration Infrastructure"
#       Component = "Storage and Cognitive Services"
#     }
#   )
# }

# Azure Blob Storage Account
resource "azurerm_storage_account" "integration_storage" {
  name                     = "castielint${replace(var.environment, "-", "")}"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "production" ? "GRS" : "LRS"
  account_kind             = "StorageV2"
  min_tls_version          = "TLS1_2"
  
  # Enable blob versioning and soft delete
  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = 30
    }
    container_delete_retention_policy {
      days = 7
    }
  }
  
  # Enable HTTPS only
  enable_https_traffic_only = true
  
  # Network rules (adjust based on your security requirements)
  network_rules {
    default_action = "Allow"
    # Uncomment to restrict to specific IPs/subnets
    # ip_rules = var.allowed_ip_addresses
    # virtual_network_subnet_ids = var.allowed_subnet_ids
  }
  
  tags = merge(
    var.common_tags,
    {
      Purpose = "Integration Storage"
      Component = "Blob Storage"
    }
  )
}

# Storage Container: Documents
resource "azurerm_storage_container" "documents" {
  name                  = "integration-documents"
  storage_account_name  = azurerm_storage_account.integration_storage.name
  container_access_type = "private"
  
  # Lifecycle management policy (retention: 365 days)
  # Note: Lifecycle management is configured via Azure Policy or Storage Account management rules
}

# Storage Container: Recordings
resource "azurerm_storage_container" "recordings" {
  name                  = "integration-recordings"
  storage_account_name  = azurerm_storage_account.integration_storage.name
  container_access_type = "private"
  
  # Lifecycle management policy (retention: 90 days)
}

# Storage Container: Attachments
resource "azurerm_storage_container" "attachments" {
  name                  = "integration-attachments"
  storage_account_name  = azurerm_storage_account.integration_storage.name
  container_access_type = "private"
  
  # Lifecycle management policy (retention: 180 days)
}

# Azure Cognitive Services - Computer Vision
resource "azurerm_cognitive_account" "computer_vision" {
  name                = "castiel-vision-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  kind                = "ComputerVision"
  sku_name            = "S1"
  
  # Custom subdomain name (optional, for custom endpoints)
  custom_subdomain_name = var.computer_vision_custom_subdomain
  
  # Public network access (adjust based on security requirements)
  public_network_access_enabled = var.enable_public_network_access
  
  # Identity (optional - for managed identity)
  identity {
    type = "SystemAssigned"
  }
  
  tags = merge(
    var.common_tags,
    {
      Purpose = "Computer Vision OCR"
      Component = "Cognitive Services"
    }
  )
}

# Azure Cognitive Services - Speech Services
resource "azurerm_cognitive_account" "speech" {
  name                = "castiel-speech-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  kind                = "SpeechServices"
  sku_name            = "S0"
  
  # Custom subdomain name (optional, for custom endpoints)
  custom_subdomain_name = var.speech_custom_subdomain
  
  # Public network access (adjust based on security requirements)
  public_network_access_enabled = var.enable_public_network_access
  
  # Identity (optional - for managed identity)
  identity {
    type = "SystemAssigned"
  }
  
  tags = merge(
    var.common_tags,
    {
      Purpose = "Speech Transcription"
      Component = "Cognitive Services"
    }
  )
}

# Key Vault Secrets (if Key Vault is provided)
# Note: Key Vault must exist and have appropriate access policies
resource "azurerm_key_vault_secret" "blob_connection_string" {
  count        = var.key_vault_id != null ? 1 : 0
  name         = "integration-blob-connection-string"
  value        = azurerm_storage_account.integration_storage.primary_connection_string
  key_vault_id = var.key_vault_id
  
  content_type = "Connection String"
  
  tags = var.common_tags
}

resource "azurerm_key_vault_secret" "computer_vision_endpoint" {
  count        = var.key_vault_id != null ? 1 : 0
  name         = "computer-vision-endpoint"
  value        = azurerm_cognitive_account.computer_vision.endpoint
  key_vault_id = var.key_vault_id
  
  content_type = "Endpoint URL"
  
  tags = var.common_tags
}

resource "azurerm_key_vault_secret" "computer_vision_key" {
  count        = var.key_vault_id != null ? 1 : 0
  name         = "computer-vision-key"
  value        = azurerm_cognitive_account.computer_vision.primary_access_key
  key_vault_id = var.key_vault_id
  
  content_type = "API Key"
  
  tags = var.common_tags
}

resource "azurerm_key_vault_secret" "speech_endpoint" {
  count        = var.key_vault_id != null ? 1 : 0
  name         = "speech-endpoint"
  value        = azurerm_cognitive_account.speech.endpoint
  key_vault_id = var.key_vault_id
  
  content_type = "Endpoint URL"
  
  tags = var.common_tags
}

resource "azurerm_key_vault_secret" "speech_key" {
  count        = var.key_vault_id != null ? 1 : 0
  name         = "speech-key"
  value        = azurerm_cognitive_account.speech.primary_access_key
  key_vault_id = var.key_vault_id
  
  content_type = "API Key"
  
  tags = var.common_tags
}
