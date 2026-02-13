'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, TrendingUp, Users, DollarSign, Clock, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';

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
  security: { icon: Shield, color: 'text-blue-400', desc: 'Smart contract vulnerability analysis' },
  data: { icon: TrendingUp, color: 'text-emerald-400', desc: 'On-chain metrics & holder analysis' },
  social: { icon: Users, color: 'text-purple-400', desc: 'Sentiment analysis & scam detection' },
  price: { icon: DollarSign, color: 'text-amber-400', desc: 'Market data & volatility analysis' },
  history: { icon: Clock, color: 'text-cyan-400', desc: 'Creator wallet history & reputation' },
};

export default function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentHealth, setAgentHealth] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL}/api/agents`,
        { timeout: 5000 }
      );
      setAgents(response.data.agents || []);

      // Check health of each agent
      const healthChecks = (response.data.agents || []).map(async (agent: Agent) => {
        try {
          await axios.get(
            `${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL}/api/agents/${agent.id}/health`,
            { timeout: 3000 }
          );
          return { [agent.id]: true };
        } catch {
          return { [agent.id]: false };
        }
      });

      const results = await Promise.all(healthChecks);
      const healthMap = results.reduce((acc, r) => ({ ...acc, ...r }), {});
      setAgentHealth(healthMap);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
        <span className="ml-3 text-sm text-[var(--muted)]">Loading agents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Agent Network</h2>
          <p className="text-xs text-[var(--muted)]">{agents.length} specialist agents available</p>
        </div>
        <button
          onClick={fetchAgents}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] transition-smooth hover:text-white"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => {
          const meta = agentMeta[agent.type] || agentMeta.security;
          const IconComponent = meta.icon;
          const isOnline = agentHealth[agent.id] !== false;

          return (
            <div key={agent.id} className="glow-border rounded-xl bg-[var(--surface)] p-5 transition-smooth">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--background)]`}>
                    <IconComponent className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                    <p className="text-[10px] text-[var(--muted)]">{meta.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <Wifi className="h-3.5 w-3.5 text-[var(--success)]" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5 text-[var(--muted)]" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-[var(--background)] px-3 py-2">
                  <div className="text-[10px] text-[var(--muted)]">Reputation</div>
                  <div className="text-sm font-bold text-white">{agent.reputation}%</div>
                </div>
                <div className="rounded-md bg-[var(--background)] px-3 py-2">
                  <div className="text-[10px] text-[var(--muted)]">Price</div>
                  <div className="text-sm font-bold text-white">{(agent.basePrice / 1000000).toFixed(2)} STX</div>
                </div>
                <div className="rounded-md bg-[var(--background)] px-3 py-2">
                  <div className="text-[10px] text-[var(--muted)]">Tasks</div>
                  <div className="text-sm font-bold text-white">{agent.totalTasks}</div>
                </div>
                <div className="rounded-md bg-[var(--background)] px-3 py-2">
                  <div className="text-[10px] text-[var(--muted)]">Avg Time</div>
                  <div className="text-sm font-bold text-white">{(agent.averageResponseTime / 1000).toFixed(1)}s</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
