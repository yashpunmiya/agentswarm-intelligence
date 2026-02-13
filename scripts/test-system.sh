#!/usr/bin/env bash
# test-system.sh — Health-check all services
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 AgentSwarm Intelligence Network — System Test"
echo "================================================"

check() {
  local name=$1 url=$2
  if curl -sf "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name is healthy"
  else
    echo -e "${RED}✗${NC} $name is unreachable"
  fi
}

check "Orchestrator" "http://localhost:3001/health"
check "SecurityAgent" "http://localhost:3002/health"
check "DataAgent"     "http://localhost:3003/health"
check "SocialAgent"   "http://localhost:3004/health"
check "PriceAgent"    "http://localhost:3005/health"
check "HistoryAgent"  "http://localhost:3006/health"

echo ""
echo "🔍 Checking agent registry..."
curl -s http://localhost:3001/api/agents | python3 -m json.tool 2>/dev/null || echo "(python3 not available for pretty-print)"

echo ""
echo "✅ System test complete"
