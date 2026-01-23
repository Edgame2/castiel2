# Resource Group
resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.common_tags
}

# Virtual Network (excluded for hybrid-dev)
resource "azurerm_virtual_network" "main" {
  count = local.is_full_deployment ? 1 : 0
  
  name                = local.vnet_name
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
  
  # DDoS Protection (production only)
  # Note: Uncomment when DDoS protection plan is ready
  # ddos_protection_plan {
  #   id     = azurerm_network_ddos_protection_plan.main[0].id
  #   enable = true
  # }
}

# Subnet for App Services (excluded for hybrid-dev)
resource "azurerm_subnet" "app_services" {
  count = local.is_full_deployment ? 1 : 0
  
  name                 = "app-services-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main[0].name
  address_prefixes     = ["10.0.1.0/24"]

  delegation {
    name = "app-service-delegation"
    service_delegation {
      name = "Microsoft.Web/serverFarms"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action",
      ]
    }
  }
  
  # Service endpoints for Key Vault access
  service_endpoints = ["Microsoft.KeyVault"]
}

# Subnet for Redis (excluded for hybrid-dev)
resource "azurerm_subnet" "redis" {
  count = local.is_full_deployment ? 1 : 0
  
  name                 = "redis-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main[0].name
  address_prefixes     = ["10.0.2.0/24"]
}

# Subnet for private endpoints (excluded for hybrid-dev)
resource "azurerm_subnet" "private_endpoints" {
  count = local.is_full_deployment ? 1 : 0
  
  name                 = "private-endpoints-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main[0].name
  address_prefixes     = ["10.0.3.0/24"]
  
  private_endpoint_network_policies = "Disabled"  # Updated from deprecated private_endpoint_network_policies_enabled
}
