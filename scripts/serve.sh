#!/usr/bin/env bash
# ============================================================
# serve.sh — build, then serve public/ at http://localhost:8080
# Runs scripts/build.js on every start, so the served copy is the current
# source; scripts/check.sh is not part of it.
# ============================================================
set -eu
cd "$(dirname "$0")/.."
node scripts/build.js
echo
echo "serving public/ → http://localhost:8080  (Ctrl-C to stop)"
cd public
exec python3 -m http.server 8080
