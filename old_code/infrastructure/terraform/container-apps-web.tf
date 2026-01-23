# Container App for Web
# Excluded for hybrid-dev (containers run locally)

resource "azurerm_container_app" "web" {
  count = local.is_full_deployment ? 1 : 0

  name                         = "${var.resource_prefix}-web-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main[0].id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = var.environment == "production" ? "Multiple" : "Single"

  identity {
    type = "SystemAssigned"
  }

  ingress {
    external_enabled           = true
    target_port                = 3000
    transport                  = "http"
    allow_insecure_connections = var.environment == "dev" ? true : false

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = var.environment == "dev" ? 0 : 1
    max_replicas = var.environment == "production" ? 5 : 2

    container {
      name   = "web"
      image  = "${azurerm_container_registry.main[0].login_server}/web:latest"
      cpu    = var.environment == "production" ? 0.5 : 0.25
      memory = var.environment == "production" ? "1Gi" : "512Mi"

      env {
        name  = "NODE_ENV"
        value = var.environment
      }

      env {
        name  = "PORT"
        value = "3000"
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = length(azurerm_container_app.api) > 0 && length(azurerm_container_app.api[0].ingress) > 0 && azurerm_container_app.api[0].ingress[0].external_enabled ? "http${azurerm_container_app.api[0].ingress[0].allow_insecure_connections ? "" : "s"}://${azurerm_container_app.api[0].ingress[0].fqdn}" : ""
      }
    }
  }

  registry {
    server = azurerm_container_registry.main[0].login_server
    # Identity authentication handled via role assignments (see container-registry.tf)
  }

  tags = local.common_tags
}

