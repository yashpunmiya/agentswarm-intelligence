'use client';

import { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, AlertTriangle, Coins } from 'lucide-react';

interface Props {
  userAddress: string;
  onResult: (result: any) => void;
}

export default function IntelligenceRequest({ userAddress, onResult }: Props) {
  const [query, setQuery] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState(500000);

  const submitRequest = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

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
        { timeout: 60000 }
      );

      onResult(response.data);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glow-border rounded-xl bg-[var(--surface)] p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10">
          <Search className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Intelligence Analysis</h2>
          <p className="text-xs text-[var(--muted)]">Submit a query to 5 specialist agents</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
            Analysis Query
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && submitRequest()}
            placeholder="e.g., Is this token safe to invest in?"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-white placeholder-[var(--muted)] outline-none transition-smooth focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
            Token / Contract Address <span className="text-[var(--muted)]/60">(optional)</span>
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="SP1ABC...contract-name"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-white placeholder-[var(--muted)] outline-none transition-smooth focus:border-[var(--accent)] font-mono"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
            Budget (microSTX)
          </label>
          <div className="flex items-center gap-3">
            {[250000, 500000, 1000000].map(amount => (
              <button
                key={amount}
                onClick={() => setBudget(amount)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-smooth ${
                  budget === amount
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--background)] text-[var(--muted)] hover:text-white border border-[var(--border)]'
                }`}
              >
                <Coins className="mr-1 inline h-3 w-3" />
                {(amount / 1000000).toFixed(2)} STX
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 px-4 py-3 text-sm text-[var(--danger)]">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={submitRequest}
          disabled={loading || !query.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition-smooth hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Querying {5} Agents...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Run Multi-Agent Analysis ({(budget / 1000000).toFixed(2)} STX)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
