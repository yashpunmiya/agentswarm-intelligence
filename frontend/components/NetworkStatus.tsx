'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function NetworkStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      await axios.get(`${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL}/health`, { timeout: 3000 });
      setStatus('online');
    } catch {
      setStatus('offline');
    }
  };

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] text-[var(--muted)]">
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'online' ? 'bg-emerald-400' :
        status === 'offline' ? 'bg-red-400' :
        'bg-amber-400 animate-pulse'
      }`} />
      {status === 'online' ? 'Testnet' : status === 'offline' ? 'Offline' : '...'}
    </div>
  );
}
