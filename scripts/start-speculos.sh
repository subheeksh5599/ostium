#!/usr/bin/env bash
set -euo pipefail

SPECULOS_DIR="/tmp/speculos"
SOL_APP_URL="https://github.com/LedgerHQ/app-solana/releases/download/v1.5.0/app.elf"

echo ""
echo "  Starting Ledger Speculos Emulator"
echo "  =================================="
echo ""

if [ ! -d "$SPECULOS_DIR" ]; then
  git clone --depth 1 https://github.com/LedgerHQ/speculos "$SPECULOS_DIR"
fi

SOL_ELF="$SPECULOS_DIR/apps/solana.elf"
if [ ! -f "$SOL_ELF" ]; then
  echo "  Downloading Solana app..."
  mkdir -p "$(dirname "$SOL_ELF")"
  curl -L "$SOL_APP_URL" -o "$SOL_ELF" 2>/dev/null || {
    echo "  Could not download Solana app. Using Bitcoin app as fallback."
    SOL_ELF=""
  }
fi

SEED="$(grep -o '"[^"]*"' /dev/urandom 2>/dev/null | tr -d '"' | fold -w 32 | head -24 | tr '\n' ' ' || echo "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art")"

echo "  Model: Nano S+"
echo "  API:   http://127.0.0.1:5000"
echo "  VNC:   port 41000"
echo "  Seed:  (generated)"
echo ""

export PYTHONPATH="$SPECULOS_DIR"

if command -v python3 &>/dev/null; then
  python3 "$SPECULOS_DIR/speculos.py" \
    --model nanosp \
    --display headless \
    --vnc-port 41000 \
    --api-port 5000 \
    --apdu-port 40000 \
    --seed "$SEED" \
    ${SOL_ELF:+-l "Solana:$SOL_ELF"}
else
  echo "  Python3 not found. Install with: pip install speculos"
  echo ""
  echo "  Then run:"
  echo "    speculos --model nanosp --display headless --api-port 5000 \$APP_ELF"
fi
