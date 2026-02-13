'use client';

import { Shield, TrendingUp, Users, DollarSign, Clock, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface Props {
  result: any;
}

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  MEDIUM: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

const agentIcons: Record<string, typeof Shield> = {
  SecurityAgent: Shield,
  DataAgent: TrendingUp,
  SocialAgent: Users,
  PriceAgent: DollarSign,
  HistoryAgent: Clock,
};

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border)" strokeWidth="4"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

export default function ConsensusReport({ result }: Props) {
  const { consensus, agentCount, request } = result;
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);

  const getRecommendationIcon = () => {
    if (consensus.recommendation.includes('LOW RISK') || consensus.recommendation.includes('APPEARS SAFE')) {
      return <CheckCircle className="h-5 w-5 text-emerald-400" />;
    }
    if (consensus.recommendation.includes('MEDIUM')) {
      return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    }
    return <XCircle className="h-5 w-5 text-red-400" />;
  };

  const getRecommendationColor = () => {
    if (consensus.recommendation.includes('LOW RISK') || consensus.recommendation.includes('APPEARS SAFE')) return 'border-emerald-500/20 bg-emerald-500/5';
    if (consensus.recommendation.includes('MEDIUM')) return 'border-amber-500/20 bg-amber-500/5';
    return 'border-red-500/20 bg-red-500/5';
  };

  return (
    <div className="space-y-4">
      {/* Main consensus card */}
      <div className="glow-border rounded-xl bg-[var(--surface)] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Consensus Report</h2>
          <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs text-[var(--accent)]">
            {agentCount} agents responded
          </span>
        </div>

        {/* Score overview */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center rounded-lg bg-[var(--background)] p-4">
            <ScoreRing score={consensus.averageScore} />
            <span className="mt-2 text-xs text-[var(--muted)]">Avg Score</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-[var(--background)] p-4">
            <span className="text-3xl font-bold text-white">
              {Math.round(consensus.consensusStrength * 100)}%
            </span>
            <span className="mt-1 text-xs text-[var(--muted)]">Consensus</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-[var(--background)] p-4">
            <span className="text-3xl font-bold text-white">{consensus.confidence}%</span>
            <span className="mt-1 text-xs text-[var(--muted)]">Confidence</span>
          </div>
        </div>

        {/* Recommendation */}
        <div className={`flex items-center gap-3 rounded-lg border p-4 ${getRecommendationColor()}`}>
          {getRecommendationIcon()}
          <div>
            <div className="text-xs font-medium text-[var(--muted)]">Recommendation</div>
            <div className="text-sm font-semibold text-white">{consensus.recommendation}</div>
          </div>
        </div>

        {/* Query info */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--background)] px-4 py-2 text-xs text-[var(--muted)]">
          <span>Query: &ldquo;{request?.query}&rdquo;</span>
          <span>Cost: {(consensus.totalCost / 1000000).toFixed(4)} STX</span>
        </div>
      </div>

      {/* Agent responses */}
      <div className="glow-border rounded-xl bg-[var(--surface)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">Agent Responses</h3>
        <div className="space-y-2">
          {consensus.responses.map((response: any, idx: number) => {
            const IconComponent = agentIcons[response.agentName] || Shield;
            const risk = riskColors[response.riskLevel] || riskColors.MEDIUM;
            const isExpanded = expandedAgent === idx;

            return (
              <div key={idx} className="rounded-lg bg-[var(--background)] transition-smooth">
                <button
                  onClick={() => setExpandedAgent(isExpanded ? null : idx)}
                  className="flex w-full items-center gap-3 p-4"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${risk.bg}`}>
                    <IconComponent className={`h-4 w-4 ${risk.text}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-white">{response.agentName}</div>
                    <div className="text-xs text-[var(--muted)] line-clamp-1">{response.analysis}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">{response.score}/100</div>
                      <div className={`text-[10px] font-medium ${risk.text}`}>{response.riskLevel}</div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-[var(--muted)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
                    <p className="mb-3 text-xs text-[var(--muted)] leading-relaxed">{response.analysis}</p>
                    
                    {response.flags && response.flags.length > 0 && (
                      <div className="mb-3">
                        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Flags</div>
                        <div className="flex flex-wrap gap-1.5">
                          {response.flags.map((flag: string, fIdx: number) => (
                            <span key={fIdx} className={`rounded-full border px-2 py-0.5 text-[10px] ${risk.bg} ${risk.text} ${risk.border}`}>
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-[10px] text-[var(--muted)]">
                      <span>Execution: {response.executionTime}ms</span>
                      {response.metadata?.price && (
                        <span>Cost: {(response.metadata.price / 1000000).toFixed(4)} STX</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
