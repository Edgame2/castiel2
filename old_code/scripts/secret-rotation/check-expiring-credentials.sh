#!/bin/bash
#
# Check Expiring Credentials Script
#
# Checks for credentials expiring within specified days and sends notifications.
#
# Usage:
#   ./check-expiring-credentials.sh --days 14 [--environment production] [--notify]
#
# Options:
#   --days          Number of days to check ahead (default: 14)
#   --environment   Target environment (optional, checks all if not specified)
#   --notify        Send notifications for expiring credentials
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DAYS=14
ENVIRONMENT=""
NOTIFY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --days)
      DAYS="$2"
      shift 2
      ;;
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --notify)
      NOTIFY=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}Checking Expiring Credentials${NC}"
echo "Days ahead: $DAYS"
echo "Environment: ${ENVIRONMENT:-all}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
  echo -e "${RED}Error: Azure CLI is not installed${NC}"
  exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
  echo -e "${RED}Error: Not logged in to Azure. Run 'az login'${NC}"
  exit 1
fi

# Function to check secret age
check_secret_age() {
  local vault_name=$1
  local secret_name=$2
  local environment=$3
  
  # Get secret metadata
  local updated_date=$(az keyvault secret show \
    --vault-name "$vault_name" \
    --name "$secret_name" \
    --query "properties.updated" \
    --output tsv 2>/dev/null || echo "")
  
  if [[ -z "$updated_date" ]]; then
    return 1
  fi
  
  # Calculate days since update
  local updated_timestamp=$(date -d "$updated_date" +%s)
  local current_timestamp=$(date +%s)
  local days_old=$(( (current_timestamp - updated_timestamp) / 86400 ))
  local days_until_expiry=$(( 90 - days_old ))
  
  if [[ $days_until_expiry -le $DAYS ]] && [[ $days_until_expiry -gt 0 ]]; then
    echo -e "${YELLOW}⚠ $secret_name (${environment})${NC}"
    echo "    Days until expiry: $days_until_expiry"
    echo "    Last rotated: $days_old days ago"
    echo "    Updated: $updated_date"
    echo ""
    return 0
  elif [[ $days_until_expiry -le 0 ]]; then
    echo -e "${RED}✗ $secret_name (${environment}) - EXPIRED${NC}"
    echo "    Days overdue: $(( -days_until_expiry ))"
    echo "    Last rotated: $days_old days ago"
    echo "    Updated: $updated_date"
    echo ""
    return 2
  fi
  
  return 1
}

# List of secrets to check
declare -a SECRETS=(
  "JWT_ACCESS_SECRET"
  "JWT_REFRESH_SECRET"
  "COSMOS_DB_PRIMARY_KEY"
  "COSMOS_DB_SECONDARY_KEY"
  "REDIS_PRIMARY_CONNECTION_STRING"
  "REDIS_SECONDARY_CONNECTION_STRING"
  "AZURE_AD_B2C_CLIENT_SECRET"
  "SENDGRID_API_KEY"
  "GOOGLE_CLIENT_SECRET"
  "GITHUB_CLIENT_SECRET"
  "MICROSOFT_CLIENT_SECRET"
)

# Environments to check
declare -a ENVIRONMENTS=("development" "staging" "production")
if [[ -n "$ENVIRONMENT" ]]; then
  ENVIRONMENTS=("$ENVIRONMENT")
fi

# Check secrets
expiring_count=0
expired_count=0

for env in "${ENVIRONMENTS[@]}"; do
  vault_name="kv-castiel-${env}"
  
  echo -e "${GREEN}Checking ${env} environment...${NC}"
  
  for secret in "${SECRETS[@]}"; do
    result=$(check_secret_age "$vault_name" "$secret" "$env" || echo $?)
    if [[ "$result" == "0" ]]; then
      ((expiring_count++))
    elif [[ "$result" == "2" ]]; then
      ((expired_count++))
    fi
  done
done

# Summary
echo ""
echo -e "${GREEN}Summary${NC}"
echo "Expiring within $DAYS days: $expiring_count"
echo "Expired: $expired_count"

if [[ $expired_count -gt 0 ]]; then
  echo -e "${RED}⚠ Action required: $expired_count secrets have expired${NC}"
  exit 1
elif [[ $expiring_count -gt 0 ]]; then
  echo -e "${YELLOW}⚠ Warning: $expiring_count secrets expiring soon${NC}"
  exit 0
else
  echo -e "${GREEN}✓ All secrets are within rotation schedule${NC}"
  exit 0
fi
