#!/usr/bin/env bash
# Start Castiel backend (API gateway, auth, etc.) with Docker Compose.
# Run from repo root on the server. Requires .env with JWT_SECRET, etc.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"
docker compose up -d
echo "Backend started. Check: docker compose ps"
