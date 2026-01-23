# Action Group for Alerts
resource "azurerm_monitor_action_group" "main" {
  name                = "${var.resource_prefix}-action-group-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "castiel"
  
  email_receiver {
    name          = "ops-team"
    email_address = "ops@castiel.com"
  }
  
  # SMS receiver for critical alerts (production only)
  dynamic "sms_receiver" {
    for_each = var.environment == "production" ? [1] : []
    content {
      name         = "oncall"
      country_code = "1"
      phone_number = "5551234567"
    }
  }
  
  tags = local.common_tags
}

# App Service Alerts (removed - App Service migrated to Container Apps)
# Legacy alerts removed - use Container Apps metrics instead
# For Container Apps monitoring, use Application Insights queries or Container Apps metrics

# Cosmos DB RU Alert
resource "azurerm_monitor_metric_alert" "cosmos_db_ru" {
  name                = "${var.resource_prefix}-cosmos-ru-alert-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_cosmosdb_account.main.id]
  description         = "Alert when Cosmos DB RU usage is high"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  
  criteria {
    metric_namespace = "Microsoft.DocumentDB/databaseAccounts"
    metric_name      = "TotalRequests"
    aggregation      = "Count"  # Changed from "Total" - TotalRequests requires Count aggregation
    operator         = "GreaterThan"
    threshold        = 10000
  }
  
  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }
  
  tags = local.common_tags
}

# Application Insights Availability Test (production only)
# Updated to use Container App API endpoint instead of App Service
resource "azurerm_application_insights_standard_web_test" "main_api" {
  count = local.is_full_deployment && var.environment == "production" ? 1 : 0
  
  name                    = "${var.resource_prefix}-availability-test"
  resource_group_name     = azurerm_resource_group.main.name
  location                = azurerm_resource_group.main.location
  application_insights_id = azurerm_application_insights.main.id
  geo_locations           = ["us-va-ash-azr", "us-ca-sjc-azr", "emea-nl-ams-azr"]
  
  request {
    url = length(azurerm_container_app.api) > 0 && length(azurerm_container_app.api[0].ingress) > 0 ? "https://${azurerm_container_app.api[0].ingress[0].fqdn}/health" : ""
  }
  
  validation_rules {
    expected_status_code = 200
  }
  
  frequency = 300  # 5 minutes
  timeout   = 30
  enabled   = true
  
  tags = local.common_tags
}

# Availability Test Alert
resource "azurerm_monitor_metric_alert" "availability" {
  count = var.environment == "production" ? 1 : 0
  
  name                = "${var.resource_prefix}-availability-alert-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when availability drops below 99%"
  severity            = 0  # Critical
  frequency           = "PT1M"
  window_size         = "PT5M"
  
  application_insights_web_test_location_availability_criteria {
    web_test_id           = azurerm_application_insights_standard_web_test.main_api[0].id
    component_id          = azurerm_application_insights.main.id
    failed_location_count = 2
  }
  
  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }
  
  tags = local.common_tags
}

# Log Analytics Queries for Custom Alerts
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "high_error_rate" {
  count = var.environment == "production" ? 1 : 0
  
  name                = "${var.resource_prefix}-high-error-rate-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  
  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 2
  
  criteria {
    query                   = <<-QUERY
      requests
      | where success == false
      | summarize ErrorCount = count() by bin(timestamp, 5m)
      | where ErrorCount > 50
    QUERY
    time_aggregation_method = "Count"
    threshold               = 50
    operator                = "GreaterThan"
    
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }
  
  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }
  
  tags = local.common_tags
}
