# Cost Management and Budgets

# Budget for the resource group
resource "azurerm_consumption_budget_subscription" "main" {
  count = var.environment == "production" ? 1 : 0
  
  name            = "${var.resource_prefix}-budget-${var.environment}"
  subscription_id = data.azurerm_client_config.current.subscription_id
  
  amount     = var.environment == "production" ? 1000 : 200  # Monthly budget in USD
  time_grain = "Monthly"
  
  time_period {
    start_date = formatdate("YYYY-MM-01'T'00:00:00Z", timestamp())
    end_date   = timeadd(formatdate("YYYY-MM-01'T'00:00:00Z", timestamp()), "8760h")  # 1 year
  }
  
  notification {
    enabled        = true
    threshold      = 50.0
    operator       = "GreaterThan"
    threshold_type = "Actual"
    
    contact_emails = [
      "ops@castiel.com",
      "finance@castiel.com"
    ]
  }
  
  notification {
    enabled        = true
    threshold      = 80.0
    operator       = "GreaterThan"
    threshold_type = "Actual"
    
    contact_emails = [
      "ops@castiel.com",
      "finance@castiel.com"
    ]
  }
  
  notification {
    enabled        = true
    threshold      = 100.0
    operator       = "GreaterThan"
    threshold_type = "Actual"
    
    contact_emails = [
      "ops@castiel.com",
      "finance@castiel.com",
      "executives@castiel.com"
    ]
  }
  
  filter {
    dimension {
      name     = "ResourceGroupName"
      operator = "In"
      values   = [azurerm_resource_group.main.name]
    }
  }
}

# Cost Alert: Unusual Spending
resource "azurerm_monitor_action_group" "cost_alerts" {
  count = var.environment == "production" ? 1 : 0
  
  name                = "${var.resource_prefix}-cost-alerts-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "cost"
  
  email_receiver {
    name          = "finance-team"
    email_address = "finance@castiel.com"
  }
  
  tags = local.common_tags
}

# Cost Alert: Daily spending threshold
# Note: Daily time_grain is not supported by Terraform azurerm provider
# For daily cost tracking, use Azure Cost Management alerts in the portal:
# https://portal.azure.com -> Cost Management + Billing -> Budgets -> Create budget
# 
# Alternatively, use Monthly budget with frequent notifications (50%, 75%, 90% thresholds)
# to approximate daily tracking.

# Cost Analysis Query (for dashboards)
# Note: Cost queries are typically created via Azure Portal or Cost Management API
# This is a placeholder for documentation

