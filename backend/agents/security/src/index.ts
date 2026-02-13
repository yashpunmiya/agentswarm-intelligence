import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { paymentMiddleware, STACKS_NETWORKS } from 'x402-stacks';
import { SecurityAnalyzer } from './services/SecurityAnalyzer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const analyzer = new SecurityAnalyzer();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    agent: process.env.AGENT_NAME || 'SecurityAgent',
    type: process.env.AGENT_TYPE || 'security',
    port: PORT
  });
});

// Free endpoint for local/orchestrator use
app.post('/analyze-free', async (req: Request, res: Response) => {
  try {
    const { tokenAddress, query } = req.body;
    const target = tokenAddress || query || 'unknown';
    console.log(`🔒 SecurityAgent analyzing: ${target}`);
    
    const result = await analyzer.analyze(target);
    
    res.json({
      agentId: 'security-001',
      agentName: 'SecurityAgent',
      score: result.score,
      analysis: result.summary,
      riskLevel: result.riskLevel,
      flags: result.issues,
      metadata: {
        detailedFindings: result.details,
        scanTime: result.scanTime,
        price: Number(process.env.BASE_PRICE_MICROSTX || 100000)
      },
      executionTime: result.scanTime
    });
  } catch (error: any) {
    console.error('SecurityAgent error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Paid endpoint using x402 payment middleware
app.post('/analyze',
  paymentMiddleware({
    amount: BigInt(process.env.BASE_PRICE_MICROSTX || '100000'),
    payTo: process.env.SERVER_ADDRESS!,
    network: STACKS_NETWORKS.TESTNET,
    asset: 'STX',
    facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com',
  }),
  async (req: Request, res: Response) => {
  try {
    const { tokenAddress, query } = req.body;
    const target = tokenAddress || query || 'unknown';
    console.log(`🔒 SecurityAgent (paid) analyzing: ${target}`);
    
    const result = await analyzer.analyze(target);
    
    res.json({
      agentId: 'security-001',
      agentName: 'SecurityAgent',
      score: result.score,
      analysis: result.summary,
      riskLevel: result.riskLevel,
      flags: result.issues,
      metadata: {
        detailedFindings: result.details,
        scanTime: result.scanTime,
        price: Number(process.env.BASE_PRICE_MICROSTX || 100000)
      },
      executionTime: result.scanTime
    });
  } catch (error: any) {
    console.error('SecurityAgent error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔒 ${process.env.AGENT_NAME || 'SecurityAgent'} running on port ${PORT}`);
});
