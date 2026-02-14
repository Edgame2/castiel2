#!/usr/bin/env bash
# Copy deployment/env.revimize-dev.example into .env (repo root).
# Add JWT_SECRET and other secrets to .env after running.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLE="$REPO_ROOT/deployment/env.revimize-dev.example"
ENV_FILE="$REPO_ROOT/.env"
if [[ ! -f "$EXAMPLE" ]]; then
  echo "Not found: $EXAMPLE" >&2
  exit 1
fi
if [[ -f "$ENV_FILE" ]]; then
  echo ".env already exists at $ENV_FILE"
  echo "To merge revimize-dev vars, append manually: $EXAMPLE"
  exit 0
fi
cp "$EXAMPLE" "$ENV_FILE"
echo "Created $ENV_FILE from deployment/env.revimize-dev.example"
echo "Add JWT_SECRET and other secrets to .env before starting the stack."
