'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, TrendingUp, Users, DollarSign, Clock, Loader2, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface Agent {
  id: string;
  name: string;
  type: string;
  reputation: number;
  basePrice: number;
  totalTasks: number;
  successRate: number;
  averageResponseTime: number;
}

const agentMeta: Record<string, { icon: typeof Shield; color: string; desc: string }> = {
  security: { icon: Shield, color: '#5546FF', desc: 'Contract source parsing, 12 vulnerability checks, SIP-010 compliance audit' },
  data: { icon: TrendingUp, color: '#22C55E', desc: 'On-chain tx patterns, unique addresses, velocity tracking, fee analysis' },
  social: { icon: Users, color: '#A855F7', desc: 'AI sentiment analysis via Gemini, narrative detection, risk scoring' },
  price: { icon: DollarSign, color: '#EAB308', desc: 'CoinGecko market data, 7d/30d trends, ATH tracking, volume analysis' },
  history: { icon: Clock, color: '#06B6D4', desc: 'Creator wallet timeline, deployment history, fund flow analysis' },
};

export default function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentHealth, setAgentHealth] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL}/api/agents`, { timeout: 5000 });
      setAgents(response.data.agents || []);
      const healthChecks = (response.data.agents || []).map(async (agent: Agent) => {
        try {
          await axios.get(`${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL}/api/agents/${agent.id}/health`, { timeout: 3000 });
          return { [agent.id]: true };
        } catch { return { [agent.id]: false }; }
      });
      const results = await Promise.all(healthChecks);
      setAgentHealth(results.reduce((acc, r) => ({ ...acc, ...r }), {}));
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--stacks-purple)]" />
        <span className="ml-3 text-sm text-[var(--muted)]">Loading agents...</span>
      </div>
    );
  }

  const onlineCount = Object.values(agentHealth).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Agent Network</h2>
          <p className="text-xs text-[var(--muted)]">
            <span className="text-[var(--success)] font-medium">{onlineCount}</span> of {agents.length} agents online — each paid via x402 per query
          </p>
        </div>
        <button onClick={fetchAgents}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition-all hover:text-white hover:border-[var(--stacks-purple)]/30">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent, i) => {
          const meta = agentMeta[agent.type] || agentMeta.security;
          const Icon = meta.icon;
          const online = agentHealth[agent.id] !== false;

          return (
            <motion.div key={agent.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="card-glow p-5 transition-all">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: meta.color + '15' }}>
                    <Icon className="h-5 w-5" style={{ color: meta.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                    <p className="text-[10px] text-[var(--muted)] max-w-[180px] leading-relaxed">{meta.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {online ? (
                    <><Wifi className="h-3.5 w-3.5 text-[var(--success)]" /><span className="text-[10px] text-[var(--success)] font-medium">Live</span></>
                  ) : (
                    <><WifiOff className="h-3.5 w-3.5 text-[var(--muted)]" /><span className="text-[10px] text-[var(--muted)]">Off</span></>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Reputation', value: `${agent.reputation}%` },
                  { label: 'x402 Price', value: `${(agent.basePrice / 1000000).toFixed(2)} STX` },
                  { label: 'Tasks Done', value: agent.totalTasks.toString() },
                  { label: 'Avg Time', value: `${(agent.averageResponseTime / 1000).toFixed(1)}s` },
                ].map((stat, si) => (
                  <div key={si} className="rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2">
                    <div className="text-[10px] text-[var(--muted)]">{stat.label}</div>
                    <div className="text-sm font-bold text-white">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--muted)]">
                <Zap className="h-3 w-3 text-[var(--stacks-orange)]" />
                <span>x402 HTTP 402 Payment Protocol</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
