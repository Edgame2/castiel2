#!/usr/bin/env bash
set -euo pipefail

# Untracks files that should be ignored without deleting local copies.
# Dry-run by default; pass --yes to actually untrack.
# Optional: --include-logs to also untrack *.log files

confirm=no
include_logs=no
while [ $# -gt 0 ]; do
  case "$1" in
    --yes)
      confirm=yes
      ;;
    --include-logs)
      include_logs=yes
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
  shift
done

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

# Build a candidate list by checking tracked files that are actually ignored
tmp_all=$(mktemp)
tmp_list=$(mktemp)
trap 'rm -f "$tmp_all" "$tmp_list"' EXIT

git ls-files > "$tmp_all"

# Optionally limit by common bulky patterns to speed up; still verified via check-ignore
grep -E '(^|/)\.env($|\.|local$)|(^|/)local\.settings\.json$|(^|/)dist/|(^|/)build/|(^|/)\.next/|(^|/)\.turbo/|(^|/)coverage/|(^|/)\.nyc_output/' "$tmp_all" > "$tmp_list.tmp" 2>/dev/null || true

# If include_logs, add *.log candidates
if [ "$include_logs" = yes ]; then
  grep -E '\\.(log)$' "$tmp_all" >> "$tmp_list.tmp" 2>/dev/null || true
fi

# If the above produced nothing, fall back to checking all tracked files (slower on big repos)
if [ ! -s "$tmp_list.tmp" ]; then
  cp "$tmp_all" "$tmp_list.tmp"
fi

# Keep only those that Git considers ignored (respects .gitignore negations)
> "$tmp_list"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  if printf "%s\n" "$f" | git check-ignore -q --stdin; then
    printf "%s\n" "$f" >> "$tmp_list"
  fi
done < "$tmp_list.tmp"

if [ ! -s "$tmp_list" ]; then
  echo "No tracked files are ignored by .gitignore. Nothing to do."
  exit 0
fi

echo "The following tracked files will be untracked (kept locally):"
cat "$tmp_list"
echo

if [ "$confirm" != yes ]; then
  echo "Dry run. Re-run with --yes to untrack."
  exit 0
fi

echo "Untracking files from Git index (local copies preserved)..."
while IFS= read -r f; do
  [ -n "$f" ] || continue
  git rm -r --cached -- "$f" >/dev/null || true
done < "$tmp_list"

echo "Done. You can now commit these index changes."
echo "Suggested: git commit -m 'chore(git): stop tracking local env/settings/build artifacts'"
