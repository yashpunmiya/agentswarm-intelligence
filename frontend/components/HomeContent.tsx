'use client';

import { useState, useEffect } from 'react';
import { AppConfig, UserSession } from '@stacks/connect';
import IntelligenceRequest from '@/components/IntelligenceRequest';
import ConsensusReport from '@/components/ConsensusReport';
import AgentList from '@/components/AgentList';
import NetworkStatus from '@/components/NetworkStatus';
import { Shield, Brain, Wallet, Activity, ArrowRight, Zap, Layers, Lock, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export default function HomeContent() {
  const [userData, setUserData] = useState<any>(null);
  const [consensusResult, setConsensusResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'analyze' | 'agents'>('analyze');

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const connectWallet = async () => {
    try {
      const { authenticate } = await import('@stacks/connect');
      authenticate({
        appDetails: {
          name: 'AgentSwarm Intelligence',
          icon: window.location.origin + '/favicon.ico'
        },
        onFinish: () => { window.location.reload(); },
        userSession
      });
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setUserData(null);
    setConsensusResult(null);
  };

  const getUserAddress = () => userData?.profile?.stxAddress?.testnet || '';

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--stacks-purple)]/10 border border-[var(--stacks-purple)]/20">
                <Layers className="h-5 w-5 text-[var(--stacks-purple)]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">AgentSwarm</h1>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--stacks-purple)]">Intelligence Network</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NetworkStatus />
              {!userData ? (
                <button onClick={connectWallet}
                  className="flex items-center gap-2 rounded-xl bg-[var(--stacks-purple)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--stacks-purple)]/20">
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5">
                    <span className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
                    <span className="text-xs font-mono text-[var(--muted)]">{getUserAddress().slice(0, 6)}...{getUserAddress().slice(-4)}</span>
                  </div>
                  <button onClick={disconnectWallet}
                    className="rounded-xl px-3 py-1.5 text-xs text-[var(--muted)] transition-all hover:bg-[var(--surface)] hover:text-white border border-transparent hover:border-[var(--border)]">
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero - not connected */}
      {!userData && (
        <div className="relative overflow-hidden grid-bg">
          {/* Gradient orbs */}
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-[var(--stacks-purple)]/8 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full bg-[var(--stacks-orange)]/5 blur-[100px] pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
              className="mx-auto max-w-3xl text-center">

              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--stacks-purple)]/20 bg-[var(--stacks-purple)]/5 px-4 py-2 text-sm text-[var(--stacks-purple)]">
                <Zap className="h-3.5 w-3.5" />
                <span className="font-medium">x402 Micropayments on Stacks</span>
              </div>

              <h2 className="mb-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl leading-[1.1]">
                Multi-Agent<br />
                <span className="gradient-text">Intelligence Network</span>
              </h2>

              <p className="mb-12 text-lg text-[var(--muted)] max-w-xl mx-auto leading-relaxed">
                5 specialist AI agents analyze tokens independently. Each agent is paid via x402 micropayments.
                Consensus emerges from economic incentives, not trust.
              </p>

              <motion.button onClick={connectWallet} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-3 rounded-2xl bg-[var(--stacks-purple)] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[var(--stacks-purple)]/25 transition-all hover:shadow-xl hover:shadow-[var(--stacks-purple)]/30">
                <Wallet className="h-5 w-5" />
                Connect Stacks Wallet
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.button>

              {/* Feature cards */}
              <div className="mx-auto mt-24 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { icon: Shield, title: 'Security Audit', desc: 'Contract source parsing, 12 vulnerability checks, SIP-010 compliance', color: '#5546FF' },
                  { icon: Eye, title: 'On-Chain Intel', desc: 'Real-time tx patterns, holder analysis, fee metrics, velocity tracking', color: '#22C55E' },
                  { icon: Lock, title: 'x402 Payments', desc: 'Each agent paid per-query via HTTP 402 protocol — verifiable on-chain', color: '#FC6432' }
                ].map((f, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                    className="card-glow p-6 text-left group cursor-default">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: f.color + '15' }}>
                      <f.icon className="h-5 w-5" style={{ color: f.color }} />
                    </div>
                    <h3 className="mb-2 text-sm font-bold text-white">{f.title}</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* How it works */}
              <div className="mt-20">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] mb-8">How It Works</h3>
                <div className="flex items-center justify-center gap-4 text-xs text-[var(--muted)]">
                  {['Submit Query', 'x402 Payment', '5 Agents Analyze', 'Consensus Score'].map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--stacks-purple)]/10 text-[10px] font-bold text-[var(--stacks-purple)]">{i + 1}</span>
                        <span className="font-medium text-white">{step}</span>
                      </div>
                      {i < 3 && <ArrowRight className="h-3 w-3 text-[var(--border)]" />}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Dashboard - connected */}
      {userData && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Tab bar */}
          <div className="mb-8 flex items-center gap-1 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-1.5">
            {([
              { key: 'analyze' as const, label: 'Analyze Token', icon: Brain },
              { key: 'agents' as const, label: 'Agent Network', icon: Activity },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-[var(--stacks-purple)] text-white shadow-lg shadow-[var(--stacks-purple)]/20'
                    : 'text-[var(--muted)] hover:text-white hover:bg-white/[0.03]'
                }`}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'analyze' && (
            <div className="space-y-6">
              <IntelligenceRequest userAddress={getUserAddress()} onResult={setConsensusResult} />
              {consensusResult && <ConsensusReport result={consensusResult} />}
            </div>
          )}

          {activeTab === 'agents' && <AgentList />}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border)] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-[var(--stacks-purple)]" />
              <span className="font-medium">AgentSwarm Intelligence</span>
            </div>
            <div className="flex items-center gap-6">
              <span>Built on <span className="text-[var(--stacks-purple)] font-medium">Stacks</span></span>
              <span>Powered by <span className="text-[var(--stacks-orange)] font-medium">x402</span></span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
