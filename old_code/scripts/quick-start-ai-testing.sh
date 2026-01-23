#!/bin/bash

# AI Features Quick Start Script
# This script helps you get started testing AI features quickly

set -e

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                   AI Features - Quick Start Setup                         ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if API is running
echo "1️⃣  Checking if API server is running..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API server is running${NC}"
else
  echo -e "${YELLOW}⚠️  API server is not running${NC}"
  echo "   Start it with: pnpm --filter @castiel/api dev"
  echo ""
  read -p "   Press Enter to continue anyway, or Ctrl+C to exit..."
fi
echo ""

# Check database
echo "2️⃣  Checking database containers..."
if pnpm tsx scripts/init-cosmos-db.ts 2>&1 | grep -q "✨ Cosmos DB initialization complete"; then
  echo -e "${GREEN}✅ Database containers initialized${NC}"
else
  echo -e "${RED}❌ Database initialization failed${NC}"
  echo "   Check your Cosmos DB credentials in apps/api/.env"
  exit 1
fi
echo ""

# Get admin token
echo "3️⃣  Getting admin JWT token..."
echo "   Default credentials: admin@castiel.dev / admin123"
echo ""
read -p "   Enter admin email (or press Enter for default): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@castiel.dev}

read -sp "   Enter admin password (or press Enter for default): " ADMIN_PASSWORD
echo ""
ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}

echo "   Attempting login..."
ADMIN_TOKEN=$(./scripts/get-admin-token.sh "$ADMIN_EMAIL" "$ADMIN_PASSWORD" 2>/dev/null | grep -A1 "Access Token" | tail -1 | xargs)

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" == "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" ]; then
  echo -e "${RED}❌ Failed to get admin token${NC}"
  echo "   Please ensure:"
  echo "   - API server is running"
  echo "   - Admin user exists with correct credentials"
  echo "   - Try manual login: ./scripts/get-admin-token.sh"
  exit 1
fi

echo -e "${GREEN}✅ Admin token obtained${NC}"
export ADMIN_JWT_TOKEN="$ADMIN_TOKEN"
echo ""

# Check Azure Key Vault
echo "4️⃣  Checking Azure Key Vault configuration..."
KEY_VAULT_URL=$(grep KEY_VAULT_URL apps/api/.env | cut -d'=' -f2)
if [ -n "$KEY_VAULT_URL" ]; then
  echo -e "${GREEN}✅ Key Vault URL configured: $KEY_VAULT_URL${NC}"
  
  AZURE_CLIENT_ID=$(grep AZURE_CLIENT_ID apps/api/.env | cut -d'=' -f2)
  if [ -n "$AZURE_CLIENT_ID" ]; then
    echo -e "${GREEN}✅ Service principal configured${NC}"
  else
    echo -e "${YELLOW}⚠️  Service principal not configured${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Key Vault URL not configured (will use environment variables)${NC}"
fi
echo ""

# Check Azure OpenAI credentials
echo "5️⃣  Checking Azure OpenAI credentials..."
AZURE_OPENAI_KEY=$(grep AZURE_OPENAI_GPT_51_CHAT apps/api/.env | cut -d'=' -f2)
if [ -n "$AZURE_OPENAI_KEY" ]; then
  echo -e "${GREEN}✅ Azure OpenAI key configured${NC}"
else
  echo -e "${RED}❌ Azure OpenAI key not configured${NC}"
  echo "   Set AZURE_OPENAI_GPT_51_CHAT in apps/api/.env"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                           Setup Complete!                                  ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Your admin token has been exported as: ADMIN_JWT_TOKEN"
echo ""
echo "🧪 Next Steps - Choose one:"
echo ""
echo "   Option A - Run automated tests:"
echo "   ---------------------------------"
echo "   pnpm tsx scripts/test-ai-features.ts"
echo ""
echo "   Option B - Manual testing with curl:"
echo "   -------------------------------------"
echo "   1. Open: docs/guides/AI_FEATURES_TESTING_GUIDE.md"
echo "   2. Copy curl commands and replace YOUR_ADMIN_JWT_TOKEN with:"
echo "      $ADMIN_TOKEN"
echo ""
echo "   Option C - Test via Frontend UI:"
echo "   ---------------------------------"
echo "   1. Start frontend: pnpm --filter @castiel/web dev"
echo "   2. Login as admin"
echo "   3. Navigate to: http://localhost:3000/admin/ai-settings"
echo ""
echo "📚 Documentation:"
echo "   • AI_FEATURES_REVIEW_SUMMARY.md - Complete review"
echo "   • docs/guides/AI_FEATURES_TESTING_GUIDE.md - Testing guide"
echo ""
echo "🆘 Troubleshooting:"
echo "   • Container not found → Run: pnpm tsx scripts/init-cosmos-db.ts"
echo "   • Key Vault auth failed → Grant service principal permissions"
echo "   • Unauthorized (401) → Get fresh token: ./scripts/get-admin-token.sh"
echo ""
echo "✨ Everything is ready to test AI features!"
echo ""
