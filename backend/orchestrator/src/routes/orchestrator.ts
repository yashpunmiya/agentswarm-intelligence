import { Router, Request, Response } from 'express';
import axios from 'axios';
import { IntelligenceRequest, AgentResponse } from '../types';
import { agentRegistry } from '../services/agentRegistry';
import { consensusCalculator } from '../services/consensusCalculator';

let paidAxios: ReturnType<typeof axios.create> | null = null;
let paymentMw: any = null;

// Lazy-init the x402 payment middleware for the orchestrator endpoint
async function getPaymentMiddleware() {
  if (paymentMw) return paymentMw;
  try {
    const { paymentMiddleware, STACKS_NETWORKS } = await import('x402-stacks');
    
    const totalAgentCost = 460000; // Total cost of all 5 agents
    const platformFee = Math.round(totalAgentCost * 0.05); // 5% platform fee
    const totalAmount = totalAgentCost + platformFee;
    
    paymentMw = paymentMiddleware({
      amount: BigInt(process.env.ORCHESTRATOR_PRICE_MICROSTX || String(totalAmount)),
      payTo: process.env.ORCHESTRATOR_ADDRESS || process.env.SERVER_ADDRESS!,
      network: STACKS_NETWORKS.TESTNET,
      asset: 'STX',
      facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com',
    });
    console.log(`💳 Orchestrator x402 paywall initialized | Price: ${totalAmount} microSTX`);
    return paymentMw;
  } catch (err: any) {
    console.error('⚠️ Orchestrator payment middleware failed:', err.message);
    return null;
  }
}

// Lazy-init the x402-wrapped axios client for production mode
async function getPaidAxios() {
  if (paidAxios) return paidAxios;
  try {
    const { wrapAxiosWithPayment, privateKeyToAccount } = await import('x402-stacks');
    
    const privateKey = process.env.ORCHESTRATOR_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('ORCHESTRATOR_PRIVATE_KEY not set in .env - orchestrator cannot pay agents');
    }
    
    const account = privateKeyToAccount(privateKey, 'testnet');
    
    paidAxios = wrapAxiosWithPayment(
      axios.create({ timeout: 60000 }),
      account
    );
    console.log(`💳 x402 payment client initialized | Orchestrator Address: ${account.address}`);
    console.log(`💰 Fund this address at: https://explorer.stacks.co/sandbox/faucet?chain=testnet`);
    return paidAxios;
  } catch (err: any) {
    console.error('⚠️ x402 payment client failed:', err.message);
    console.log('📌 Falling back to free endpoints');
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
    
    // Determine payment mode: USE_REAL_PAYMENTS=true forces x402 payments
    const useRealPayments = process.env.USE_REAL_PAYMENTS === 'true';
    
    const agentPromises = bids.map(async (bid) => {
      const startTime = Date.now();
      try {
        let endpoint: string;
        let client: any;

        if (useRealPayments) {
          // x402 REAL PAYMENT MODE: Call /analyze with x402 payment client
          endpoint = `${bid.endpoint}/analyze`;
          client = await getPaidAxios();
          console.log(`💳 Using x402 payment for ${bid.agentName} at ${endpoint}`);
        } else {
          // Free mode for testing without blockchain payments
          endpoint = `${bid.endpoint}/analyze-free`;
          client = axios;
          console.log(`🆓 Using free endpoint for ${bid.agentName}`);
        }

        const response = await client.post(
          endpoint,
          {
            query: request.query,
            tokenAddress: request.tokenAddress,
            priority: request.priority || 'medium'
          },
          { timeout: 60000 }
        );

        const executionTime = Date.now() - startTime;
        agentRegistry.updateAgentReputation(bid.agentId, true, executionTime);

        // Decode x402 payment proof from response headers
        const paymentResponse = response.headers?.['payment-response'] || null;
        let payment: any = null;
        if (paymentResponse) {
          try {
            const decoded = JSON.parse(Buffer.from(paymentResponse, 'base64').toString());
            payment = {
              success: decoded.success,
              payer: decoded.payer,
              txHash: decoded.transaction,
              network: decoded.network,
              explorerUrl: `https://explorer.hiro.so/txid/${decoded.transaction}?chain=testnet`
            };
            console.log(`  ✅ ${bid.agentName} paid: ${decoded.transaction.slice(0, 16)}...`);
          } catch {}
        }
        
        return {
          agentId: bid.agentId,
          agentName: bid.agentName,
          score: response.data.score,
          analysis: response.data.analysis || response.data.summary,
          riskLevel: response.data.riskLevel,
          flags: response.data.flags || response.data.issues || [],
          metadata: {
            ...response.data.metadata,
            price: bid.price,
            paidViaX402: useRealPayments,
            payment: payment
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
      res.status(400).json({ 
        error: 'All agents failed to analyze this token/contract',
        message: 'The provided address may be invalid or not found on the Stacks blockchain. Please verify the contract address format (e.g., SP2ABC...XYZ.token-name) or try a different token.',
        hint: 'Example valid contract: SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token'
      });
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

// x402 PAID ENDPOINT - User pays orchestrator, orchestrator pays agents
orchestratorRouter.post('/request-paid', async (req: Request, res: Response) => {
  try {
    // Apply x402 payment middleware dynamically
    const mw = await getPaymentMiddleware();
    if (!mw) {
      res.status(500).json({ error: 'Payment system not configured' });
      return;
    }

    // Run payment middleware
    await new Promise<void>((resolve, reject) => {
      mw(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // If we get here, payment was successful
    // Now forward to the same logic as /request but with x402 agent payments
    const request: IntelligenceRequest = req.body;
    if (!request.query || !request.budget || !request.requesterAddress) {
      res.status(400).json({ error: 'Missing required fields: query, budget, requesterAddress' });
      return;
    }

    // Force USE_REAL_PAYMENTS for the paid endpoint
    const originalSetting = process.env.USE_REAL_PAYMENTS;
    process.env.USE_REAL_PAYMENTS = 'true';

    const bids = agentRegistry.getAgentBids(request.budget);
    if (bids.length === 0) {
      process.env.USE_REAL_PAYMENTS = originalSetting;
      res.status(400).json({ error: 'Budget too low for any agents', minimumBudget: 50000 });
      return;
    }

    console.log(`💳 PAID request: Broadcasting to ${bids.length} agents with x402 payments...`);
    const paidClient = await getPaidAxios();

    const agentPromises = bids.map(async (bid) => {
      const startTime = Date.now();
      try {
        console.log(`💳 Paying ${bid.agentName} (${bid.price} microSTX) via x402...`);
        const response = await paidClient.post(
          `${bid.endpoint}/analyze`,
          {
            query: request.query,
            tokenAddress: request.tokenAddress,
            priority: request.priority || 'medium'
          },
          { timeout: 60000 }
        );

        const executionTime = Date.now() - startTime;
        agentRegistry.updateAgentReputation(bid.agentId, true, executionTime);
        const paymentResponse = response.headers?.['payment-response'] || null;
        let payment: any = null;
        if (paymentResponse) {
          try {
            const decoded = JSON.parse(Buffer.from(paymentResponse, 'base64').toString());
            payment = {
              success: decoded.success,
              payer: decoded.payer,
              txHash: decoded.transaction,
              network: decoded.network,
              explorerUrl: `https://explorer.hiro.so/txid/${decoded.transaction}?chain=testnet`
            };
            console.log(`  ✅ ${bid.agentName} paid: ${decoded.transaction.slice(0, 16)}...`);
          } catch {}
        }

        return {
          agentId: bid.agentId,
          agentName: bid.agentName,
          score: response.data.score,
          analysis: response.data.analysis || response.data.summary,
          riskLevel: response.data.riskLevel,
          flags: response.data.flags || response.data.issues || [],
          metadata: {
            ...response.data.metadata,
            price: bid.price,
            paidViaX402: true,
            payment: payment
          },
          executionTime
        } as AgentResponse;
      } catch (error: any) {
        console.error(`❌ Agent ${bid.agentName} payment/analysis failed:`, error.message);
        agentRegistry.updateAgentReputation(bid.agentId, false, Date.now() - startTime);
        return null;
      }
    });

    const results = await Promise.all(agentPromises);
    process.env.USE_REAL_PAYMENTS = originalSetting;
    const successfulResponses = results.filter((r): r is AgentResponse => r !== null);

    if (successfulResponses.length === 0) {
      res.status(400).json({ error: 'All agents failed', message: 'Payment was collected but all agents failed. Check contract address.' });
      return;
    }

    const consensus = consensusCalculator.calculateConsensus(successfulResponses);
    console.log(`✅ PAID consensus from ${successfulResponses.length} agents | Score: ${consensus.averageScore}/100`);

    res.json({
      success: true,
      paidMode: true,
      request: { query: request.query, tokenAddress: request.tokenAddress, timestamp: new Date().toISOString() },
      consensus,
      agentCount: successfulResponses.length,
      availableAgents: bids.length
    });

  } catch (error: any) {
    if (res.headersSent) return;
    console.error('Paid orchestrator error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
orchestratorRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    activeAgents: agentRegistry.getAllActiveAgents().length 
  });
});
