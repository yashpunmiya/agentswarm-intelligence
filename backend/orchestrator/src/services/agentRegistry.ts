import { AgentBid } from '../types';

interface RegisteredAgent {
  id: string;
  name: string;
  type: 'security' | 'data' | 'social' | 'price' | 'history';
  endpoint: string;
  basePrice: number;
  reputation: number;
  totalTasks: number;
  successRate: number;
  averageResponseTime: number;
  active: boolean;
}

class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents() {
    const agents: RegisteredAgent[] = [
      {
        id: 'security-001',
        name: 'SecurityAgent',
        type: 'security',
        endpoint: process.env.SECURITY_AGENT_URL || 'http://localhost:3002',
        basePrice: 100000,
        reputation: 95,
        totalTasks: 0,
        successRate: 1.0,
        averageResponseTime: 2000,
        active: true
      },
      {
        id: 'data-001',
        name: 'DataAgent',
        type: 'data',
        endpoint: process.env.DATA_AGENT_URL || 'http://localhost:3003',
        basePrice: 80000,
        reputation: 92,
        totalTasks: 0,
        successRate: 1.0,
        averageResponseTime: 1500,
        active: true
      },
      {
        id: 'social-001',
        name: 'SocialAgent',
        type: 'social',
        endpoint: process.env.SOCIAL_AGENT_URL || 'http://localhost:3004',
        basePrice: 50000,
        reputation: 88,
        totalTasks: 0,
        successRate: 1.0,
        averageResponseTime: 3000,
        active: true
      },
      {
        id: 'price-001',
        name: 'PriceAgent',
        type: 'price',
        endpoint: process.env.PRICE_AGENT_URL || 'http://localhost:3005',
        basePrice: 150000,
        reputation: 90,
        totalTasks: 0,
        successRate: 1.0,
        averageResponseTime: 2500,
        active: true
      },
      {
        id: 'history-001',
        name: 'HistoryAgent',
        type: 'history',
        endpoint: process.env.HISTORY_AGENT_URL || 'http://localhost:3006',
        basePrice: 80000,
        reputation: 93,
        totalTasks: 0,
        successRate: 1.0,
        averageResponseTime: 2000,
        active: true
      }
    ];

    agents.forEach(agent => this.agents.set(agent.id, agent));
  }

  getAllActiveAgents(): RegisteredAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.active);
  }

  getAgentById(id: string): RegisteredAgent | undefined {
    return this.agents.get(id);
  }

  updateAgentReputation(id: string, success: boolean, responseTime: number) {
    const agent = this.agents.get(id);
    if (!agent) return;

    agent.totalTasks++;
    const successCount = Math.round(agent.successRate * (agent.totalTasks - 1)) + (success ? 1 : 0);
    agent.successRate = successCount / agent.totalTasks;
    agent.reputation = Math.round(agent.successRate * 100);
    
    agent.averageResponseTime = 
      (agent.averageResponseTime * (agent.totalTasks - 1) + responseTime) / agent.totalTasks;
  }

  getAgentBids(budget: number): AgentBid[] {
    return this.getAllActiveAgents()
      .filter(agent => agent.basePrice <= budget)
      .map(agent => ({
        agentId: agent.id,
        agentName: agent.name,
        endpoint: agent.endpoint,
        price: agent.basePrice,
        estimatedTime: agent.averageResponseTime,
        confidence: agent.reputation
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }
}

export const agentRegistry = new AgentRegistry();
