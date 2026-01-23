#!/bin/bash
# Setup Test Environment Script
# Sets up the test environment and verifies configuration

set -e

echo "🔧 Setting up Test Environment"
echo "================================"

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Step 1: Check Node version
echo ""
echo "📦 Checking Node version..."
NODE_VERSION=$(node -v)
echo "   Node: $NODE_VERSION"

# Step 2: Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm is not installed. Please install it first."
  exit 1
fi

PNPM_VERSION=$(pnpm -v)
echo "   pnpm: $PNPM_VERSION"

# Step 3: Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo ""
  echo "📥 Installing dependencies..."
  pnpm install
else
  echo ""
  echo "✅ Dependencies already installed"
fi

# Step 4: Run configuration checker
echo ""
echo "✅ Running configuration checker..."
cd apps/api

# Check if tsx is available
if ! pnpm list tsx &> /dev/null; then
  echo "⚠️  tsx not found, installing..."
  pnpm add -D tsx
fi

# Run the configuration checker
if [ -f "tests/utils/test-config-checker.ts" ]; then
  pnpm tsx tests/utils/test-config-checker.ts || echo "⚠️  Configuration check had issues"
else
  echo "⚠️  Configuration checker not found, skipping..."
fi

# Step 5: Run auto-fixer
echo ""
echo "🔧 Running auto-fixer..."
if [ -f "tests/utils/test-auto-fixer.ts" ]; then
  pnpm tsx tests/utils/test-auto-fixer.ts || echo "⚠️  Auto-fix had issues"
else
  echo "⚠️  Auto-fixer not found, skipping..."
fi

# Step 6: Verify setup
echo ""
echo "🔍 Verifying test setup..."

# Check if test files exist
if [ -d "tests" ]; then
  echo "   ✅ Test directory exists"
else
  echo "   ❌ Test directory not found"
  exit 1
fi

# Check if test utilities exist
if [ -f "tests/utils/test-utils.ts" ]; then
  echo "   ✅ Test utilities exist"
else
  echo "   ⚠️  Test utilities not found"
fi

# Check if test data directory exists
if [ -d "data/prompts" ]; then
  echo "   ✅ Test data directory exists"
else
  echo "   ⚠️  Test data directory not found (will be created on first run)"
fi

echo ""
echo "✅ Test environment setup complete!"
echo ""
echo "Next steps:"
echo "  1. Review any warnings above"
echo "  2. Run tests: pnpm test"
echo "  3. Run complete suite: pnpm test:complete"



