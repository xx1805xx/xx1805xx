#!/bin/bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd -- "$(dirname -- "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Per questo prototipo serve Python 3.9 o successivo. Installalo da https://www.python.org/downloads/macos/ e riapri Aegis."
  read -r -p "Premi Invio per chiudere. "
  exit 1
fi
if ! python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 9) else 1)'; then
  echo "Serve Python 3.9 o successivo: https://www.python.org/downloads/macos/"
  read -r -p "Premi Invio per chiudere. "
  exit 1
fi
echo "Avvio Aegis locale. Nessuna installazione automatica, nessun sudo."
exec python3 native/agent.py
