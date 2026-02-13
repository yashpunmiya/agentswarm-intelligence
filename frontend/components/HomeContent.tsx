'use client';

import { useState, useEffect } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import IntelligenceRequest from '@/components/IntelligenceRequest';
import ConsensusReport from '@/components/ConsensusReport';
import AgentList from '@/components/AgentList';
import NetworkStatus from '@/components/NetworkStatus';
import { Shield, Brain, Wallet, Activity, ArrowRight, Zap } from 'lucide-react';

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

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'AgentSwarm Intelligence',
        icon: window.location.origin + '/favicon.ico'
      },
      onFinish: () => {
        const data = userSession.loadUserData();
        setUserData(data);
      },
      userSession
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setUserData(null);
    setConsensusResult(null);
  };

  const getUserAddress = () => {
    if (!userData) return '';
    return userData.profile?.stxAddress?.testnet || '';
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                <Brain className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">AgentSwarm</h1>
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Intelligence Network</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NetworkStatus />
              {!userData ? (
                <button
                  onClick={connectWallet}
                  className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-smooth hover:bg-[var(--accent-hover)]"
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)]">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                    {getUserAddress().slice(0, 6)}...{getUserAddress().slice(-4)}
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="rounded-lg px-3 py-1.5 text-xs text-[var(--muted)] transition-smooth hover:bg-[var(--surface)] hover:text-white"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero section - shown when not connected */}
      {!userData && (
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent)]/5 to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-1.5 text-sm text-[var(--accent)]">
                <Zap className="h-3.5 w-3.5" />
                Powered by x402 Micropayments on Stacks
              </div>
              <h2 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Multi-Agent Intelligence
                <br />
                <span className="gradient-text">Verification Network</span>
              </h2>
              <p className="mb-10 text-lg text-[var(--muted)]">
                Don&apos;t trust a single AI. Get verified consensus from 5 specialist agents,
                each paid via x402 micropayments on Stacks blockchain.
              </p>

              <button
                onClick={connectWallet}
                className="group inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-base font-medium text-white transition-smooth hover:bg-[var(--accent-hover)]"
              >
                <Wallet className="h-5 w-5" />
                Connect Stacks Wallet
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Feature cards */}
              <div className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { icon: Shield, title: 'Security Analysis', desc: 'Smart contract vulnerability scanning' },
                  { icon: Activity, title: 'On-Chain Data', desc: 'Real-time blockchain metrics & patterns' },
                  { icon: Brain, title: 'AI Consensus', desc: '5 agents vote, truth emerges' }
                ].map((feature, idx) => (
                  <div key={idx} className="glow-border rounded-xl bg-[var(--surface)] p-6 text-left transition-smooth">
                    <feature.icon className="mb-3 h-6 w-6 text-[var(--accent)]" />
                    <h3 className="mb-1 text-sm font-semibold text-white">{feature.title}</h3>
                    <p className="text-xs text-[var(--muted)]">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content - shown when connected */}
      {userData && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Tab navigation */}
          <div className="mb-8 flex items-center gap-1 rounded-lg bg-[var(--surface)] p-1">
            {([
              { key: 'analyze' as const, label: 'Analyze', icon: Brain },
              { key: 'agents' as const, label: 'Agents', icon: Activity },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-smooth ${
                  activeTab === tab.key
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--muted)] hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'analyze' && (
            <div className="space-y-6">
              <IntelligenceRequest
                userAddress={getUserAddress()}
                onResult={setConsensusResult}
              />
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
            <span>AgentSwarm Intelligence Network</span>
            <div className="flex items-center gap-4">
              <span>Built on Stacks</span>
              <span>x402 Protocol</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
