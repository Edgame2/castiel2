#!/bin/bash

# Azure Infrastructure Setup Script for Castiel Production
# This script sets up all required Azure resources for production deployment
# 
# Prerequisites:
# - Azure CLI installed and logged in
# - Appropriate permissions to create resources
# - Resource group already created
#
# Usage:
#   ./scripts/setup-azure-infrastructure.sh <environment> <resource-group> <location>
#
# Example:
#   ./scripts/setup-azure-infrastructure.sh prod rg-castiel-prod eastus

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -ne 3 ]; then
    echo -e "${RED}Error: Invalid arguments${NC}"
    echo "Usage: $0 <environment> <resource-group> <location>"
    echo "Example: $0 prod rg-castiel-prod eastus"
    exit 1
fi

ENVIRONMENT=$1
RESOURCE_GROUP=$2
LOCATION=$3

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Castiel Azure Infrastructure Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Environment: $ENVIRONMENT"
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo ""

# Verify Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed${NC}"
    echo "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Verify logged in
if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Azure${NC}"
    echo "Run: az login"
    exit 1
fi

# Verify resource group exists
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${YELLOW}Resource group $RESOURCE_GROUP does not exist. Creating...${NC}"
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
    echo -e "${GREEN}✓ Resource group created${NC}"
fi

# Service Bus Namespace
SERVICE_BUS_NAMESPACE="sb-sync-${ENVIRONMENT}"
echo ""
echo -e "${GREEN}Setting up Azure Service Bus...${NC}"

if az servicebus namespace show --resource-group "$RESOURCE_GROUP" --name "$SERVICE_BUS_NAMESPACE" &> /dev/null; then
    echo -e "${YELLOW}Service Bus namespace $SERVICE_BUS_NAMESPACE already exists${NC}"
else
    echo "Creating Service Bus namespace: $SERVICE_BUS_NAMESPACE"
    az servicebus namespace create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$SERVICE_BUS_NAMESPACE" \
        --location "$LOCATION" \
        --sku Standard
    echo -e "${GREEN}✓ Service Bus namespace created${NC}"
fi

# Service Bus Queues
QUEUES=("sync-inbound-webhook" "sync-inbound-scheduled" "sync-outbound")

for QUEUE_NAME in "${QUEUES[@]}"; do
    if az servicebus queue show --resource-group "$RESOURCE_GROUP" --namespace-name "$SERVICE_BUS_NAMESPACE" --name "$QUEUE_NAME" &> /dev/null; then
        echo -e "${YELLOW}Queue $QUEUE_NAME already exists${NC}"
    else
        echo "Creating queue: $QUEUE_NAME"
        
        # Configure queue settings based on name
        if [ "$QUEUE_NAME" == "sync-outbound" ]; then
            # Enable sessions for outbound queue (per-integration ordering)
            az servicebus queue create \
                --resource-group "$RESOURCE_GROUP" \
                --namespace-name "$SERVICE_BUS_NAMESPACE" \
                --name "$QUEUE_NAME" \
                --enable-session true \
                --max-delivery-count 10 \
                --lock-duration PT5M \
                --default-message-time-to-live P7D \
                --dead-lettering-on-message-expiration true
        else
            # Standard queues for inbound
            az servicebus queue create \
                --resource-group "$RESOURCE_GROUP" \
                --namespace-name "$SERVICE_BUS_NAMESPACE" \
                --name "$QUEUE_NAME" \
                --max-delivery-count 10 \
                --lock-duration PT5M \
                --default-message-time-to-live P7D \
                --dead-lettering-on-message-expiration true
        fi
        echo -e "${GREEN}✓ Queue $QUEUE_NAME created${NC}"
    fi
done

# Get Service Bus connection string
echo ""
echo -e "${GREEN}Retrieving Service Bus connection string...${NC}"
SERVICE_BUS_CONNECTION_STRING=$(az servicebus namespace authorization-rule keys list \
    --resource-group "$RESOURCE_GROUP" \
    --namespace-name "$SERVICE_BUS_NAMESPACE" \
    --name RootManageSharedAccessKey \
    --query primaryConnectionString -o tsv)

if [ -z "$SERVICE_BUS_CONNECTION_STRING" ]; then
    echo -e "${RED}Error: Failed to retrieve Service Bus connection string${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Service Bus connection string retrieved${NC}"

# Event Grid System Topic (for custom events)
EVENT_GRID_TOPIC="evgt-sync-${ENVIRONMENT}"
echo ""
echo -e "${GREEN}Setting up Azure Event Grid...${NC}"

if az eventgrid system-topic show --resource-group "$RESOURCE_GROUP" --name "$EVENT_GRID_TOPIC" &> /dev/null; then
    echo -e "${YELLOW}Event Grid topic $EVENT_GRID_TOPIC already exists${NC}"
else
    echo "Creating Event Grid system topic: $EVENT_GRID_TOPIC"
    # Note: Event Grid system topics require a source resource
    # This is typically created when setting up the first subscription
    echo -e "${YELLOW}Note: Event Grid system topic will be created with first subscription${NC}"
fi

# Event Grid Subscriptions
echo ""
echo "Creating Event Grid subscriptions..."

# Subscription for inbound webhook events
SUBSCRIPTION_INBOUND="evgs-sync-inbound-${ENVIRONMENT}"
echo "Creating subscription: $SUBSCRIPTION_INBOUND"
# Note: Event Grid subscriptions require the topic to exist first
# This would typically be done via Azure Portal or ARM/Bicep templates
echo -e "${YELLOW}Note: Event Grid subscriptions should be configured via ARM/Bicep or Portal${NC}"
echo -e "${YELLOW}      See docs/features/integrations/IMPLEMENTATION_TODO.md for details${NC}"

# Azure Functions App
FUNCTION_APP_NAME="func-sync-${ENVIRONMENT}"
STORAGE_ACCOUNT="stcastiel${ENVIRONMENT}"
echo ""
echo -e "${GREEN}Setting up Azure Functions...${NC}"

# Storage account for Functions
if az storage account show --resource-group "$RESOURCE_GROUP" --name "$STORAGE_ACCOUNT" &> /dev/null; then
    echo -e "${YELLOW}Storage account $STORAGE_ACCOUNT already exists${NC}"
else
    echo "Creating storage account: $STORAGE_ACCOUNT"
    az storage account create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$STORAGE_ACCOUNT" \
        --location "$LOCATION" \
        --sku Standard_LRS
    echo -e "${GREEN}✓ Storage account created${NC}"
fi

# App Service Plan (Premium for Functions)
APP_SERVICE_PLAN="asp-sync-${ENVIRONMENT}"
if az appservice plan show --resource-group "$RESOURCE_GROUP" --name "$APP_SERVICE_PLAN" &> /dev/null; then
    echo -e "${YELLOW}App Service Plan $APP_SERVICE_PLAN already exists${NC}"
else
    echo "Creating App Service Plan (Premium): $APP_SERVICE_PLAN"
    az appservice plan create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$APP_SERVICE_PLAN" \
        --location "$LOCATION" \
        --sku EP1 \
        --is-linux
    echo -e "${GREEN}✓ App Service Plan created${NC}"
fi

# Function App
if az functionapp show --resource-group "$RESOURCE_GROUP" --name "$FUNCTION_APP_NAME" &> /dev/null; then
    echo -e "${YELLOW}Function App $FUNCTION_APP_NAME already exists${NC}"
else
    echo "Creating Function App: $FUNCTION_APP_NAME"
    STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
        --resource-group "$RESOURCE_GROUP" \
        --name "$STORAGE_ACCOUNT" \
        --query connectionString -o tsv)
    
    az functionapp create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$FUNCTION_APP_NAME" \
        --storage-account "$STORAGE_ACCOUNT" \
        --plan "$APP_SERVICE_PLAN" \
        --runtime node \
        --runtime-version 20 \
        --functions-version 4 \
        --os-type Linux
    echo -e "${GREEN}✓ Function App created${NC}"
fi

# Configure Function App settings
echo ""
echo "Configuring Function App settings..."
az functionapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --settings \
        "SERVICEBUS_SYNC_CONNECTION=$SERVICE_BUS_CONNECTION_STRING" \
        "FUNCTIONS_WORKER_RUNTIME=node" \
        "WEBSITE_NODE_DEFAULT_VERSION=~20" \
        "AzureWebJobsFeatureFlags=EnableWorkerIndexing" \
    --output none

echo -e "${GREEN}✓ Function App settings configured${NC}"

# Enable Managed Identity for Function App
echo ""
echo "Enabling Managed Identity for Function App..."
az functionapp identity assign \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --output none

FUNCTION_APP_IDENTITY=$(az functionapp identity show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --query principalId -o tsv)

echo -e "${GREEN}✓ Managed Identity enabled (Principal ID: $FUNCTION_APP_IDENTITY)${NC}"

# Key Vault Access Policy
KEY_VAULT_NAME=$(az keyvault list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv)

if [ -n "$KEY_VAULT_NAME" ] && [ "$KEY_VAULT_NAME" != "null" ]; then
    echo ""
    echo "Configuring Key Vault access policy for Function App..."
    az keyvault set-policy \
        --name "$KEY_VAULT_NAME" \
        --object-id "$FUNCTION_APP_IDENTITY" \
        --secret-permissions get list \
        --output none
    echo -e "${GREEN}✓ Key Vault access policy configured${NC}"
else
    echo -e "${YELLOW}Warning: Key Vault not found. Skipping access policy configuration.${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Infrastructure Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Created Resources:"
echo "  ✓ Service Bus Namespace: $SERVICE_BUS_NAMESPACE"
echo "  ✓ Service Bus Queues:"
for QUEUE_NAME in "${QUEUES[@]}"; do
    echo "    - $QUEUE_NAME"
done
echo "  ✓ Function App: $FUNCTION_APP_NAME"
echo "  ✓ Storage Account: $STORAGE_ACCOUNT"
echo "  ✓ App Service Plan: $APP_SERVICE_PLAN"
echo ""
echo "Next Steps:"
echo "  1. Configure Event Grid subscriptions (see docs/features/integrations/IMPLEMENTATION_TODO.md)"
echo "  2. Deploy Container Apps (see docs/ci-cd/CONTAINER_APPS_DEPLOYMENT.md)"
echo "  3. Set additional environment variables in Container Apps"
echo "  4. Test the infrastructure setup"
echo ""
echo -e "${YELLOW}Note: Azure Functions have been migrated to Container Apps.${NC}"
echo -e "${YELLOW}See docs/migration/MIGRATION_COMPLETE_SUMMARY.md for details.${NC}"
echo ""
echo "Service Bus Connection String:"
echo "  $SERVICE_BUS_CONNECTION_STRING"
echo ""
echo -e "${YELLOW}⚠️  Save the Service Bus connection string securely!${NC}"
echo -e "${YELLOW}⚠️  Add it to your environment variables as: AZURE_SERVICE_BUS_CONNECTION_STRING${NC}"








