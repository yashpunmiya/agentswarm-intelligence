import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { paymentMiddleware, STACKS_NETWORKS } from 'x402-stacks';
import { HistoryAnalyzer } from './services/HistoryAnalyzer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;
const analyzer = new HistoryAnalyzer();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    agent: process.env.AGENT_NAME || 'HistoryAgent',
    type: process.env.AGENT_TYPE || 'history',
    port: PORT
  });
});

app.post('/analyze-free', async (req: Request, res: Response) => {
  try {
    const { tokenAddress, query } = req.body;
    const target = tokenAddress || query || 'unknown';
    console.log(`📜 HistoryAgent analyzing: ${target}`);
    
    const result = await analyzer.analyze(target);
    
    res.json({
      agentId: 'history-001',
      agentName: 'HistoryAgent',
      score: result.score,
      analysis: result.summary,
      riskLevel: result.riskLevel,
      flags: result.issues,
      metadata: {
        detailedFindings: result.details,
        scanTime: result.scanTime,
        price: Number(process.env.BASE_PRICE_MICROSTX || 80000)
      },
      executionTime: result.scanTime
    });
  } catch (error: any) {
    console.error('HistoryAgent error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/analyze',
  paymentMiddleware({
    amount: BigInt(process.env.BASE_PRICE_MICROSTX || '80000'),
    payTo: process.env.SERVER_ADDRESS!,
    network: STACKS_NETWORKS.TESTNET,
    asset: 'STX',
    facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com',
  }),
  async (req: Request, res: Response) => {
  try {
    const { tokenAddress, query } = req.body;
    const target = tokenAddress || query || 'unknown';
    console.log(`📜 HistoryAgent (paid) analyzing: ${target}`);
    
    const result = await analyzer.analyze(target);
    
    res.json({
      agentId: 'history-001',
      agentName: 'HistoryAgent',
      score: result.score,
      analysis: result.summary,
      riskLevel: result.riskLevel,
      flags: result.issues,
      metadata: {
        detailedFindings: result.details,
        scanTime: result.scanTime,
        price: Number(process.env.BASE_PRICE_MICROSTX || 80000)
      },
      executionTime: result.scanTime
    });
  } catch (error: any) {
    console.error('HistoryAgent error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`📜 ${process.env.AGENT_NAME || 'HistoryAgent'} running on port ${PORT}`);
});
