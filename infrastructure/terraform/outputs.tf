# Outputs for Integration Infrastructure

output "storage_account_name" {
  description = "Name of the Azure Storage Account"
  value       = azurerm_storage_account.integration_storage.name
}

output "storage_account_id" {
  description = "ID of the Azure Storage Account"
  value       = azurerm_storage_account.integration_storage.id
}

output "storage_account_primary_connection_string" {
  description = "Primary connection string for the Storage Account (sensitive)"
  value       = azurerm_storage_account.integration_storage.primary_connection_string
  sensitive   = true
}

output "storage_account_primary_access_key" {
  description = "Primary access key for the Storage Account (sensitive)"
  value       = azurerm_storage_account.integration_storage.primary_access_key
  sensitive   = true
}

output "storage_containers" {
  description = "Map of storage container names"
  value = {
    documents   = azurerm_storage_container.documents.name
    recordings  = azurerm_storage_container.recordings.name
    attachments = azurerm_storage_container.attachments.name
  }
}

output "computer_vision_endpoint" {
  description = "Endpoint URL for Computer Vision service"
  value       = azurerm_cognitive_account.computer_vision.endpoint
}

output "computer_vision_key" {
  description = "Primary access key for Computer Vision service (sensitive)"
  value       = azurerm_cognitive_account.computer_vision.primary_access_key
  sensitive   = true
}

output "computer_vision_id" {
  description = "ID of the Computer Vision Cognitive Service"
  value       = azurerm_cognitive_account.computer_vision.id
}

output "speech_endpoint" {
  description = "Endpoint URL for Speech Services"
  value       = azurerm_cognitive_account.speech.endpoint
}

output "speech_key" {
  description = "Primary access key for Speech Services (sensitive)"
  value       = azurerm_cognitive_account.speech.primary_access_key
  sensitive   = true
}

output "speech_id" {
  description = "ID of the Speech Services Cognitive Service"
  value       = azurerm_cognitive_account.speech.id
}

output "key_vault_secrets" {
  description = "Key Vault secret names (if Key Vault is configured)"
  value = var.key_vault_id != null ? {
    blob_connection_string    = azurerm_key_vault_secret.blob_connection_string[0].name
    computer_vision_endpoint  = azurerm_key_vault_secret.computer_vision_endpoint[0].name
    computer_vision_key       = azurerm_key_vault_secret.computer_vision_key[0].name
    speech_endpoint           = azurerm_key_vault_secret.speech_endpoint[0].name
    speech_key                = azurerm_key_vault_secret.speech_key[0].name
  } : null
}
