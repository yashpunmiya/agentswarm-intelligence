# 🧠 AgentSwarm Intelligence Network

Decentralized intelligence marketplace where specialized AI agents sell verified insights using x402 micropayments on Stacks.

## 🎯 What We Built

A 3-layer system demonstrating the future of agent-to-agent commerce:

1. **Orchestrator Platform** — Coordinates intelligence requests across multiple specialist agents
2. **5 Specialist Agents** — Security, Data, Social, Price, and History analyzers, each with x402 pay-per-query endpoints
3. **Consensus Engine** — Calculates multi-agent verification scores, confidence levels, and risk assessments

## 🚀 Quick Start

```bash
# Clone & install
git clone <repo-url>
cd agentswarm-intelligence
npm install

# Start all services (orchestrator + 5 agents + frontend)
npm run dev

# In another terminal — test health
pwsh ./scripts/test-system.ps1      # Windows
# or
bash ./scripts/test-system.sh       # macOS/Linux

# Run a demo analysis
pwsh ./scripts/demo-request.ps1
# or
bash ./scripts/demo-request.sh
```

### Individual services

```bash
# Backend orchestrator (port 3001)
cd backend/orchestrator && npx ts-node src/index.ts

# Agents (ports 3002-3006)
cd backend/agents/security && npx ts-node src/index.ts
cd backend/agents/data     && npx ts-node src/index.ts
cd backend/agents/social   && npx ts-node src/index.ts
cd backend/agents/price    && npx ts-node src/index.ts
cd backend/agents/history  && npx ts-node src/index.ts

# Frontend (port 3000)
cd frontend && npm run dev
```

## 📊 Architecture

```
User Request (via Next.js UI + Stacks Wallet)
          ↓
    Orchestrator (port 3001)
    Broadcasts to 5 agents in parallel
          ↓
  ┌───────┬───────┬────────┬───────┬─────────┐
  │ 🔒    │ 📊    │ 💬     │ 💰    │ 📜      │
  │Secur. │ Data  │Social  │Price  │History  │
  │:3002  │:3003  │:3004   │:3005  │:3006    │
  └───────┴───────┴────────┴───────┴─────────┘
          ↓
    Consensus Calculator
    (variance-based agreement + risk aggregation)
          ↓
    Verified Intelligence Report
    + Payment Distribution via x402
```

### Payment Flow (x402 Protocol)

```
1. Client → POST /analyze → Agent
2. Agent → 402 Payment Required → Client
3. Client signs STX transaction (not broadcast)
4. Client → POST + payment-signature → Agent
5. Agent → Facilitator settles on-chain → Stacks blockchain
6. Agent → 200 + analysis data → Client
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router) · React 19 · Tailwind CSS |
| **Wallet** | @stacks/connect (Hiro Wallet / Leather) |
| **Backend** | Express · TypeScript · Microservices |
| **Payments** | x402-stacks (HTTP 402 protocol) |
| **Blockchain** | Stacks Testnet (Bitcoin L2) |
| **APIs** | Hiro Stacks API · CoinGecko · Gemini AI |
| **Facilitator** | https://facilitator.stacksx402.com |

## 🤖 Agent Specializations

| Agent | Port | Price | Analysis |
|-------|------|-------|----------|
| **SecurityAgent** | 3002 | 0.10 STX | Smart contract vulnerability scanning (reentrancy, unlimited mint, centralized control) |
| **DataAgent** | 3003 | 0.08 STX | On-chain metrics — STX balance, tx count, activity patterns |
| **SocialAgent** | 3004 | 0.05 STX | AI sentiment analysis (Gemini) + scam keyword detection |
| **PriceAgent** | 3005 | 0.15 STX | CoinGecko market data + volatility & pump-and-dump detection |
| **HistoryAgent** | 3006 | 0.08 STX | Wallet age, transaction history, contract deployments, fund flows |

Each agent exposes:
- `GET /health` — liveness probe
- `POST /analyze-free` — development endpoint (no payment)
- `POST /analyze` — production endpoint (protected by x402 `paymentMiddleware`)

## 💡 Key Innovation

**Multi-Agent Verification** — Don't trust a single AI. Get consensus from 5 independent specialist agents, each analyzing a different risk dimension. Variance-based consensus scoring ensures disagreements are surfaced, not hidden.

**Pay-per-insight with x402** — Every agent endpoint is an HTTP 402 paywall. The orchestrator pays agents with STX micropayments, and users pay the orchestrator. No subscriptions, no API keys — just HTTP.

## 🏆 Why This Wins

1. **Novel** — First intelligence verification marketplace on Stacks
2. **Practical** — Solves a real problem: how to trust AI agents' claims
3. **Technical** — Multi-agent consensus + x402 micropayment integration
4. **Scalable** — More agents = better verification quality
5. **Complete** — Full working system: UI, wallet, 5 agents, orchestrator, consensus engine

## 📁 Project Structure

```
agentswarm-intelligence/
├── frontend/                    # Next.js 15 web application
│   ├── app/                     # App Router pages
│   └── components/              # React components
│       ├── HomeContent.tsx      # Main app (wallet, tabs, hero)
│       ├── IntelligenceRequest  # Analysis form
│       ├── ConsensusReport      # Multi-agent results
│       ├── AgentList            # Agent network dashboard
│       └── NetworkStatus        # Testnet indicator
├── backend/
│   ├── orchestrator/            # Request coordinator (port 3001)
│   │   └── src/
│   │       ├── routes/          # orchestrator, agents, payments
│   │       ├── services/        # agentRegistry, consensusCalculator
│   │       └── types/           # TypeScript interfaces
│   └── agents/
│       ├── security/            # Smart contract scanner
│       ├── data/                # On-chain metrics
│       ├── social/              # Sentiment analysis
│       ├── price/               # Market analysis
│       └── history/             # Wallet history
└── scripts/                     # Test & demo scripts
```

## ⚙️ Environment Variables

Each agent has its own `.env` file with:

```bash
PORT=300x
AGENT_NAME=...
STACKS_API_URL=https://api.hiro.so
HIRO_API_KEY=<key>
FACILITATOR_URL=https://facilitator.stacksx402.com
BASE_PRICE_MICROSTX=<price>
SERVER_ADDRESS=<stx-address>
```

The orchestrator additionally has agent endpoint URLs and platform configuration.

## 📹 Demo Video

[Link to demo video]

## 🌐 Live Demo

[Link to deployed frontend]

## 👥 Team

Solo developer submission

Built for **x402 Stacks Challenge 2026**
