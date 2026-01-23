# Container App for Workers Processing
# Excluded for hybrid-dev (containers run locally)

resource "azurerm_container_app" "workers_processing" {
  count = local.is_full_deployment ? 1 : 0

  name                         = "${var.resource_prefix}-workers-processing-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main[0].id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

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
    min_replicas = var.environment == "dev" ? 0 : 1
    max_replicas = var.environment == "production" ? 20 : 10

    container {
      name   = "workers-processing"
      image  = "${azurerm_container_registry.main[0].login_server}/workers-processing:latest"
      cpu    = 0.5
      memory = "1Gi"

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
        name  = "REDIS_URL"
        value = "rediss://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:6380"
      }

      env {
        name  = "KEY_VAULT_URL"
        value = azurerm_key_vault.main.vault_uri
      }

      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = azurerm_application_insights.main.connection_string
      }

      env {
        name  = "AZURE_OPENAI_ENDPOINT"
        value = "" # Set via Key Vault or environment variable
      }

      env {
        name  = "AZURE_OPENAI_API_KEY"
        value = "" # Set via Key Vault or environment variable
      }

      env {
        name  = "AZURE_OPENAI_EMBEDDING_DEPLOYMENT"
        value = "text-embedding-ada-002"
      }

      env {
        name  = "EMBEDDING_DIMENSIONS"
        value = "1536"
      }
    }
  }

  registry {
    server = azurerm_container_registry.main[0].login_server
    # Identity authentication handled via role assignments (see container-registry.tf)
  }

  # Auto-scaling rules for workers
  # Scale based on CPU and memory utilization
  # Note: Queue depth scaling requires custom metrics endpoint (see AUTOSCALING_STRATEGY.md)
  scale {
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
resource "azurerm_key_vault_access_policy" "container_app_workers_processing" {
  count = local.is_full_deployment ? 1 : 0

  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = azurerm_container_app.workers_processing[0].identity[0].tenant_id
  object_id    = azurerm_container_app.workers_processing[0].identity[0].principal_id

  secret_permissions = [
    "Get",
    "List",
  ]
}

# Grant Container App managed identity access to Cosmos DB
resource "azurerm_role_assignment" "container_app_workers_processing_cosmos" {
  count = local.is_full_deployment ? 1 : 0

  scope                = azurerm_cosmosdb_account.main.id
  role_definition_name = "Cosmos DB Built-in Data Contributor"
  principal_id         = azurerm_container_app.workers_processing[0].identity[0].principal_id
}

