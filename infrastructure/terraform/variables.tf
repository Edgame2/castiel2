# Variables for Integration Infrastructure Terraform Configuration

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production"
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "Name of the existing Azure Resource Group"
  type        = string
}

variable "key_vault_id" {
  description = "ID of the Azure Key Vault for storing secrets (optional). If not provided, secrets will not be stored in Key Vault."
  type        = string
  default     = null
}

variable "enable_public_network_access" {
  description = "Enable public network access for Cognitive Services (set to false for private endpoints)"
  type        = bool
  default     = true
}

variable "computer_vision_custom_subdomain" {
  description = "Custom subdomain name for Computer Vision service (optional)"
  type        = string
  default     = null
}

variable "speech_custom_subdomain" {
  description = "Custom subdomain name for Speech Services (optional)"
  type        = string
  default     = null
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    ManagedBy   = "Terraform"
    Project     = "Castiel"
    Component   = "Integration"
  }
}

# Optional: Network security variables (uncomment if needed)
# variable "allowed_ip_addresses" {
#   description = "List of allowed IP addresses for storage account access"
#   type        = list(string)
#   default     = []
# }

# variable "allowed_subnet_ids" {
#   description = "List of allowed subnet IDs for storage account access"
#   type        = list(string)
#   default     = []
# }
