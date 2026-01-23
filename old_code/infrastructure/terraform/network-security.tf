# Network Security Groups (NSGs) with least-privilege rules
# Excluded for hybrid-dev (no VNet)

# NSG for App Services subnet
resource "azurerm_network_security_group" "app_services" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = "${var.resource_prefix}-nsg-app-services-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  # Allow outbound HTTPS for Azure services
  security_rule {
    name                       = "AllowHTTPSOutbound"
    priority                   = 1000
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "Internet"
    description                = "Allow HTTPS outbound for Azure services"
  }
  
  # Allow outbound to Azure SQL/Cosmos DB
  security_rule {
    name                       = "AllowCosmosDBOutbound"
    priority                   = 1001
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "AzureCosmosDB"
    description                = "Allow outbound to Cosmos DB"
  }
  
  # Allow outbound to Storage
  security_rule {
    name                       = "AllowStorageOutbound"
    priority                   = 1002
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "Storage"
    description                = "Allow outbound to Azure Storage"
  }
  
  # Allow outbound to Service Bus (port 5671 for AMQP over TLS) - deprecated, legacy only
  # @deprecated Service Bus is replaced by BullMQ/Redis. This rule is kept for legacy compatibility.
  security_rule {
    name                       = "AllowServiceBusOutbound"
    priority                   = 1003
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5671"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "ServiceBus"
    description                = "Allow outbound to Service Bus (AMQP over TLS) - deprecated, legacy only"
  }
  
  # Deny all other outbound
  security_rule {
    name                       = "DenyAllOutbound"
    priority                   = 4000
    direction                  = "Outbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
    description                = "Deny all other outbound traffic"
  }
  
  tags = local.common_tags
}

# Associate NSG with App Services subnet
resource "azurerm_subnet_network_security_group_association" "app_services" {
  count = local.is_full_deployment ? 1 : 0
  
  subnet_id                 = azurerm_subnet.app_services[0].id
  network_security_group_id = azurerm_network_security_group.app_services[0].id
}

# NSG for Redis subnet
resource "azurerm_network_security_group" "redis" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = "${var.resource_prefix}-nsg-redis-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  # Allow inbound from App Services subnet only
  security_rule {
    name                       = "AllowRedisInboundFromAppServices"
    priority                   = 1000
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6380"
    source_address_prefix      = azurerm_subnet.app_services[0].address_prefixes[0]
    destination_address_prefix = "*"
    description                = "Allow Redis access from App Services subnet"
  }
  
  # Deny all other inbound
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4000
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
    description                = "Deny all other inbound traffic"
  }
  
  tags = local.common_tags
}

# Associate NSG with Redis subnet
resource "azurerm_subnet_network_security_group_association" "redis" {
  count = local.is_full_deployment ? 1 : 0
  
  subnet_id                 = azurerm_subnet.redis[0].id
  network_security_group_id = azurerm_network_security_group.redis[0].id
}

# NSG for Private Endpoints subnet
resource "azurerm_network_security_group" "private_endpoints" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = "${var.resource_prefix}-nsg-private-endpoints-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  # Allow inbound from App Services subnet
  security_rule {
    name                       = "AllowInboundFromAppServices"
    priority                   = 1000
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = azurerm_subnet.app_services[0].address_prefixes[0]
    destination_address_prefix = "*"
    description                = "Allow inbound from App Services subnet"
  }
  
  # Allow outbound to Azure services
  security_rule {
    name                       = "AllowOutboundToAzureServices"
    priority                   = 1000
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "AzureCloud"
    description                = "Allow outbound to Azure services"
  }
  
  tags = local.common_tags
}

# Associate NSG with Private Endpoints subnet
resource "azurerm_subnet_network_security_group_association" "private_endpoints" {
  count = local.is_full_deployment ? 1 : 0
  
  subnet_id                 = azurerm_subnet.private_endpoints[0].id
  network_security_group_id = azurerm_network_security_group.private_endpoints[0].id
}

