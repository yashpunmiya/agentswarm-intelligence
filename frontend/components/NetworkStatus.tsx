'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function NetworkStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [blockHeight, setBlockHeight] = useState<number | null>(null);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      await axios.get(`${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL}/health`, { timeout: 3000 });
      setStatus('online');
      // Fetch block height
      try {
        const res = await axios.get('https://api.hiro.so/extended/v1/block?limit=1', { timeout: 5000 });
        setBlockHeight(res.data?.results?.[0]?.height || null);
      } catch {}
    } catch {
      setStatus('offline');
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5">
      <span className={`h-2 w-2 rounded-full ${
        status === 'online' ? 'bg-[var(--success)] shadow-sm shadow-[var(--success)]/50' :
        status === 'offline' ? 'bg-[var(--critical)]' :
        'bg-amber-400 animate-pulse'
      }`} />
      <span className="text-[10px] font-medium text-[var(--muted)]">
        {status === 'online' ? 'Testnet' : status === 'offline' ? 'Offline' : '...'}
      </span>
      {blockHeight && status === 'online' && (
        <span className="text-[10px] font-mono text-[var(--muted)]">#{blockHeight.toLocaleString()}</span>
      )}
    </div>
  );
}
