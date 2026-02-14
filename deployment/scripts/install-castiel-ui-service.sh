#!/usr/bin/env bash
# Install castiel-ui systemd service so the UI runs across reboots.
# Run on the server (from repo root): sudo ./deployment/scripts/install-castiel-ui-service.sh
# Adjust paths in deployment/systemd/castiel-ui.service if repo is not at /home/ubuntu/dev/castiel2
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVICE_FILE="$REPO_ROOT/deployment/systemd/castiel-ui.service"
if [[ ! -f "$SERVICE_FILE" ]]; then
  echo "Not found: $SERVICE_FILE" >&2
  exit 1
fi
sudo cp "$SERVICE_FILE" /etc/systemd/system/castiel-ui.service
sudo systemctl daemon-reload
sudo systemctl enable castiel-ui.service
sudo systemctl start castiel-ui.service
echo "castiel-ui service installed and started. Status: sudo systemctl status castiel-ui"
