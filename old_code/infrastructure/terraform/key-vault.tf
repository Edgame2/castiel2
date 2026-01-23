# Azure Key Vault
# Note: azurerm_client_config data source is defined in main.tf
# Key Vault names must be 3-24 characters, so we use a shorter format
# Format: castiel-kv-{env_abbrev}-{4char_suffix}
# Examples: castiel-kv-hdev-xxxx (20 chars), castiel-kv-prod-xxxx (19 chars)
resource "azurerm_key_vault" "main" {
  name = "${var.resource_prefix}-kv-${replace(replace(var.environment, "hybrid-", "h"), "production", "prod")}-${substr(random_string.suffix.result, 0, 4)}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 90
  purge_protection_enabled   = var.environment == "production"
  
  # Network ACLs (excluded for hybrid-dev - use public access with IP restrictions)
  network_acls {
    bypass                     = "AzureServices"
    default_action             = local.is_full_deployment ? "Deny" : "Allow"  # Allow for hybrid-dev
    ip_rules                   = []
    virtual_network_subnet_ids = local.is_full_deployment ? [azurerm_subnet.app_services[0].id] : []
  }
  
  tags = local.common_tags
}

# Key Vault Access Policy for Terraform
resource "azurerm_key_vault_access_policy" "terraform" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id
  
  secret_permissions = [
    "Get",
    "List",
    "Set",
    "Delete",
    "Purge",
    "Recover"
  ]
  
  certificate_permissions = [
    "Get",
    "List",
    "Create",
    "Update",
    "Delete"
  ]
}

# Key Vault Access Policy for Container App API
# Note: This is defined in container-apps-api.tf to keep access policies with their resources

# Key Vault Secrets (placeholders - update after creation)
resource "azurerm_key_vault_secret" "redis_connection_string" {
  name         = "REDIS-CONNECTION-STRING"
  value        = "redis://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:6380?tls=true"
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}

resource "azurerm_key_vault_secret" "cosmos_db_key" {
  name         = "COSMOS-DB-KEY"
  value        = azurerm_cosmosdb_account.main.primary_key
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}

resource "azurerm_key_vault_secret" "cosmos_db_endpoint" {
  name         = "COSMOS-DB-ENDPOINT"
  value        = azurerm_cosmosdb_account.main.endpoint
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}

resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  name         = "APPLICATIONINSIGHTS-CONNECTION-STRING"
  value        = azurerm_application_insights.main.connection_string
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "JWT-SECRET"
  value        = random_password.jwt_secret.result
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}

# Random JWT secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# Placeholder secrets (to be updated manually)
resource "azurerm_key_vault_secret" "sendgrid_api_key" {
  name         = "SENDGRID-API-KEY"
  value        = "PLACEHOLDER-UPDATE-AFTER-CREATION"
  key_vault_id = azurerm_key_vault.main.id
  
  lifecycle {
    ignore_changes = [value]
  }
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}

resource "azurerm_key_vault_secret" "google_client_id" {
  name         = "GOOGLE-CLIENT-ID"
  value        = "PLACEHOLDER-UPDATE-AFTER-CREATION"
  key_vault_id = azurerm_key_vault.main.id
  
  lifecycle {
    ignore_changes = [value]
  }
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}

resource "azurerm_key_vault_secret" "google_client_secret" {
  name         = "GOOGLE-CLIENT-SECRET"
  value        = "PLACEHOLDER-UPDATE-AFTER-CREATION"
  key_vault_id = azurerm_key_vault.main.id
  
  lifecycle {
    ignore_changes = [value]
  }
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}

resource "azurerm_key_vault_secret" "github_client_id" {
  name         = "GITHUB-CLIENT-ID"
  value        = "PLACEHOLDER-UPDATE-AFTER-CREATION"
  key_vault_id = azurerm_key_vault.main.id
  
  lifecycle {
    ignore_changes = [value]
  }
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}

resource "azurerm_key_vault_secret" "github_client_secret" {
  name         = "GITHUB-CLIENT-SECRET"
  value        = "PLACEHOLDER-UPDATE-AFTER-CREATION"
  key_vault_id = azurerm_key_vault.main.id
  
  lifecycle {
    ignore_changes = [value]
  }
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}

resource "azurerm_key_vault_secret" "openai_api_key" {
  name         = "OPENAI-API-KEY"
  value        = "PLACEHOLDER-UPDATE-AFTER-CREATION"
  key_vault_id = azurerm_key_vault.main.id
  
  lifecycle {
    ignore_changes = [value]
  }
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform
  ]
}
