#!/usr/bin/env bash
# demo-request.sh — Run a demo analysis request against the orchestrator
set -euo pipefail

ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:3001}"

echo "🧠 AgentSwarm Intelligence — Demo Request"
echo "=========================================="

# Demo: analyze a known Stacks contract
PAYLOAD='{
  "query": "Is this token safe to invest in?",
  "tokenAddress": "SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9",
  "budget": 500000,
  "requesterAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "priority": "high"
}'

echo ""
echo "📡 Sending request to orchestrator..."
echo "   Payload: $PAYLOAD"
echo ""

RESPONSE=$(curl -s -X POST \
  "${ORCHESTRATOR_URL}/api/orchestrator/request" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "📊 Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""
echo "✅ Demo complete"
