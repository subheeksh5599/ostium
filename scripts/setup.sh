#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "  delegate — Hardware-Signed Agent Mandates"
echo "  =========================================="
echo ""

MANDATE_DIR="$HOME/.mandate"
mkdir -p "$MANDATE_DIR"

AGENT_ID="YieldScout"
NETWORK="solana:devnet"
AGENT_PUBKEY="demo:yieldscout:$(date +%s | sha256sum | head -c 16)"
DERIVATION_PATH="44'/501'/0'/0'"

echo '{"agentId":"'$AGENT_ID'","agentPubkey":"'$AGENT_PUBKEY'","network":"'$NETWORK'","derivationPath":"'$DERIVATION_PATH'"}' > "$MANDATE_DIR/agent.json"
echo "  Agent initialized: $AGENT_ID"
echo "  Network: $NETWORK"
echo ""

npx tsx src/cli.ts create \
  --agent-id "$AGENT_ID" \
  --tokens "devUSDC:0.5:5,devSOL:0.1:1" \
  --protocols "jupiter,orca" \
  --per-tx-limit 1 \
  --daily-limit 5 \
  --duration 24 \
  --network "$NETWORK" \
  --path "$DERIVATION_PATH" \
  --sign

echo ""
echo "  Mandate created and signed."
echo "  Run:  npx tsx src/cli.ts demo"
echo ""
