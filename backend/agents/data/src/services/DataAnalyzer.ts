import axios from 'axios';

interface DataResult {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
  summary: string;
  details: Record<string, any>;
  scanTime: number;
}

export class DataAnalyzer {
  private readonly STACKS_API = process.env.STACKS_API_URL || 'https://api.hiro.so';

  async analyze(tokenAddress: string): Promise<DataResult> {
    const startTime = Date.now();

    try {
      // Resolve tx hashes to contract addresses
      const resolvedAddress = await this.resolveAddress(tokenAddress);
      const metrics = await this.fetchOnChainMetrics(resolvedAddress);
      const { score, issues } = this.evaluateMetrics(metrics);
      const riskLevel = this.determineRiskLevel(score);
      const scanTime = Date.now() - startTime;

      return {
        score,
        riskLevel,
        issues: issues.map(i => i.description),
        summary: this.generateSummary(score, riskLevel, metrics, issues),
        details: { ...metrics, checksPerformed: 6, resolvedFrom: tokenAddress !== resolvedAddress ? tokenAddress : undefined },
        scanTime
      };
    } catch (error: any) {
      console.error('❌ On-chain data fetch failed:', error.message);
      throw new Error(`Data analysis failed for ${tokenAddress}: ${error.message}`);
    }
  }

  private async resolveAddress(address: string): Promise<string> {
    const headers: Record<string, string> = {};
    if (process.env.HIRO_API_KEY) headers['x-hiro-api-key'] = process.env.HIRO_API_KEY;

    if (address.startsWith('0x') && address.length === 66) {
      console.log(`🔍 Resolving tx hash: ${address}`);
      const txRes = await axios.get(`${this.STACKS_API}/extended/v1/tx/${address}`, { timeout: 10000, headers });
      const contractId = txRes.data?.smart_contract?.contract_id;
      if (contractId) {
        console.log(`✅ Resolved to contract: ${contractId}`);
        return contractId;
      }
      const calledContract = txRes.data?.contract_call?.contract_id;
      if (calledContract) return calledContract;
      const sender = txRes.data?.sender_address;
      if (sender) return sender;
      throw new Error(`Cannot resolve tx ${address} to a Stacks address`);
    }
    return address;
  }

  private async fetchOnChainMetrics(address: string): Promise<Record<string, any>> {
    const headers: Record<string, string> = {};
    if (process.env.HIRO_API_KEY) {
      headers['x-hiro-api-key'] = process.env.HIRO_API_KEY;
    }

    // Try to fetch token holders info
    const parts = address.split('.');
    const principal = parts[0];

    try {
      const [accountInfo, txHistory] = await Promise.all([
        axios.get(`${this.STACKS_API}/extended/v1/address/${principal}/balances`, {
          timeout: 10000, headers
        }),
        axios.get(`${this.STACKS_API}/extended/v1/address/${principal}/transactions?limit=20`, {
          timeout: 10000, headers
        })
      ]);

      const stxBalance = accountInfo?.data?.stx?.balance || '0';
      const txCount = txHistory?.data?.total || 0;
      const recentTxs = txHistory?.data?.results || [];
      console.log(`📊 DataAgent REAL data: balance=${stxBalance}, txCount=${txCount}, recentTxs=${recentTxs.length} for ${principal}`);

      return {
        stxBalance: parseInt(stxBalance),
        txCount,
        recentActivityCount: recentTxs.length,
        hasRecentActivity: recentTxs.length > 0,
        oldestTxTimestamp: recentTxs.length > 0 ? recentTxs[recentTxs.length - 1]?.burn_block_time_iso : null,
        contractAddress: address,
        dataSource: 'hiro-api'
      };
    } catch {
      throw new Error('Failed to fetch on-chain metrics');
    }
  }

  private evaluateMetrics(metrics: Record<string, any>): { score: number; issues: Array<{severity: string; description: string}> } {
    const issues: Array<{severity: string; description: string}> = [];
    let score = 100;

    // Check STX balance (low balance can indicate new/suspicious token)
    if (metrics.stxBalance < 1000000) { // Less than 1 STX
      issues.push({ severity: 'medium', description: 'Very low STX balance in contract address' });
      score -= 15;
    }

    // Check transaction count
    if (metrics.txCount < 5) {
      issues.push({ severity: 'high', description: 'Very few transactions - token may be newly created' });
      score -= 20;
    } else if (metrics.txCount < 20) {
      issues.push({ severity: 'medium', description: 'Limited transaction history' });
      score -= 10;
    }

    // Check recent activity
    if (!metrics.hasRecentActivity) {
      issues.push({ severity: 'medium', description: 'No recent on-chain activity detected' });
      score -= 10;
    }

    return { score: Math.max(0, score), issues };
  }

  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'LOW';
    if (score >= 60) return 'MEDIUM';
    if (score >= 40) return 'HIGH';
    return 'CRITICAL';
  }

  private generateSummary(score: number, riskLevel: string, metrics: Record<string, any>, issues: Array<{description: string}>): string {
    const txCount = metrics.txCount || 0;
    if (issues.length === 0) {
      return `On-chain data analysis shows healthy metrics. ${txCount} transactions recorded. Score: ${score}/100. No data anomalies detected.`;
    }
    return `Data analysis found ${issues.length} concern${issues.length > 1 ? 's' : ''} (Risk: ${riskLevel}). Score: ${score}/100. ${txCount} total transactions. ${issues[0].description}.`;
  }

}
