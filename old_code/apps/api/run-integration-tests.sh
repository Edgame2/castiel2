#!/bin/bash

# Integration Test Runner Script
# Provides convenient commands for running integration tests

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Integration Test Runner${NC}"
echo -e "${BLUE}================================${NC}\n"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Parse command
COMMAND=${1:-help}

case $COMMAND in
    "all")
        print_info "Running all integration tests..."
        pnpm vitest tests/integration --run
        print_status "All tests completed"
        ;;
    
    "e2e")
        print_info "Running end-to-end tests..."
        pnpm vitest tests/integration/e2e-sync-workflows.test.ts --run
        print_status "E2E tests completed"
        ;;
    
    "performance")
        print_info "Running performance benchmarks..."
        pnpm vitest tests/integration/e2e-sync-workflows.test.ts -t "Performance" --run --reporter=verbose
        print_status "Benchmarks completed"
        ;;
    
    "unit")
        print_info "Running unit tests..."
        pnpm vitest tests/unit --run
        print_status "Unit tests completed"
        ;;
    
    "watch")
        print_info "Starting test watcher..."
        pnpm vitest tests/integration --watch
        ;;
    
    "coverage")
        print_info "Running tests with coverage..."
        pnpm vitest --coverage --run
        print_status "Coverage report generated"
        ;;
    
    "slack-teams")
        print_info "Testing Slack/Teams notifications..."
        pnpm vitest tests/integration/slack-teams-delivery.test.ts --run
        print_status "Notification tests completed"
        ;;
    
    "sync")
        print_info "Testing sync workflows..."
        pnpm vitest tests/integration/e2e-sync-workflows.test.ts -t "Sync" --run
        print_status "Sync tests completed"
        ;;
    
    "error-recovery")
        print_info "Testing error recovery..."
        pnpm vitest tests/integration/e2e-sync-workflows.test.ts -t "Error Recovery" --run
        print_status "Error recovery tests completed"
        ;;
    
    "consistency")
        print_info "Testing data consistency..."
        pnpm vitest tests/integration/e2e-sync-workflows.test.ts -t "Data Consistency" --run
        print_status "Consistency tests completed"
        ;;
    
    "quick")
        print_info "Running quick test suite (fast tests only)..."
        pnpm vitest tests/integration --run --bail=1
        print_status "Quick tests completed"
        ;;
    
    "ci")
        print_info "Running CI test suite..."
        print_info "1. Unit tests"
        pnpm vitest tests/unit --run --reporter=verbose
        print_info "2. Integration tests"
        pnpm vitest tests/integration --run --reporter=verbose
        print_info "3. Coverage report"
        pnpm vitest --coverage --run
        print_status "CI pipeline completed"
        ;;
    
    "help"|*)
        echo "Usage: ./run-integration-tests.sh [command]"
        echo ""
        echo "Commands:"
        echo "  all              - Run all integration tests"
        echo "  e2e              - Run end-to-end workflow tests"
        echo "  performance      - Run performance benchmarks"
        echo "  unit             - Run unit tests"
        echo "  watch            - Run tests in watch mode"
        echo "  coverage         - Run tests with coverage report"
        echo "  slack-teams      - Test Slack/Teams notifications"
        echo "  sync             - Test sync workflows"
        echo "  error-recovery   - Test error handling"
        echo "  consistency      - Test data consistency"
        echo "  quick            - Run fast tests only"
        echo "  ci               - Run full CI test suite"
        echo "  help             - Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./run-integration-tests.sh e2e"
        echo "  ./run-integration-tests.sh performance"
        echo "  ./run-integration-tests.sh watch"
        ;;
esac

echo ""
