'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const HomeContent = dynamic(() => import('@/components/HomeContent'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
    </div>
  ),
});

export default function Home() {
  return <HomeContent />;
}
