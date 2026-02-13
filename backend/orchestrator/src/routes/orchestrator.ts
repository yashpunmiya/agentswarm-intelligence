import { Router, Request, Response } from 'express';
import axios from 'axios';
import { IntelligenceRequest, AgentResponse } from '../types';
import { agentRegistry } from '../services/agentRegistry';
import { consensusCalculator } from '../services/consensusCalculator';

let paidAxios: ReturnType<typeof axios.create> | null = null;

// Lazy-init the x402-wrapped axios client for production mode
async function getPaidAxios() {
  if (paidAxios) return paidAxios;
  try {
    const { wrapAxiosWithPayment, generateKeypair, privateKeyToAccount } = await import('x402-stacks');
    // Generate a keypair for the orchestrator to pay agents
    const keypair = generateKeypair('testnet');
    const account = privateKeyToAccount(keypair.privateKey, 'testnet');
    paidAxios = wrapAxiosWithPayment(
      axios.create({ timeout: 60000 }),
      account
    );
    console.log(`💳 x402 payment client initialized | Address: ${account.address}`);
    return paidAxios;
  } catch (err) {
    console.warn('⚠️ x402-stacks not available, falling back to free endpoints');
    return axios;
  }
}

export const orchestratorRouter = Router();

// Submit intelligence request
orchestratorRouter.post('/request', async (req: Request, res: Response) => {
  try {
    const request: IntelligenceRequest = req.body;

    if (!request.query || !request.budget || !request.requesterAddress) {
      res.status(400).json({ error: 'Missing required fields: query, budget, requesterAddress' });
      return;
    }

    const bids = agentRegistry.getAgentBids(request.budget);

    if (bids.length === 0) {
      res.status(400).json({ 
        error: 'Budget too low for any agents',
        minimumBudget: 50000
      });
      return;
    }

    console.log(`📡 Broadcasting request to ${bids.length} agents...`);
    
    const agentPromises = bids.map(async (bid) => {
      const startTime = Date.now();
      try {
        // Use free endpoint for local development, paid (x402) for production
        const isProduction = process.env.NODE_ENV === 'production';
        const endpoint = isProduction 
          ? `${bid.endpoint}/analyze`
          : `${bid.endpoint}/analyze-free`;

        const client = isProduction ? await getPaidAxios() : axios;

        const response = await client.post(
          endpoint,
          {
            query: request.query,
            tokenAddress: request.tokenAddress,
            priority: request.priority || 'medium'
          },
          { timeout: 30000 }
        );

        const executionTime = Date.now() - startTime;
        agentRegistry.updateAgentReputation(bid.agentId, true, executionTime);

        return {
          agentId: bid.agentId,
          agentName: bid.agentName,
          score: response.data.score,
          analysis: response.data.analysis || response.data.summary,
          riskLevel: response.data.riskLevel,
          flags: response.data.flags || response.data.issues || [],
          metadata: {
            ...response.data.metadata,
            price: bid.price
          },
          executionTime
        } as AgentResponse;
      } catch (error: any) {
        console.error(`❌ Agent ${bid.agentName} failed:`, error.message);
        agentRegistry.updateAgentReputation(bid.agentId, false, Date.now() - startTime);
        return null;
      }
    });

    const results = await Promise.all(agentPromises);
    const successfulResponses = results.filter((r): r is AgentResponse => r !== null);

    if (successfulResponses.length === 0) {
      res.status(500).json({ error: 'All agents failed to respond' });
      return;
    }

    const consensus = consensusCalculator.calculateConsensus(successfulResponses);

    console.log(`✅ Consensus from ${successfulResponses.length} agents | Score: ${consensus.averageScore}/100 | Strength: ${consensus.consensusStrength}`);

    res.json({
      success: true,
      request: {
        query: request.query,
        tokenAddress: request.tokenAddress,
        timestamp: new Date().toISOString()
      },
      consensus,
      agentCount: successfulResponses.length,
      availableAgents: bids.length
    });

  } catch (error: any) {
    console.error('Orchestrator error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available agents
orchestratorRouter.get('/agents', (_req: Request, res: Response) => {
  const agents = agentRegistry.getAllActiveAgents();
  res.json({ agents });
});

// Health check
orchestratorRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    activeAgents: agentRegistry.getAllActiveAgents().length 
  });
});
