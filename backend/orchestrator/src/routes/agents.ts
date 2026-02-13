import { Router, Request, Response } from 'express';
import axios from 'axios';
import { agentRegistry } from '../services/agentRegistry';

export const agentRouter = Router();

// List all agents
agentRouter.get('/', (_req: Request, res: Response) => {
  const agents = agentRegistry.getAllActiveAgents();
  res.json({
    count: agents.length,
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      reputation: a.reputation,
      basePrice: a.basePrice,
      totalTasks: a.totalTasks,
      successRate: Math.round(a.successRate * 100),
      averageResponseTime: Math.round(a.averageResponseTime)
    }))
  });
});

// Get specific agent info
agentRouter.get('/:agentId', (req: Request, res: Response) => {
  const agent = agentRegistry.getAgentById(req.params.agentId);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  res.json(agent);
});

// Check agent health
agentRouter.get('/:agentId/health', async (req: Request, res: Response) => {
  const agent = agentRegistry.getAgentById(req.params.agentId);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }

  try {
    const response = await axios.get(`${agent.endpoint}/health`, { timeout: 5000 });
    res.json({ agentId: agent.id, status: 'online', details: response.data });
  } catch {
    res.json({ agentId: agent.id, status: 'offline' });
  }
});
