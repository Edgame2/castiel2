# Disaster Recovery Configuration

# Resource locks to prevent accidental deletion (production only)
resource "azurerm_management_lock" "cosmos_db" {
  count = var.environment == "production" ? 1 : 0
  
  name       = "${var.resource_prefix}-lock-cosmos-${var.environment}"
  scope      = azurerm_cosmosdb_account.main.id
  lock_level = "CanNotDelete"
  notes      = "Production Cosmos DB - deletion prevented"
}

resource "azurerm_management_lock" "key_vault" {
  count = var.environment == "production" ? 1 : 0
  
  name       = "${var.resource_prefix}-lock-keyvault-${var.environment}"
  scope      = azurerm_key_vault.main.id
  lock_level = "CanNotDelete"
  notes      = "Production Key Vault - deletion prevented"
}

# App Service and Functions locks removed (resources migrated to Container Apps)
# Add Container Apps locks if needed for production

# Backup configuration for Key Vault
# Note: Key Vault soft-delete and purge protection are configured in key-vault.tf
# Additional backup can be configured via Azure Backup service

# Cosmos DB continuous backup is already configured in cosmos-db.tf
# Additional point-in-time restore can be configured via Azure Portal or CLI

# Redis persistence configuration
# Note: Redis persistence is configured in redis.tf
# For production, consider enabling AOF (Append Only File) persistence

# Disaster Recovery Runbook (documentation)
# See: docs/infrastructure/DISASTER_RECOVERY_RUNBOOK.md

