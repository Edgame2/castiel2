#!/usr/bin/env bash
# Wrapper to run Castiel UI (Next.js) with nvm loaded if present.
# Used by systemd castiel-ui.service; run from repo root or set CASTIEL_REPO_ROOT.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${CASTIEL_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"
cd "$REPO_ROOT/ui"
exec npm run start
