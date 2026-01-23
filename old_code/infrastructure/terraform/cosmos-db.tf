# Cosmos DB Account
resource "azurerm_cosmosdb_account" "main" {
  name                = "${local.cosmos_db_name}-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  # Additional region for production (multi-region)
  dynamic "geo_location" {
    for_each = var.environment == "production" ? [1] : []
    content {
      location          = "westus2"
      failover_priority = 1
    }
  }

  capabilities {
    name = "EnableServerless"
  }

  backup {
    type = "Continuous"
    # Note: For Continuous backup, retention is fixed at 7-35 days based on tier
    # retention_in_hours cannot be specified for Continuous backup type
  }

  # Network isolation (excluded for hybrid-dev)
  is_virtual_network_filter_enabled = local.is_full_deployment

  dynamic "virtual_network_rule" {
    for_each = local.is_full_deployment ? [1] : []
    content {
      id = azurerm_subnet.app_services[0].id
    }
  }

  # Allow Azure Portal access
  ip_range_filter = "0.0.0.0"

  tags = local.common_tags
}

# Cosmos DB SQL Database
resource "azurerm_cosmosdb_sql_database" "main" {
  name                = "castiel"
  resource_group_name = azurerm_cosmosdb_account.main.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name

  # Note: Serverless mode (EnableServerless capability) automatically scales throughput
  # For provisioned throughput with autoscale, remove EnableServerless and use:
  # autoscale_settings {
  #   max_throughput = var.environment == "production" ? 4000 : null
  # }
}

# Users Container
resource "azurerm_cosmosdb_sql_container" "users" {
  name                = "users"
  resource_group_name = azurerm_cosmosdb_account.main.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths = ["/tenantId"] # Updated from partition_key_path (deprecated)

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }

  unique_key {
    paths = ["/email", "/tenantId"]
  }
}

# ShardTypes Container
resource "azurerm_cosmosdb_sql_container" "shard_types" {
  name                = "shard-types"
  resource_group_name = azurerm_cosmosdb_account.main.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths = ["/tenantId"] # Updated from partition_key_path (deprecated)

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }
}

# Shards Container
resource "azurerm_cosmosdb_sql_container" "shards" {
  name                = "shards"
  resource_group_name = azurerm_cosmosdb_account.main.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths = ["/tenantId"] # Updated from partition_key_path (deprecated)

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    # Exclude large fields from indexing
    excluded_path {
      path = "/unstructuredData/?"
    }

    excluded_path {
      path = "/vectors/?"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }

    # Vector embedding index for similarity search
    spatial_index {
      path = "/vectors/?"
    }

    # Composite indexes for common query patterns
    # Index 1: tenantId + shardTypeId + status + createdAt (for filtered lists with date ordering)
    composite_index {
      index {
        path  = "/tenantId"
        order = "Ascending"
      }
      index {
        path  = "/shardTypeId"
        order = "Ascending"
      }
      index {
        path  = "/status"
        order = "Ascending"
      }
      index {
        path  = "/createdAt"
        order = "Descending"
      }
    }

    # Index 2: tenantId + status + updatedAt (for recently updated shards)
    composite_index {
      index {
        path  = "/tenantId"
        order = "Ascending"
      }
      index {
        path  = "/status"
        order = "Ascending"
      }
      index {
        path  = "/updatedAt"
        order = "Descending"
      }
    }

    # Index 3: tenantId + metadata.category + createdAt (for category-filtered queries)
    composite_index {
      index {
        path  = "/tenantId"
        order = "Ascending"
      }
      index {
        path  = "/metadata/category"
        order = "Ascending"
      }
      index {
        path  = "/createdAt"
        order = "Descending"
      }
    }
  }

  # Note: analytical_storage_ttl is not supported in current Terraform provider version
  # Enable analytical storage via Azure Portal or CLI if needed
}

# Revisions Container
resource "azurerm_cosmosdb_sql_container" "revisions" {
  name                = "revisions"
  resource_group_name = azurerm_cosmosdb_account.main.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths = ["/tenantId"] # Updated from partition_key_path (deprecated)

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }

  # TTL for automatic cleanup of old revisions (90 days)
  default_ttl = 7776000
}

# SSO Configurations Container
resource "azurerm_cosmosdb_sql_container" "sso_configs" {
  name                = "sso-configs"
  resource_group_name = azurerm_cosmosdb_account.main.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths = ["/tenantId"] # Updated from partition_key_path (deprecated)

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }
}

# OAuth2 Clients Container
resource "azurerm_cosmosdb_sql_container" "oauth2_clients" {
  name                = "oauth2-clients"
  resource_group_name = azurerm_cosmosdb_account.main.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths = ["/tenantId"] # Updated from partition_key_path (deprecated)

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }

  unique_key {
    paths = ["/clientId"]
  }
}
