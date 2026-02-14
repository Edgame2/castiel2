#!/usr/bin/env bash
# Copy deployment/nginx/revimize-dev.conf into nginx sites-enabled.
# Run from repo root; requires sudo if target is under /etc/nginx.
# Usage: ./deployment/scripts/install-nginx-revimize-dev.sh [TARGET_DIR]
# Default TARGET_DIR: /etc/nginx/sites-enabled (requires sudo)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONF_SRC="$REPO_ROOT/deployment/nginx/revimize-dev.conf"
TARGET_DIR="${1:-/etc/nginx/sites-enabled}"
CONF_DEST="$TARGET_DIR/revimize-dev.conf"
if [[ ! -f "$CONF_SRC" ]]; then
  echo "Not found: $CONF_SRC" >&2
  exit 1
fi
if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Target dir does not exist: $TARGET_DIR" >&2
  echo "Create it or pass a different path (e.g. . for current dir)." >&2
  exit 1
fi
cp "$CONF_SRC" "$CONF_DEST"
# Remove default site so revimize-dev server_name blocks handle the traffic (not "Welcome to nginx!")
if [[ -d "$TARGET_DIR" ]] && [[ -f "$TARGET_DIR/default" ]]; then
  sudo rm -f "$TARGET_DIR/default"
  echo "Removed $TARGET_DIR/default so www.revimize-dev.com and api.revimize-dev.com are served by revimize-dev.conf"
fi
echo "Installed $CONF_SRC -> $CONF_DEST"
echo "Reload nginx: sudo nginx -t && sudo systemctl reload nginx"
