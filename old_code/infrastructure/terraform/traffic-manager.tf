# Azure Traffic Manager for Multi-Region Load Balancing

# Traffic Manager Profile
resource "azurerm_traffic_manager_profile" "main" {
  count = var.environment == "production" ? 1 : 0
  
  name                   = "${var.resource_prefix}-tm-${var.environment}"
  resource_group_name    = azurerm_resource_group.main.name
  traffic_routing_method = "Performance"  # Route to closest region
  
  dns_config {
    relative_name = "${var.resource_prefix}-api-${var.environment}"
    ttl           = 60
  }
  
  monitor_config {
    protocol                     = "HTTPS"
    port                         = 443
    path                         = "/health"
    interval_in_seconds          = 30
    timeout_in_seconds           = 10
    tolerated_number_of_failures = 3
  }
  
  tags = local.common_tags
}

# Primary endpoint (East US) - Updated to use Container App
resource "azurerm_traffic_manager_azure_endpoint" "primary" {
  count = local.is_full_deployment && var.environment == "production" ? 1 : 0
  
  name               = "${var.resource_prefix}-api-primary"
  profile_id         = azurerm_traffic_manager_profile.main[0].id
  target_resource_id = length(azurerm_container_app.api) > 0 ? azurerm_container_app.api[0].id : null
  weight             = 100
  priority           = 1
  
  custom_header {
    name  = "X-Region"
    value = "eastus"
  }
}

# Secondary endpoint (West US 2) - requires secondary App Service deployment
# This endpoint would be created when deploying to secondary region
# resource "azurerm_traffic_manager_azure_endpoint" "secondary" {
#   count = var.environment == "production" ? 1 : 0
#   
#   name               = "${var.resource_prefix}-api-secondary"
#   profile_id         = azurerm_traffic_manager_profile.main[0].id
#   target_resource_id = azurerm_linux_web_app.secondary_api.id  # Secondary region App Service
#   weight             = 100
#   priority           = 2
#   
#   custom_header {
#     name  = "X-Region"
#     value = "westus2"
#   }
# }

