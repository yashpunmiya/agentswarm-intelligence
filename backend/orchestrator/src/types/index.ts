export interface IntelligenceRequest {
  query: string;
  tokenAddress?: string;
  budget: number;
  requesterAddress: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface AgentBid {
  agentId: string;
  agentName: string;
  endpoint: string;
  price: number;
  estimatedTime: number;
  confidence: number;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  score: number;
  analysis: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
  metadata: Record<string, any>;
  executionTime: number;
}

export interface ConsensusResult {
  averageScore: number;
  consensusStrength: number;
  recommendation: string;
  confidence: number;
  totalCost: number;
  responses: AgentResponse[];
}

export interface PaymentDistribution {
  agentId: string;
  amount: number;
  txId?: string;
  status: 'pending' | 'confirmed' | 'failed';
}
