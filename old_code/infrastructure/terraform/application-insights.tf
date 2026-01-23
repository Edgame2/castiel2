# Application Insights
resource "azurerm_application_insights" "main" {
  name                = local.app_insights_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "Node.JS"
  retention_in_days   = 90
  sampling_percentage = var.environment == "production" ? 20 : 100
  workspace_id        = azurerm_log_analytics_workspace.main.id  # Link to Log Analytics Workspace
  tags                = local.common_tags
}

# Log Analytics Workspace (for Application Insights)
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.resource_prefix}-law-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.common_tags
}



