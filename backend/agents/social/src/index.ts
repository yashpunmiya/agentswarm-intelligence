import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { paymentMiddleware, STACKS_NETWORKS } from 'x402-stacks';
import { SocialAnalyzer } from './services/SocialAnalyzer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const analyzer = new SocialAnalyzer();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    agent: process.env.AGENT_NAME || 'SocialAgent',
    type: process.env.AGENT_TYPE || 'social',
    port: PORT
  });
});

app.post('/analyze-free', async (req: Request, res: Response) => {
  try {
    const { tokenAddress, query } = req.body;
    const target = tokenAddress || query || 'unknown';
    console.log(`💬 SocialAgent analyzing: ${target}`);
    
    const result = await analyzer.analyze(target);
    
    res.json({
      agentId: 'social-001',
      agentName: 'SocialAgent',
      score: result.score,
      analysis: result.summary,
      riskLevel: result.riskLevel,
      flags: result.issues,
      metadata: {
        detailedFindings: result.details,
        scanTime: result.scanTime,
        price: Number(process.env.BASE_PRICE_MICROSTX || 50000)
      },
      executionTime: result.scanTime
    });
  } catch (error: any) {
    console.error('SocialAgent error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/analyze',
  paymentMiddleware({
    amount: BigInt(process.env.BASE_PRICE_MICROSTX || '50000'),
    payTo: process.env.SERVER_ADDRESS!,
    network: STACKS_NETWORKS.TESTNET,
    asset: 'STX',
    facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com',
  }),
  async (req: Request, res: Response) => {
  try {
    const { tokenAddress, query } = req.body;
    const target = tokenAddress || query || 'unknown';
    console.log(`💬 SocialAgent (paid) analyzing: ${target}`);
    
    const result = await analyzer.analyze(target);
    
    res.json({
      agentId: 'social-001',
      agentName: 'SocialAgent',
      score: result.score,
      analysis: result.summary,
      riskLevel: result.riskLevel,
      flags: result.issues,
      metadata: {
        detailedFindings: result.details,
        scanTime: result.scanTime,
        price: Number(process.env.BASE_PRICE_MICROSTX || 50000)
      },
      executionTime: result.scanTime
    });
  } catch (error: any) {
    console.error('SocialAgent error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`💬 ${process.env.AGENT_NAME || 'SocialAgent'} running on port ${PORT}`);
});
