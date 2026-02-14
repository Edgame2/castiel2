#!/usr/bin/env bash
# Run this ON THE SERVER (e.g. 51.83.73.52) where nginx and the app run.
# Prerequisites: nginx installed, revimize-dev.conf already in sites-enabled, UI on :3000, gateway on :3001.
# Gets Let's Encrypt certs and configures nginx for HTTPS.
set -e
if ! command -v certbot &>/dev/null; then
  echo "Installing certbot (Ubuntu/Debian)..."
  sudo apt-get update -qq && sudo apt-get install -y certbot python3-certbot-nginx
fi
echo "Getting TLS certificates for api.revimize-dev.com and www.revimize-dev.com..."
sudo certbot --nginx -d api.revimize-dev.com -d www.revimize-dev.com --non-interactive --agree-tos --register-unsafely-without-email
echo "Done. Test: https://www.revimize-dev.com and https://api.revimize-dev.com"
