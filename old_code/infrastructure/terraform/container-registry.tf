# Azure Container Registry (ACR)
# Stores container images for all services
# Excluded for hybrid-dev (no containers deployed)

resource "azurerm_container_registry" "main" {
  count = local.is_full_deployment ? 1 : 0
  name                = "${var.resource_prefix}acr${var.environment}${substr(random_string.suffix.result, 0, 4)}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = var.environment == "production" ? "Premium" : "Basic"
  admin_enabled       = false # Use managed identity instead

  # Enable public network access for dev, restrict for prod
  public_network_access_enabled = var.environment == "dev" ? true : false

  # Geo-replication for production
  dynamic "georeplications" {
    for_each = var.environment == "production" ? ["westus2"] : []
    content {
      location                = georeplications.value
      zone_redundancy_enabled = true
    }
  }

  tags = local.common_tags
}

# Grant Container Apps managed identities AcrPull role on Container Registry
resource "azurerm_role_assignment" "container_app_api_acr" {
  count = local.is_full_deployment ? 1 : 0
  
  scope                = azurerm_container_registry.main[0].id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.api[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "container_app_web_acr" {
  count = local.is_full_deployment ? 1 : 0
  
  scope                = azurerm_container_registry.main[0].id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.web[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "container_app_workers_ingestion_acr" {
  count = local.is_full_deployment ? 1 : 0
  
  scope                = azurerm_container_registry.main[0].id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.workers_ingestion[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "container_app_workers_processing_acr" {
  count = local.is_full_deployment ? 1 : 0
  
  scope                = azurerm_container_registry.main[0].id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.workers_processing[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "container_app_workers_sync_acr" {
  count = local.is_full_deployment ? 1 : 0
  
  scope                = azurerm_container_registry.main[0].id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.workers_sync[0].identity[0].principal_id
}

