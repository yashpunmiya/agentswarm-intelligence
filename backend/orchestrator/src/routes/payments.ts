import { Router, Request, Response } from 'express';
import { PaymentDistribution } from '../types';

export const paymentsRouter = Router();

// In-memory payment ledger (production: use database)
const paymentLedger: Array<{
  requestId: string;
  distributions: PaymentDistribution[];
  timestamp: string;
  totalAmount: number;
}> = [];

// Distribute payments to agents
paymentsRouter.post('/distribute', async (req: Request, res: Response) => {
  try {
    const { requestId, distributions } = req.body as {
      requestId: string;
      distributions: PaymentDistribution[];
    };

    if (!requestId || !distributions || distributions.length === 0) {
      res.status(400).json({ error: 'Missing requestId or distributions' });
      return;
    }

    const platformFee = Number(process.env.PLATFORM_FEE_PERCENT || 5) / 100;
    const processed: PaymentDistribution[] = [];

    for (const dist of distributions) {
      const netAmount = Math.round(dist.amount * (1 - platformFee));
      
      processed.push({
        agentId: dist.agentId,
        amount: netAmount,
        txId: `sim_tx_${Date.now()}_${dist.agentId}`,
        status: 'confirmed'
      });
    }

    const totalAmount = processed.reduce((sum, p) => sum + p.amount, 0);

    const record = {
      requestId,
      distributions: processed,
      timestamp: new Date().toISOString(),
      totalAmount
    };
    paymentLedger.push(record);

    res.json({
      success: true,
      ...record,
      platformFeePercent: platformFee * 100
    });

  } catch (error: any) {
    console.error('Payment distribution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment history
paymentsRouter.get('/history', (_req: Request, res: Response) => {
  res.json({
    count: paymentLedger.length,
    payments: paymentLedger.slice(-50)
  });
});

// Get payment by request ID
paymentsRouter.get('/:requestId', (req: Request, res: Response) => {
  const payment = paymentLedger.find(p => p.requestId === req.params.requestId);
  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }
  res.json(payment);
});
