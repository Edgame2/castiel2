#!/bin/bash
# Fix file watcher limit for development
# This script increases the system limit for file watchers to prevent ENOSPC errors

echo "🔧 Fixing file watcher limit..."

CURRENT_LIMIT=$(cat /proc/sys/fs/inotify/max_user_watches)
echo "Current limit: $CURRENT_LIMIT"

if [ "$CURRENT_LIMIT" -lt 524288 ]; then
  echo "Increasing limit to 524288..."
  
  # Try temporary increase (requires sudo, resets on reboot)
  if echo 524288 | sudo tee /proc/sys/fs/inotify/max_user_watches > /dev/null 2>&1; then
    NEW_LIMIT=$(cat /proc/sys/fs/inotify/max_user_watches)
    echo "✅ Temporary limit increased to: $NEW_LIMIT"
    echo ""
    echo "⚠️  This is temporary and will reset on reboot."
    echo "For a permanent fix, run:"
    echo "  echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf"
    echo "  sudo sysctl -p"
  else
    echo "❌ Failed to increase limit. You may need to run with sudo:"
    echo "  sudo bash fix-file-watchers.sh"
    exit 1
  fi
else
  echo "✅ Limit is already sufficient: $CURRENT_LIMIT"
fi





