'use client';

import { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, AlertTriangle, Coins, Shield, TrendingUp, Users, DollarSign, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  userAddress: string;
  onResult: (result: any) => void;
}

const agents = [
  { name: 'SecurityAgent', icon: Shield, color: '#5546FF', desc: 'Auditing contract...' },
  { name: 'DataAgent', icon: TrendingUp, color: '#22C55E', desc: 'Analyzing on-chain data...' },
  { name: 'SocialAgent', icon: Users, color: '#A855F7', desc: 'Running sentiment AI...' },
  { name: 'PriceAgent', icon: DollarSign, color: '#EAB308', desc: 'Fetching market data...' },
  { name: 'HistoryAgent', icon: Clock, color: '#06B6D4', desc: 'Scanning creator wallet...' },
];

const exampleTokens = [
  { label: 'DBIT', addr: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.brc20-dbit' },
  { label: 'sBTC', addr: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token' },
];

export default function IntelligenceRequest({ userAddress, onResult }: Props) {
  const [query, setQuery] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState(500000);
  const [elapsed, setElapsed] = useState(0);

  const submitRequest = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setElapsed(0);

    const timer = setInterval(() => setElapsed(p => p + 1), 1000);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL}/api/orchestrator/request`,
        {
          query: query.trim(),
          tokenAddress: tokenAddress.trim() || undefined,
          budget,
          requesterAddress: userAddress,
          priority: 'high'
        },
        { timeout: 120000 }
      );
      onResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  return (
    <div className="card-glow p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--stacks-purple)]/10 border border-[var(--stacks-purple)]/20">
          <Search className="h-5 w-5 text-[var(--stacks-purple)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Intelligence Analysis</h2>
          <p className="text-xs text-[var(--muted)]">Submit a query to 5 specialist agents via x402</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Agent progress */}
            <div className="rounded-2xl bg-[var(--background)] border border-[var(--border)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-[var(--stacks-orange)]" />
                  <span className="font-semibold text-white">Dispatching to 5 Agents</span>
                </div>
                <span className="text-xs text-[var(--muted)] font-mono">{elapsed}s</span>
              </div>

              <div className="space-y-2">
                {agents.map((ag, i) => {
                  const Icon = ag.icon;
                  const isActive = elapsed >= i * 1.5;
                  const isDone = elapsed >= i * 1.5 + 8;
                  return (
                    <motion.div key={ag.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: isActive ? 1 : 0.3, x: 0 }} transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                      style={{ background: isActive && !isDone ? ag.color + '08' : 'transparent', borderLeft: isActive && !isDone ? `2px solid ${ag.color}` : '2px solid transparent' }}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ag.color + '15' }}>
                        <Icon className="h-4 w-4" style={{ color: ag.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-white">{ag.name}</div>
                        <div className="text-[10px] text-[var(--muted)]">{isActive ? ag.desc : 'Waiting...'}</div>
                      </div>
                      {isDone ? (
                        <span className="text-[10px] text-[var(--success)] font-medium">Done</span>
                      ) : isActive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: ag.color }} />
                      ) : (
                        <span className="text-[10px] text-[var(--muted)]">Queued</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: 'var(--stacks-gradient)' }}
                  initial={{ width: '0%' }} animate={{ width: `${Math.min(elapsed * 3, 95)}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="mt-2 text-[10px] text-[var(--muted)] text-center">
                Paying agents via x402 micropayments on Stacks testnet...
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Analysis Query</label>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && submitRequest()}
                placeholder="e.g., Is this token safe to invest in?"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-white placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--stacks-purple)] focus:ring-1 focus:ring-[var(--stacks-purple)]/20" />
            </div>

            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
                <span>Token / Contract Address</span>
                <span className="text-[var(--muted)] text-[10px]">optional</span>
              </label>
              <input type="text" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="SP1ABC...contract-name or 0x... tx hash"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-white placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--stacks-purple)] focus:ring-1 focus:ring-[var(--stacks-purple)]/20 font-mono" />
              <div className="mt-2 flex gap-2">
                {exampleTokens.map(t => (
                  <button key={t.label} onClick={() => { setTokenAddress(t.addr); if (!query) setQuery(`Is ${t.label} safe?`); }}
                    className="rounded-lg bg-[var(--background)] border border-[var(--border)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] hover:text-white hover:border-[var(--stacks-purple)]/30 transition-all">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Budget (microSTX)</label>
              <div className="flex items-center gap-2">
                {[250000, 500000, 1000000].map(amount => (
                  <button key={amount} onClick={() => setBudget(amount)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                      budget === amount
                        ? 'bg-[var(--stacks-purple)] text-white shadow-lg shadow-[var(--stacks-purple)]/20'
                        : 'bg-[var(--background)] text-[var(--muted)] hover:text-white border border-[var(--border)] hover:border-[var(--stacks-purple)]/30'
                    }`}>
                    <Coins className="h-3 w-3" />
                    {(amount / 1000000).toFixed(2)} STX
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-[var(--critical)]/10 border border-[var(--critical)]/20 px-4 py-3 text-sm text-[var(--critical)]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            <motion.button onClick={submitRequest} disabled={loading || !query.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--stacks-purple)] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--stacks-purple)]/20 transition-all hover:shadow-xl hover:shadow-[var(--stacks-purple)]/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
              <Search className="h-4 w-4" />
              Run Multi-Agent Analysis ({(budget / 1000000).toFixed(2)} STX)
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
