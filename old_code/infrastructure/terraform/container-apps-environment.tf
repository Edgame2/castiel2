# Container Apps Environment
# Shared environment for all Container Apps (networking, logging)
# Excluded for hybrid-dev (no containers deployed)

resource "azurerm_container_app_environment" "main" {
  count                      = local.is_full_deployment ? 1 : 0
  name                       = "${var.resource_prefix}-ca-env-${var.environment}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  # Infrastructure subnet (optional, for VNet integration)
  # infrastructure_subnet_id = azurerm_subnet.container_apps.id

  # Workload profile (for dev, use Consumption; for prod, can use Dedicated)
  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  tags = local.common_tags
}

# Dapr configuration (optional, for service-to-service communication)
# Uncomment if you want to use Dapr for state management
# resource "azurerm_container_app_environment_dapr_component" "main" {
#   name                         = "dapr"
#   container_app_environment_id = azurerm_container_app_environment.main.id
#   component_type               = "state.azure.cosmosdb"
#   version                      = "v1"
#
#   metadata {
#     name  = "url"
#     value = azurerm_cosmosdb_account.main.endpoint
#   }
#
#   metadata {
#     name  = "masterKey"
#     value = azurerm_cosmosdb_account.main.primary_key
#   }
#
#   metadata {
#     name  = "database"
#     value = azurerm_cosmosdb_sql_database.main.name
#   }
# }

