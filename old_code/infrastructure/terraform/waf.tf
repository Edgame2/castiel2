# Web Application Firewall (WAF) for Container Apps
# Note: WAF can be configured for Container Apps via Azure Front Door or Application Gateway
# This configuration is for production only and uses Container App endpoints

# Application Gateway (required for WAF)
resource "azurerm_public_ip" "app_gateway" {
  count = local.is_full_deployment && var.environment == "production" ? 1 : 0
  
  name                = "${var.resource_prefix}-agw-pip-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  
  tags = local.common_tags
}

# Subnet for Application Gateway
resource "azurerm_subnet" "app_gateway" {
  count = local.is_full_deployment && var.environment == "production" ? 1 : 0
  
  name                 = "app-gateway-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main[0].name
  address_prefixes     = ["10.0.4.0/24"]
}

# Application Gateway with WAF
resource "azurerm_application_gateway" "main" {
  count = local.is_full_deployment && var.environment == "production" ? 1 : 0
  
  name                = "${var.resource_prefix}-agw-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = 2
  }
  
  gateway_ip_configuration {
    name      = "app-gateway-ip-config"
    subnet_id = azurerm_subnet.app_gateway[0].id
  }
  
  frontend_port {
    name = "http-port"
    port = 80
  }
  
  frontend_port {
    name = "https-port"
    port = 443
  }
  
  frontend_ip_configuration {
    name                 = "app-gateway-frontend-ip"
    public_ip_address_id  = azurerm_public_ip.app_gateway[0].id
  }
  
  backend_address_pool {
    name = "container-app-backend-pool"
    fqdns = length(azurerm_container_app.api) > 0 && length(azurerm_container_app.api[0].ingress) > 0 ? [azurerm_container_app.api[0].ingress[0].fqdn] : []
  }
  
  backend_http_settings {
    name                  = "container-app-http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 443
    protocol              = "Https"
    request_timeout       = 20
    probe_name            = "container-app-health-probe"
    pick_host_name_from_backend_address = true
  }
  
  # HTTP listener (for initial setup - can be upgraded to HTTPS later)
  http_listener {
    name                           = "http-listener"
    frontend_ip_configuration_name = "app-gateway-frontend-ip"
    frontend_port_name             = "http-port"
    protocol                       = "Http"
  }
  
  # HTTPS listener (commented out until SSL certificate is configured)
  # http_listener {
  #   name                           = "https-listener"
  #   frontend_ip_configuration_name = "app-gateway-frontend-ip"
  #   frontend_port_name             = "https-port"
  #   protocol                       = "Https"
  #   ssl_certificate_name           = "app-gateway-ssl-cert"
  # }
  
  request_routing_rule {
    name                       = "container-app-routing-rule"
    rule_type                  = "Basic"
    http_listener_name         = "http-listener"
    backend_address_pool_name   = "container-app-backend-pool"
    backend_http_settings_name = "container-app-http-settings"
    priority                   = 100
  }
  
  probe {
    name                = "container-app-health-probe"
    host                = length(azurerm_container_app.api) > 0 && length(azurerm_container_app.api[0].ingress) > 0 ? azurerm_container_app.api[0].ingress[0].fqdn : ""
    interval            = 30
    timeout             = 30
    unhealthy_threshold = 3
    protocol            = "Https"
    path                = "/health"
    match {
      status_code = ["200-399"]
    }
  }
  
  # WAF Configuration
  waf_configuration {
    enabled                  = true
    firewall_mode            = "Prevention"  # Use Detection for testing, Prevention for production
    rule_set_type            = "OWASP"
    rule_set_version         = "3.2"
    max_request_body_size_kb = 128
    file_upload_limit_mb     = 100
    
    # Disabled rules (if needed for specific use cases)
    disabled_rule_group {
      rule_group_name = "REQUEST-942-APPLICATION-ATTACK-SQLI"
      rules           = []  # Add specific rule IDs to disable if needed
    }
  }
  
  # SSL Certificate
  # Note: SSL certificate configuration is commented out until proper certificate is available
  # For production, configure SSL certificate via Key Vault or manual upload:
  # Option 1: Key Vault integration (recommended)
  # identity {
  #   type = "UserAssigned"
  #   identity_ids = [azurerm_user_assigned_identity.app_gateway.id]
  # }
  # ssl_certificate {
  #   name                = "app-gateway-ssl-cert"
  #   key_vault_secret_id = azurerm_key_vault_certificate.main.secret_id
  # }
  #
  # Option 2: Manual certificate upload
  # ssl_certificate {
  #   name     = "app-gateway-ssl-cert"
  #   data     = filebase64("${path.module}/certs/wildcard.castiel.com.pfx")
  #   password = var.ssl_certificate_password
  # }
  
  tags = local.common_tags
  
  depends_on = [
    azurerm_public_ip.app_gateway,
    azurerm_subnet.app_gateway
  ]
}

# DDoS Protection Plan (Standard tier)
resource "azurerm_network_ddos_protection_plan" "main" {
  count = local.is_full_deployment && var.environment == "production" ? 1 : 0
  
  name                = "${var.resource_prefix}-ddos-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  tags = local.common_tags
}

# Associate DDoS Protection with VNet
# Note: DDoS protection association is done via the VNet resource, not a separate resource
# Update network.tf to include ddos_protection_plan_id in azurerm_virtual_network.main
# For now, DDoS protection plan is created but not associated (can be done via Portal or VNet update)

