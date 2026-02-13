import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { orchestratorRouter } from './routes/orchestrator';
import { agentRouter } from './routes/agents';
import { paymentsRouter } from './routes/payments';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'orchestrator',
    timestamp: new Date().toISOString(),
    network: process.env.STACKS_NETWORK || 'testnet'
  });
});

// Routes
app.use('/api/orchestrator', orchestratorRouter);
app.use('/api/agents', agentRouter);
app.use('/api/payments', paymentsRouter);

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Orchestrator running on port ${PORT}`);
  console.log(`📡 Network: ${process.env.STACKS_NETWORK}`);
  console.log(`🔗 Stacks API: ${process.env.STACKS_API_URL}`);
});

export default app;
