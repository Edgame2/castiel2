# Azure Cache for Redis
resource "azurerm_redis_cache" "main" {
  name                = "${local.redis_name}-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  # Use Basic C0 for dev (cheaper), Standard C2 for production
  capacity            = var.environment == "production" ? 2 : 0
  family              = "C"
  sku_name            = var.environment == "production" ? "Standard" : "Basic"
  non_ssl_port_enabled = false
  minimum_tls_version = "1.2"
  
  redis_configuration {
    maxmemory_policy              = "allkeys-lru"
    # Note: Basic tier doesn't support notify_keyspace_events or memory reservations
    # These settings only apply to Standard/Premium tiers
    maxmemory_reserved            = var.environment == "production" ? 50 : null
    maxfragmentationmemory_reserved = var.environment == "production" ? 50 : null
    notify_keyspace_events        = var.environment == "production" ? "Ex" : null  # Not supported on Basic tier
    
    # Enable Redis persistence for production only
    rdb_backup_enabled            = var.environment == "production" ? true : null
    rdb_backup_frequency          = var.environment == "production" ? 60 : null
    rdb_backup_max_snapshot_count = var.environment == "production" ? 1 : null
    rdb_storage_connection_string = var.environment == "production" ? azurerm_storage_account.redis_backup[0].primary_blob_connection_string : null
  }
  
  # Network isolation
  # Note: Basic tier doesn't support VNet integration, only Standard/Premium do
  # For dev with Basic tier, we'll use public endpoint with firewall rules
  # For production with Standard tier, use VNet integration
  # Excluded for hybrid-dev (no VNet)
  subnet_id = local.is_full_deployment && var.environment == "production" ? azurerm_subnet.redis[0].id : null
  
  tags = local.common_tags
}

# Storage account for Redis backups (production only)
resource "azurerm_storage_account" "redis_backup" {
  count = var.environment == "production" ? 1 : 0
  
  name                     = "${var.resource_prefix}redisbkp${var.environment}${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  min_tls_version          = "TLS1_2"
  
  tags = local.common_tags
}

# Blob Storage account for document management (all environments)
# Storage account names: 3-24 chars, lowercase alphanumeric only, globally unique
resource "azurerm_storage_account" "blob_storage" {
  name                     = "${lower(replace(var.resource_prefix, "-", ""))}stg${lower(replace(replace(var.environment, "-", ""), "production", "prod"))}${substr(random_string.suffix.result, 0, 4)}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "production" ? "GRS" : "LRS"
  min_tls_version          = "TLS1_2"
  
  # Enable blob services
  blob_properties {
    delete_retention_policy {
      days = var.environment == "production" ? 30 : 7
    }
  }
  
  tags = local.common_tags
}

# Blob containers for document management
resource "azurerm_storage_container" "documents" {
  name                  = "documents"
  storage_account_name  = azurerm_storage_account.blob_storage.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "quarantine" {
  name                  = "quarantine"
  storage_account_name  = azurerm_storage_account.blob_storage.name
  container_access_type = "private"
}

# Redis Diagnostic Settings
resource "azurerm_monitor_diagnostic_setting" "redis" {
  name                       = "${local.redis_name}-diagnostics"
  target_resource_id         = azurerm_redis_cache.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  
  enabled_log {
    category = "ConnectedClientList"
  }
  
  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Redis Alerts
resource "azurerm_monitor_metric_alert" "redis_memory" {
  name                = "${local.redis_name}-memory-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_redis_cache.main.id]
  description         = "Alert when Redis memory usage exceeds 85%"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  
  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "usedmemorypercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 85
  }
  
  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }
  
  tags = local.common_tags
}

resource "azurerm_monitor_metric_alert" "redis_connections" {
  name                = "${local.redis_name}-connections-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_redis_cache.main.id]
  description         = "Alert on high Redis connection count"
  severity            = 3
  frequency           = "PT5M"
  window_size         = "PT15M"
  
  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "connectedclients"
    aggregation      = "Maximum"
    operator         = "GreaterThan"
    threshold        = 1000
  }
  
  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }
  
  tags = local.common_tags
}

# Cache hit rate alert - disabled for Basic tier (metric not available)
# For Basic tier Redis, cache hit rate metrics are not available
# Use cachehits and cachemisses metrics separately if needed, or upgrade to Standard tier
# resource "azurerm_monitor_metric_alert" "redis_cache_hit_rate" {
#   count = var.environment == "production" ? 1 : 0  # Only for Standard tier
#   
#   name                = "${local.redis_name}-hit-rate-alert"
#   resource_group_name = azurerm_resource_group.main.name
#   scopes              = [azurerm_redis_cache.main.id]
#   description         = "Alert when cache hit rate drops below 60%"
#   severity            = 3
#   frequency           = "PT5M"
#   window_size         = "PT15M"
#   
#   criteria {
#     metric_namespace = "Microsoft.Cache/redis"
#     metric_name      = "cachehits"  # Use cachehits metric instead
#     aggregation      = "Average"
#     operator         = "LessThan"
#     threshold        = 1000
#   }
#   
#   action {
#     action_group_id = azurerm_monitor_action_group.main.id
#   }
#   
#   tags = local.common_tags
# }
