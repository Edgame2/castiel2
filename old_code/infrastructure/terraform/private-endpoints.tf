# Private Endpoints for Azure Services
# Excluded for hybrid-dev (no VNet, use public endpoints)

# Private DNS Zone for Cosmos DB
resource "azurerm_private_dns_zone" "cosmos" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = "privatelink.documents.azure.com"
  resource_group_name = azurerm_resource_group.main.name
  
  tags = local.common_tags
}

# Link Private DNS Zone to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "cosmos" {
  count = local.is_full_deployment ? 1 : 0
  
  name                  = "${var.resource_prefix}-cosmos-dns-link-${var.environment}"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.cosmos[0].name
  virtual_network_id    = azurerm_virtual_network.main[0].id
  registration_enabled  = false
  
  tags = local.common_tags
}

# Private Endpoint for Cosmos DB
resource "azurerm_private_endpoint" "cosmos" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = "${var.resource_prefix}-pe-cosmos-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoints[0].id
  
  private_service_connection {
    name                           = "${var.resource_prefix}-psc-cosmos-${var.environment}"
    private_connection_resource_id = azurerm_cosmosdb_account.main.id
    is_manual_connection           = false
    subresource_names              = ["Sql"]
  }
  
  private_dns_zone_group {
    name                 = "${var.resource_prefix}-cosmos-dns-zone-group"
    private_dns_zone_ids  = [azurerm_private_dns_zone.cosmos[0].id]
  }
  
  tags = local.common_tags
}

# Private DNS Zone for Key Vault
resource "azurerm_private_dns_zone" "key_vault" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = azurerm_resource_group.main.name
  
  tags = local.common_tags
}

# Link Private DNS Zone to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "key_vault" {
  count = local.is_full_deployment ? 1 : 0
  
  name                  = "${var.resource_prefix}-kv-dns-link-${var.environment}"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.key_vault[0].name
  virtual_network_id    = azurerm_virtual_network.main[0].id
  registration_enabled  = false
  
  tags = local.common_tags
}

# Private Endpoint for Key Vault
resource "azurerm_private_endpoint" "key_vault" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = "${var.resource_prefix}-pe-keyvault-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoints[0].id
  
  private_service_connection {
    name                           = "${var.resource_prefix}-psc-keyvault-${var.environment}"
    private_connection_resource_id = azurerm_key_vault.main.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }
  
  private_dns_zone_group {
    name                 = "${var.resource_prefix}-kv-dns-zone-group"
    private_dns_zone_ids  = [azurerm_private_dns_zone.key_vault[0].id]
  }
  
  tags = local.common_tags
}

# Private DNS Zone for Redis
resource "azurerm_private_dns_zone" "redis" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = azurerm_resource_group.main.name
  
  tags = local.common_tags
}

# Link Private DNS Zone to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "redis" {
  count = local.is_full_deployment ? 1 : 0
  
  name                  = "${var.resource_prefix}-redis-dns-link-${var.environment}"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.redis[0].name
  virtual_network_id    = azurerm_virtual_network.main[0].id
  registration_enabled  = false
  
  tags = local.common_tags
}

# Private Endpoint for Redis (if not using subnet injection)
# Note: Redis is already in a subnet, but we can add private endpoint for additional security
resource "azurerm_private_endpoint" "redis" {
  count = local.is_full_deployment && var.environment == "production" ? 1 : 0
  
  name                = "${var.resource_prefix}-pe-redis-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoints[0].id
  
  private_service_connection {
    name                           = "${var.resource_prefix}-psc-redis-${var.environment}"
    private_connection_resource_id = azurerm_redis_cache.main.id
    is_manual_connection           = false
    subresource_names              = ["redisCache"]
  }
  
  private_dns_zone_group {
    name                 = "${var.resource_prefix}-redis-dns-zone-group"
    private_dns_zone_ids  = [azurerm_private_dns_zone.redis[0].id]
  }
  
  tags = local.common_tags
}

# Private DNS Zone for Service Bus (deprecated - legacy only)
# @deprecated Service Bus is replaced by BullMQ/Redis. These resources are kept for legacy compatibility.
resource "azurerm_private_dns_zone" "service_bus" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = "privatelink.servicebus.windows.net"
  resource_group_name = azurerm_resource_group.main.name
  
  tags = local.common_tags
}

# Link Private DNS Zone to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "service_bus" {
  count = local.is_full_deployment ? 1 : 0
  
  name                  = "${var.resource_prefix}-sb-dns-link-${var.environment}"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.service_bus[0].name
  virtual_network_id    = azurerm_virtual_network.main[0].id
  registration_enabled  = false
  
  tags = local.common_tags
}

# Private Endpoint for Service Bus (deprecated - legacy only)
resource "azurerm_private_endpoint" "service_bus" {
  count = local.is_full_deployment && var.environment == "production" ? 1 : 0
  
  name                = "${var.resource_prefix}-pe-servicebus-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoints[0].id
  
  private_service_connection {
    name                           = "${var.resource_prefix}-psc-servicebus-${var.environment}"
    private_connection_resource_id = azurerm_servicebus_namespace.main[0].id
    is_manual_connection           = false
    subresource_names              = ["namespace"]
  }
  
  private_dns_zone_group {
    name                 = "${var.resource_prefix}-sb-dns-zone-group"
    private_dns_zone_ids  = [azurerm_private_dns_zone.service_bus[0].id]
  }
  
  tags = local.common_tags
}

