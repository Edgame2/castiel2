# Container App for Main API
# Excluded for hybrid-dev (containers run locally)

resource "azurerm_container_app" "api" {
  count = local.is_full_deployment ? 1 : 0

  name                         = "${var.resource_prefix}-api-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main[0].id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = var.environment == "production" ? "Multiple" : "Single"

  identity {
    type = "SystemAssigned"
  }

  ingress {
    external_enabled           = true
    target_port                = 8080
    transport                  = "http"
    allow_insecure_connections = var.environment == "dev" ? true : false

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = var.environment == "dev" ? 0 : (var.environment == "production" ? 2 : 1)
    max_replicas = var.environment == "production" ? 20 : 3

    container {
      name   = "api"
      image  = "${azurerm_container_registry.main[0].login_server}/api:latest"
      cpu    = var.environment == "production" ? 1.0 : 0.5
      memory = var.environment == "production" ? "2Gi" : "1Gi"

      env {
        name  = "NODE_ENV"
        value = var.environment
      }

      env {
        name  = "PORT"
        value = "8080"
      }

      env {
        name  = "COSMOS_DB_ENDPOINT"
        value = azurerm_cosmosdb_account.main.endpoint
      }

      env {
        name  = "COSMOS_DB_DATABASE"
        value = azurerm_cosmosdb_sql_database.main.name
      }

      env {
        name  = "COSMOS_DB_KEY"
        value = azurerm_cosmosdb_account.main.primary_key
      }

      env {
        name  = "REDIS_HOST"
        value = azurerm_redis_cache.main.hostname
      }

      env {
        name  = "REDIS_PORT"
        value = "6380"
      }

      env {
        name  = "REDIS_TLS_ENABLED"
        value = "true"
      }

      env {
        name  = "REDIS_PASSWORD"
        value = azurerm_redis_cache.main.primary_access_key
      }

      env {
        name  = "KEY_VAULT_URL"
        value = azurerm_key_vault.main.vault_uri
      }

      env {
        name  = "KEY_VAULT_ENABLED"
        value = "true"
      }

      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = azurerm_application_insights.main.connection_string
      }

      env {
        name  = "MONITORING_ENABLED"
        value = "true"
      }

      env {
        name  = "MONITORING_PROVIDER"
        value = "azure"
      }
    }
  }

  registry {
    server = azurerm_container_registry.main[0].login_server
    # Identity authentication handled via role assignments (see container-registry.tf)
  }

  # Auto-scaling rules for API
  # Scale based on HTTP request rate, CPU, and memory utilization
  scale {
    # HTTP request rate scaling
    rule {
      name = "http-requests"
      http {
        concurrent_requests = 50 # Scale up when > 50 concurrent requests per replica
      }
    }

    # CPU utilization scaling
    rule {
      name = "cpu-utilization"
      cpu {
        utilization_percentage = 70 # Scale up when CPU > 70%
      }
    }

    # Memory utilization scaling
    rule {
      name = "memory-utilization"
      memory {
        utilization_percentage = 80 # Scale up when memory > 80%
      }
    }
  }

  tags = local.common_tags
}

# Grant Container App managed identity access to Key Vault
resource "azurerm_key_vault_access_policy" "container_app_api" {
  count = local.is_full_deployment ? 1 : 0

  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = azurerm_container_app.api[0].identity[0].tenant_id
  object_id    = azurerm_container_app.api[0].identity[0].principal_id

  secret_permissions = [
    "Get",
    "List",
  ]
}

# Grant Container App managed identity access to Cosmos DB
# Using Cosmos DB Data Contributor role via Azure RBAC
resource "azurerm_role_assignment" "container_app_api_cosmos" {
  count = local.is_full_deployment ? 1 : 0

  scope                = azurerm_cosmosdb_account.main.id
  role_definition_name = "Cosmos DB Built-in Data Contributor"
  principal_id         = azurerm_container_app.api[0].identity[0].principal_id
}

