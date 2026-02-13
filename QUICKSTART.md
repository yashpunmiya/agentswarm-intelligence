# 🚀 AgentSwarm — Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- npm or pnpm
- 6 terminal windows (or use `npm run dev` to start all at once)

## Step 1: Install Dependencies

```powershell
# From project root
cd c:\Users\yyash\Coding\x402\agentswarm-intelligence
npm install
```

This installs all dependencies for orchestrator, agents, and frontend.

## Step 2: Start Backend Services

### Option A: Start All Services at Once (Recommended)

```powershell
npm run dev
```

This starts:
- Orchestrator on port 3001
- SecurityAgent on port 3002
- DataAgent on port 3003
- SocialAgent on port 3004
- PriceAgent on port 3005
- HistoryAgent on port 3006
- Frontend on port 3000

### Option B: Start Services Individually

Open 6 terminal windows:

```powershell
# Terminal 1 - Orchestrator
cd backend/orchestrator
npx ts-node src/index.ts

# Terminal 2 - SecurityAgent
cd backend/agents/security
npx ts-node src/index.ts

# Terminal 3 - DataAgent
cd backend/agents/data
npx ts-node src/index.ts

# Terminal 4 - SocialAgent
cd backend/agents/social
npx ts-node src/index.ts

# Terminal 5 - PriceAgent
cd backend/agents/price
npx ts-node src/index.ts

# Terminal 6 - HistoryAgent
cd backend/agents/history
npx ts-node src/index.ts
```

## Step 3: Start Frontend

```powershell
# Terminal 7
cd frontend
npm run dev
```

Frontend will be available at http://localhost:3000

## Step 4: Verify Health

In a new terminal:

```powershell
# Windows
pwsh .\scripts\test-system.ps1

# Expected output:
# ✓ Orchestrator — healthy
# ✓ SecurityAgent — healthy
# ✓ DataAgent — healthy
# ✓ SocialAgent — healthy
# ✓ PriceAgent — healthy
# ✓ HistoryAgent — healthy
```

## Step 5: Test with Demo Request

```powershell
# Windows
pwsh .\scripts\demo-request.ps1

# This will:
# 1. Send a request to orchestrator
# 2. Orchestrator broadcasts to all 5 agents
# 3. Agents analyze in parallel
# 4. Orchestrator calculates consensus
# 5. Returns verified intelligence report
```

## Step 6: Test via Web UI

1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Use Hiro Wallet or Leather wallet extension
4. Switch to testnet in wallet
5. Enter a query like "Is this token safe?"
6. Optionally add a Stacks contract address
7. Click "Run Multi-Agent Analysis"
8. View consensus results from all 5 agents

## Troubleshooting

### Port Already in Use

```powershell
# Kill process on port 3001 (or any other port)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

### Agents Not Responding

Check that all 5 agents and orchestrator are running:

```powershell
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
curl http://localhost:3006/health
```

### Frontend Build Issues

```powershell
cd frontend
rm -r .next node_modules
npm install
npm run dev
```

### API Keys Missing

Make sure all `.env` files exist:
- `backend/orchestrator/.env`
- `backend/agents/security/.env`
- `backend/agents/data/.env`
- `backend/agents/social/.env`
- `backend/agents/price/.env`
- `backend/agents/history/.env`
- `frontend/.env.local`

Use `.env.example` as a template if needed.

## Expected Console Output

### Orchestrator
```
🎯 Orchestrator running on port 3001
```

### Each Agent
```
🔒 SecurityAgent running on port 3002
📊 DataAgent running on port 3003
💬 SocialAgent running on port 3004
💰 PriceAgent running on port 3005
📜 HistoryAgent running on port 3006
```

### Frontend
```
▲ Next.js 16.1.6 (Turbopack)
- Local:        http://localhost:3000
- Environments: .env.local
```

## Testing Flow

1. **Health Check**: `pwsh .\scripts\test-system.ps1`
2. **API Test**: `pwsh .\scripts\demo-request.ps1`
3. **UI Test**: Visit http://localhost:3000 and connect wallet
4. **End-to-End**: Submit query via UI, verify consensus in response

## API Endpoints

| Service | Port | Health | Free Analysis | Paid Analysis |
|---------|------|--------|---------------|---------------|
| Orchestrator | 3001 | GET /health | POST /api/orchestrator/request | - |
| SecurityAgent | 3002 | GET /health | POST /analyze-free | POST /analyze |
| DataAgent | 3003 | GET /health | POST /analyze-free | POST /analyze |
| SocialAgent | 3004 | GET /health | POST /analyze-free | POST /analyze |
| PriceAgent | 3005 | GET /health | POST /analyze-free | POST /analyze |
| HistoryAgent | 3006 | GET /health | POST /analyze-free | POST /analyze |

## Next Steps

- Deploy backend to Render/Railway
- Deploy frontend to Vercel
- Update `.env` with production URLs
- Set `NODE_ENV=production` to enable x402 paid endpoints
- Register on x402scan for discoverability
