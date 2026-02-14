#!/usr/bin/env bash
# Run on the server to verify nginx and ports for revimize-dev.
set -e
echo "=== Nginx ==="
systemctl is-active nginx 2>/dev/null || echo "nginx not running"
sudo nginx -t 2>&1 || true
echo ""
echo "=== Ports 80/443 ==="
sudo ss -tlnp | grep -E ':80 |:443 ' || echo "Nothing listening on 80/443"
echo ""
echo "=== Sites enabled ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "No sites-enabled"
echo ""
echo "=== UFW (if used) ==="
sudo ufw status 2>/dev/null | head -5 || true
