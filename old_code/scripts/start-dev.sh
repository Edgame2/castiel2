#!/usr/bin/env bash

################################################################################
# Castiel Application Startup Script
# Starts all services with proper dependency checks and health monitoring
#
# NOTE: With Turborepo, you can simply run `pnpm dev` from the root.
# This script provides additional features like health checks and logging.
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="/tmp/castiel"
MAX_WAIT=30 # seconds to wait for service startup

# Service ports
API_PORT=3001
WEB_PORT=3000

# Create log directory
mkdir -p "$LOG_DIR"

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if a port is in use
is_port_in_use() {
    lsof -ti:$1 >/dev/null 2>&1
}

# Wait for a service to be healthy
wait_for_service() {
    local name=$1
    local port=$2
    local endpoint=$3
    local max_wait=$4
    
    log_info "Waiting for $name to be ready..."
    
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        if curl -s -f --max-time 2 "http://localhost:$port$endpoint" >/dev/null 2>&1; then
            log_success "$name is ready on port $port"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    log_error "$name failed to start within $max_wait seconds"
    return 1
}

# Kill process on port
kill_port() {
    local port=$1
    if is_port_in_use $port; then
        log_warning "Killing existing process on port $port"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Check if Redis is accessible
check_redis() {
    log_info "Checking Redis connection..."
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Redis is accessible"
        return 0
    else
        log_warning "Redis is not accessible (services will use degraded mode)"
        return 0 # Don't fail - services can run without Redis
    fi
}

# Check Node version
check_node() {
    log_info "Checking Node.js version..."
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -ge 20 ]; then
        log_success "Node.js version: $(node -v)"
        return 0
    else
        log_error "Node.js version must be >= 20.0.0 (current: $(node -v))"
        return 1
    fi
}

# Check pnpm
check_pnpm() {
    log_info "Checking pnpm..."
    if command -v pnpm >/dev/null 2>&1; then
        log_success "pnpm version: $(pnpm -v)"
        return 0
    else
        log_error "pnpm is not installed. Install with: npm install -g pnpm"
        return 1
    fi
}

start_api() {
    log_info "Starting API service..."
    
    kill_port $API_PORT
    
    cd "$PROJECT_ROOT/apps/api"
    pnpm dev > "$LOG_DIR/api.log" 2>&1 &
    local pid=$!
    echo $pid > "$LOG_DIR/api.pid"
    
    # Give it a moment to start
    sleep 3
    
    # Check if process is still running
    if ! ps -p $pid > /dev/null 2>&1; then
        log_error "API failed to start. Check logs: tail -f $LOG_DIR/api.log"
        return 1
    fi
    
    if wait_for_service "API" $API_PORT "/health" 15; then
        log_success "API started (PID: $pid)"
    else
        log_warning "API process running but health check failed (PID: $pid)"
        log_warning "Check logs: tail -f $LOG_DIR/api.log"
    fi
    
    return 0
}

start_web() {
    log_info "Starting Web service..."
    
    kill_port $WEB_PORT

    # Optionally clear Next.js cache to avoid stale warnings
    if [ -d ".next" ]; then
        log_info "Clearing Next.js cache (.next)"
        rm -rf .next || true
    fi
    
    cd "$PROJECT_ROOT/apps/web"
    pnpm dev > "$LOG_DIR/web.log" 2>&1 &
    local pid=$!
    echo $pid > "$LOG_DIR/web.pid"
    
    # Frontend takes longer to start
    sleep 5
    
    # Check if process is still running
    if ! ps -p $pid > /dev/null 2>&1; then
        log_error "Web failed to start. Check logs: tail -f $LOG_DIR/web.log"
        return 1
    fi
    
    # Next.js doesn't have a health endpoint, just check if port is responding
    log_info "Waiting for Web to be ready..."
    local elapsed=0
    while [ $elapsed -lt 30 ]; do
        if curl -s --max-time 2 http://localhost:$WEB_PORT >/dev/null 2>&1; then
            log_success "Web started (PID: $pid)"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    log_warning "Web process running but not responding yet (PID: $pid)"
    log_warning "Check logs: tail -f $LOG_DIR/web.log"
    return 0
}

################################################################################
# Main Execution
################################################################################

show_status() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                  Castiel Services Status                  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if is_port_in_use $API_PORT; then
        echo -e "  ${GREEN}✓${NC} API          → http://localhost:$API_PORT"
    else
        echo -e "  ${RED}✗${NC} API          → Not running"
    fi
    
    if is_port_in_use $WEB_PORT; then
        echo -e "  ${GREEN}✓${NC} Web          → http://localhost:$WEB_PORT"
    else
        echo -e "  ${RED}✗${NC} Web          → Not running"
    fi
    
    echo ""
    echo -e "${BLUE}Logs:${NC}"
    echo -e "  • API:    tail -f $LOG_DIR/api.log"
    echo -e "  • Web:    tail -f $LOG_DIR/web.log"
    echo ""
}

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            Castiel Application Startup Script             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}TIP: You can also use 'pnpm dev' for Turborepo-based startup${NC}"
    echo ""
    
    # Pre-flight checks
    log_info "Running pre-flight checks..."
    check_node || exit 1
    check_pnpm || exit 1
    check_redis
    
    echo ""
    log_info "Starting services..."
    echo ""
    
    # Start services in order
    start_api || log_warning "API startup had issues"
    echo ""
    
    start_web || log_warning "Web startup had issues"
    echo ""
    
    # Show final status
    show_status
    
    log_success "Startup complete!"
    echo ""
    echo -e "${GREEN}→ Open http://localhost:3000 in your browser${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""
    
    # Keep script running and handle Ctrl+C
    trap 'echo ""; log_info "Shutting down services..."; pkill -P $$; exit 0' INT TERM
    
    # Keep script alive
    while true; do
        sleep 1
    done
}

# Run main function
main "$@"
