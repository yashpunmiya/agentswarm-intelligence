'use client';

import { Shield, TrendingUp, Users, DollarSign, Clock, CheckCircle, AlertTriangle, XCircle, ChevronDown, ExternalLink, Zap, Activity, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  result: any;
}

const riskConfig: Record<string, { color: string; bg: string; label: string }> = {
  LOW: { color: '#22C55E', bg: 'rgba(34,197,94,0.08)', label: 'Low Risk' },
  MEDIUM: { color: '#EAB308', bg: 'rgba(234,179,8,0.08)', label: 'Medium Risk' },
  HIGH: { color: '#F97316', bg: 'rgba(249,115,22,0.08)', label: 'High Risk' },
  CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', label: 'Critical Risk' },
};

const agentStyle: Record<string, { icon: any; color: string; bg: string }> = {
  SecurityAgent: { icon: Shield, color: '#5546FF', bg: 'rgba(85,70,255,0.1)' },
  DataAgent: { icon: TrendingUp, color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  SocialAgent: { icon: Users, color: '#A855F7', bg: 'rgba(168,85,247,0.1)' },
  PriceAgent: { icon: DollarSign, color: '#EAB308', bg: 'rgba(234,179,8,0.1)' },
  HistoryAgent: { icon: Clock, color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
};

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  const col = score >= 75 ? '#22C55E' : score >= 55 ? '#EAB308' : score >= 35 ? '#F97316' : '#EF4444';
  const glow = score >= 75 ? 'score-ring-low' : score >= 55 ? 'score-ring-medium' : score >= 35 ? 'score-ring-high' : 'score-ring-critical';
  return (
    <div className={`relative ${glow}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: col }}>{score}</span>
        <span className="text-[10px] text-[var(--muted)]">/ 100</span>
      </div>
    </div>
  );
}

function decodePayment(res: any): any {
  if (res.metadata?.payment) return res.metadata.payment;
  const b64 = res.metadata?.paymentResponse;
  if (!b64) return null;
  try {
    const d = JSON.parse(atob(b64));
    return { success: d.success, payer: d.payer, txHash: d.transaction, network: d.network,
      explorerUrl: `https://explorer.hiro.so/txid/${d.transaction}?chain=testnet` };
  } catch { return null; }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium text-white max-w-[60%] text-right break-all">{value}</span>
    </div>
  );
}

function AgentDetails({ name, d }: { name: string; d: any }) {
  if (!d) return null;

  if (name === 'SecurityAgent') {
    return (<>
      {d.contractMeta && (
        <Section title="Contract Metadata">
          <div className="rounded-lg bg-[var(--background)] p-3 space-y-0.5">
            <Row label="Contract" value={d.contractMeta.name || '-'} />
            <Row label="Token Type" value={d.contractMeta.tokenType || 'Unknown'} />
            <Row label="Source" value={`${d.contractMeta.sourceLines} lines / ${d.contractMeta.sourceBytes} bytes`} />
            <Row label="SIP-010" value={`${d.contractMeta.sip010Compliance}% compliant`} />
            {d.contractMeta.publicFunctions?.length > 0 && <Row label="Public Fns" value={d.contractMeta.publicFunctions.join(', ')} />}
            {d.contractMeta.readOnlyFunctions?.length > 0 && <Row label="Read-Only" value={d.contractMeta.readOnlyFunctions.join(', ')} />}
            {d.contractMeta.dataVars?.length > 0 && <Row label="Data Vars" value={d.contractMeta.dataVars.join(', ')} />}
            {d.contractMeta.maps?.length > 0 && <Row label="Maps" value={d.contractMeta.maps.join(', ')} />}
            {d.contractMeta.traits?.length > 0 && <Row label="Traits" value={d.contractMeta.traits.join(', ')} />}
          </div>
        </Section>
      )}
      {d.vulnerabilities?.length > 0 && (
        <Section title={`Vulnerabilities (${d.vulnerabilities.length})`}>
          <div className="space-y-2">
            {d.vulnerabilities.map((v: any, i: number) => (
              <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge badge-${v.severity === 'critical' ? 'critical' : v.severity === 'high' ? 'high' : v.severity === 'medium' ? 'medium' : 'low'}`}>
                    {v.id} &middot; {v.severity.toUpperCase()}
                  </span>
                  <span className="text-xs font-medium text-white">{v.title}</span>
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">{v.description}</p>
                {v.recommendation && <p className="mt-1 text-[11px] text-[var(--stacks-purple)]">Rec: {v.recommendation}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {d.auditSummary && (
        <Section title="Audit Summary">
          <div className="rounded-lg bg-[var(--background)] p-3 space-y-0.5">
            <Row label="Checks" value={`${d.auditSummary.passed ?? '-'} passed / ${d.auditSummary.failed ?? '-'} failed`} />
            <Row label="Critical Issues" value={d.auditSummary.critical ?? 0} />
            <Row label="High Issues" value={d.auditSummary.high ?? 0} />
            <Row label="Public Surface" value={d.auditSummary.publicSurface || '-'} />
            <Row label="Token Type" value={d.auditSummary.tokenType || '-'} />
          </div>
        </Section>
      )}
    </>);
  }

  if (name === 'DataAgent') {
    return (
      <Section title="On-Chain Metrics">
        <div className="rounded-lg bg-[var(--background)] p-3 space-y-0.5">
          {d.contractName && <Row label="Contract" value={d.contractName} />}
          {d.stxBalanceSTX && <Row label="STX Balance" value={`${d.stxBalanceSTX} STX`} />}
          {d.txCount != null && <Row label="Transactions" value={d.txCount.toLocaleString()} />}
          {d.uniqueInteractors != null && <Row label="Unique Addresses" value={d.uniqueInteractors} />}
          {d.txVelocityPerDay != null && <Row label="Tx Velocity" value={`${d.txVelocityPerDay} tx/day`} />}
          {d.contractCalls != null && <Row label="Contract Calls" value={d.contractCalls} />}
          {d.tokenTransfers != null && <Row label="Transfers" value={d.tokenTransfers} />}
          {d.smartContractDeploys != null && <Row label="Deploys" value={d.smartContractDeploys} />}
          {d.fungibleTokensHeld != null && <Row label="Tokens Held" value={d.fungibleTokensHeld} />}
          {d.nftCollections != null && <Row label="NFT Collections" value={d.nftCollections} />}
          {d.avgFeePerTx != null && <Row label="Avg Fee" value={`${d.avgFeePerTx} µSTX`} />}
          {d.totalFeesSpent != null && <Row label="Total Fees" value={`${d.totalFeesSpent} µSTX`} />}
        </div>
      </Section>
    );
  }

  if (name === 'PriceAgent') {
    return (
      <Section title="Market Data">
        <div className="rounded-lg bg-[var(--background)] p-3 space-y-0.5">
          {d.stxPrice != null && <Row label="STX Price" value={`$${Number(d.stxPrice).toFixed(4)}`} />}
          {d.stx24hChange != null && <Row label="24h" value={<span style={{ color: d.stx24hChange >= 0 ? '#22C55E' : '#EF4444' }}>{d.stx24hChange > 0 ? '+' : ''}{Number(d.stx24hChange).toFixed(2)}%</span>} />}
          {d.stx7dChange != null && <Row label="7d" value={<span style={{ color: d.stx7dChange >= 0 ? '#22C55E' : '#EF4444' }}>{d.stx7dChange > 0 ? '+' : ''}{Number(d.stx7dChange).toFixed(2)}%</span>} />}
          {d.stx30dChange != null && <Row label="30d" value={<span style={{ color: d.stx30dChange >= 0 ? '#22C55E' : '#EF4444' }}>{d.stx30dChange > 0 ? '+' : ''}{Number(d.stx30dChange).toFixed(2)}%</span>} />}
          {d.stxMarketCap && <Row label="Market Cap" value={`$${(d.stxMarketCap / 1e6).toFixed(1)}M`} />}
          {d.stxVolume24h && <Row label="24h Volume" value={`$${(d.stxVolume24h / 1e6).toFixed(1)}M`} />}
          {d.stxATH && <Row label="ATH" value={`$${Number(d.stxATH).toFixed(2)}`} />}
          {d.stxATHChange != null && <Row label="From ATH" value={`${Number(d.stxATHChange).toFixed(1)}%`} />}
          {d.stxCirculatingSupply && <Row label="Circulating" value={`${(d.stxCirculatingSupply / 1e6).toFixed(1)}M STX`} />}
          {d.contractCallCount != null && <Row label="Contract Calls" value={d.contractCallCount} />}
          {d.activityRatio != null && <Row label="Activity" value={`${d.activityRatio}%`} />}
          {d.volatilityIndex && <Row label="Volatility" value={d.volatilityIndex} />}
        </div>
      </Section>
    );
  }

  if (name === 'HistoryAgent') {
    return (<>
      {d.walletProfile && (
        <Section title="Wallet Profile">
          <div className="rounded-lg bg-[var(--background)] p-3 space-y-0.5">
            <Row label="Principal" value={<span className="mono text-[10px]">{d.walletProfile.principal?.slice(0, 8)}...{d.walletProfile.principal?.slice(-6)}</span>} />
            <Row label="Age" value={`${d.walletProfile.ageDays} days`} />
            <Row label="First Seen" value={d.walletProfile.firstSeen?.split('T')[0] || '-'} />
            <Row label="Last Active" value={d.walletProfile.lastActive?.split('T')[0] || '-'} />
            <Row label="STX" value={`${d.walletProfile.stxBalance} STX`} />
            <Row label="Tokens" value={d.walletProfile.fungibleTokens ?? 0} />
            <Row label="NFTs" value={d.walletProfile.nftCollections ?? 0} />
          </div>
        </Section>
      )}
      {d.activityBreakdown && (
        <Section title="Activity Breakdown">
          <div className="rounded-lg bg-[var(--background)] p-3 space-y-0.5">
            <Row label="Total Txs" value={d.activityBreakdown.totalTransactions} />
            <Row label="Deployments" value={d.activityBreakdown.contractDeployments} />
            <Row label="Contract Calls" value={d.activityBreakdown.contractCalls} />
            <Row label="Transfers" value={d.activityBreakdown.tokenTransfers} />
            <Row label="Failed" value={`${d.activityBreakdown.failedTransactions} (${d.activityBreakdown.failureRate})`} />
          </div>
        </Section>
      )}
      {d.deployedContracts?.length > 0 && (
        <Section title="Deployed Contracts">
          <div className="space-y-1">
            {d.deployedContracts.map((ct: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded bg-[var(--background)] px-3 py-1.5 text-xs">
                <span className="font-medium text-white">{ct.name}</span>
                <span className="text-[var(--muted)]">{ct.date?.split('T')[0] || '-'}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
      {d.networkAnalysis && (
        <Section title="Network Analysis">
          <div className="rounded-lg bg-[var(--background)] p-3 space-y-0.5">
            <Row label="Transfer Partners" value={d.networkAnalysis.uniqueTransferPartners} />
            <Row label="Contracts Used" value={d.networkAnalysis.uniqueContractsInteracted} />
            <Row label="STX Sent" value={`${d.networkAnalysis.totalSTXSent} STX`} />
            <Row label="STX Received" value={`${d.networkAnalysis.totalSTXReceived} STX`} />
          </div>
        </Section>
      )}
    </>);
  }

  if (name === 'SocialAgent') {
    return (
      <Section title="AI Sentiment Analysis">
        <div className="rounded-lg bg-[var(--background)] p-3 space-y-2">
          {(d.tokenName || d.contractName) && <Row label="Token" value={d.tokenName || d.contractName} />}
          {d.tokenCategory && <Row label="Category" value={d.tokenCategory} />}
          {d.communityHealth && <Row label="Community" value={d.communityHealth} />}
          {d.narrative && (
            <div className="pt-1 border-t border-[var(--border)]">
              <div className="text-[10px] text-[var(--muted)] mb-1">Narrative</div>
              <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">{d.narrative}</p>
            </div>
          )}
          {d.trustSignals?.length > 0 && (
            <div className="pt-1">
              <div className="text-[10px] text-[var(--muted)] mb-1">Trust Signals</div>
              <div className="flex flex-wrap gap-1.5">
                {d.trustSignals.map((s: string, i: number) => <span key={i} className="badge badge-low">{s}</span>)}
              </div>
            </div>
          )}
          {d.riskFactors?.length > 0 && (
            <div className="pt-1">
              <div className="text-[10px] text-[var(--muted)] mb-1">Risk Factors</div>
              <div className="flex flex-wrap gap-1.5">
                {d.riskFactors.map((r: string, i: number) => <span key={i} className="badge badge-high">{r}</span>)}
              </div>
            </div>
          )}
        </div>
      </Section>
    );
  }

  // Generic fallback
  return (
    <Section title="Findings">
      <pre className="rounded-lg bg-[var(--background)] p-3 text-[11px] text-[var(--muted)] whitespace-pre-wrap overflow-auto max-h-48">{JSON.stringify(d, null, 2)}</pre>
    </Section>
  );
}

export default function ConsensusReport({ result }: Props) {
  const { consensus, agentCount, request } = result;
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);

  const overallRisk = consensus.recommendation.includes('LOW RISK') || consensus.recommendation.includes('APPEARS SAFE')
    ? 'LOW' : consensus.recommendation.includes('HIGH RISK') || consensus.recommendation.includes('AVOID')
    ? 'HIGH' : consensus.recommendation.includes('CRITICAL') ? 'CRITICAL' : 'MEDIUM';

  const risk = riskConfig[overallRisk];
  const payments = consensus.responses.map((r: any) => decodePayment(r)).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Verdict Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="gradient-border overflow-hidden">
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${risk.bg} 0%, var(--surface) 60%)` }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {overallRisk === 'LOW' ? <CheckCircle className="h-5 w-5" style={{ color: risk.color }} /> :
                 overallRisk === 'MEDIUM' ? <AlertTriangle className="h-5 w-5" style={{ color: risk.color }} /> :
                 <XCircle className="h-5 w-5" style={{ color: risk.color }} />}
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: risk.color }}>{risk.label}</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{consensus.recommendation}</h2>
              <p className="text-sm text-[var(--muted)]">{agentCount} agents analyzed &middot; {request?.tokenAddress?.split('.').pop() || request?.query}</p>
            </div>
            <ScoreRing score={consensus.averageScore} size={100} />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Consensus', value: `${Math.round(consensus.consensusStrength * 100)}%`, sub: 'Agent Agreement' },
          { label: 'Confidence', value: `${consensus.confidence}%`, sub: 'Score Reliability' },
          { label: 'Total Cost', value: `${(consensus.totalCost / 1_000_000).toFixed(4)} STX`, sub: `${payments.length} x402 payments` },
          { label: 'Agents', value: `${agentCount}`, sub: 'Active Analyzers' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="card p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-1">{stat.label}</div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
            <div className="text-[10px] text-[var(--muted)]">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Agent Responses */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--stacks-purple)]" />
          Agent Analysis ({consensus.responses.length})
        </h3>
        <div className="space-y-2">
          {consensus.responses.map((response: any, idx: number) => {
            const ag = agentStyle[response.agentName] || agentStyle.SecurityAgent;
            const Icon = ag.icon;
            const expanded = expandedAgent === idx;
            const payment = decodePayment(response);
            const agRisk = riskConfig[response.riskLevel] || riskConfig.MEDIUM;
            const findings = response.metadata?.detailedFindings || {};

            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + idx * 0.06 }}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden transition-smooth"
                style={{ borderColor: expanded ? ag.color + '40' : undefined }}>
                <button onClick={() => setExpandedAgent(expanded ? null : idx)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-white/[0.02]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: ag.bg }}>
                    <Icon className="h-5 w-5" style={{ color: ag.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-semibold text-white">{response.agentName}</span>
                      <span className={`badge badge-${(response.riskLevel || 'medium').toLowerCase()}`}>{response.riskLevel}</span>
                      {payment?.txHash && <span className="badge" style={{ background: 'rgba(85,70,255,0.1)', color: '#5546FF', fontSize: 10 }}><Zap className="h-2.5 w-2.5" /> x402</span>}
                    </div>
                    <p className="text-xs text-[var(--muted)] line-clamp-1">{response.analysis}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: agRisk.color }}>{response.score}</div>
                      <div className="text-[10px] text-[var(--muted)]">{response.executionTime}ms</div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
                        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed whitespace-pre-line mb-2">{response.analysis}</p>

                        {response.flags?.length > 0 && (
                          <Section title="Flags & Issues">
                            <div className="space-y-1.5">
                              {response.flags.map((flag: string, fi: number) => (
                                <div key={fi} className="flex items-start gap-2 text-[11px]">
                                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" style={{ color: agRisk.color }} />
                                  <span className="text-[var(--muted-foreground)]">{flag}</span>
                                </div>
                              ))}
                            </div>
                          </Section>
                        )}

                        <AgentDetails name={response.agentName} d={findings} />

                        {payment?.txHash && (
                          <Section title="Payment Receipt">
                            <div className="flex items-center justify-between rounded-lg bg-[var(--background)] border border-[var(--border)] p-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--muted)]">Tx:</span>
                                  <a href={payment.explorerUrl} target="_blank" rel="noopener noreferrer" className="tx-link mono flex items-center gap-1">
                                    {payment.txHash.slice(0, 10)}...{payment.txHash.slice(-8)}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                                <div className="text-[10px] text-[var(--muted)]">Cost: {((response.metadata?.price || 0) / 1_000_000).toFixed(4)} STX</div>
                              </div>
                              <div className="text-[10px] text-right text-[var(--muted)]">
                                <div>Stacks Testnet</div>
                                <div style={{ color: '#22C55E' }}>Confirmed</div>
                              </div>
                            </div>
                          </Section>
                        )}

                        <div className="mt-3 flex items-center gap-4 text-[10px] text-[var(--muted)]">
                          <span>Scan: {response.metadata?.scanTime || response.executionTime}ms</span>
                          <span>Agent: {response.agentId}</span>
                          {response.metadata?.price && <span>Cost: {(response.metadata.price / 1_000_000).toFixed(4)} STX</span>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Payment Receipts */}
      {payments.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--stacks-orange)]" />
            x402 Payment Receipts ({payments.length} transactions)
          </h3>
          <div className="space-y-2">
            {consensus.responses.map((resp: any, idx: number) => {
              const pay = decodePayment(resp);
              if (!pay?.txHash) return null;
              const Ic = agentStyle[resp.agentName]?.icon || Shield;
              return (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-[var(--background)] border border-[var(--border)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: agentStyle[resp.agentName]?.bg || 'rgba(85,70,255,0.1)' }}>
                      <Ic className="h-4 w-4" style={{ color: agentStyle[resp.agentName]?.color || '#5546FF' }} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">{resp.agentName}</div>
                      <a href={pay.explorerUrl} target="_blank" rel="noopener noreferrer" className="tx-link mono text-[11px] flex items-center gap-1">
                        {pay.txHash.slice(0, 14)}...{pay.txHash.slice(-8)}
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">{((resp.metadata?.price || 0) / 1_000_000).toFixed(4)} STX</div>
                    <div className="text-[10px] text-[var(--success)]">Confirmed</div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--muted)]">Total x402 Payments</span>
              <span className="text-sm font-bold gradient-text">{(consensus.totalCost / 1_000_000).toFixed(4)} STX</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Query Footer */}
      <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-4 py-3 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>Query: &ldquo;{request?.query}&rdquo;</span>
        {request?.tokenAddress && <span className="mono text-[10px]">{request.tokenAddress}</span>}
      </div>
    </div>
  );
}
