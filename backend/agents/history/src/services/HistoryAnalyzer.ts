import axios from 'axios';

interface HistoryResult {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
  summary: string;
  details: Record<string, any>;
  scanTime: number;
}

export class HistoryAnalyzer {
  private readonly STACKS_API = process.env.STACKS_API_URL || 'https://api.hiro.so';

  async analyze(creatorAddress: string): Promise<HistoryResult> {
    const startTime = Date.now();

    try {
      // Resolve tx hashes to addresses
      const resolvedAddress = await this.resolveAddress(creatorAddress);
      const walletData = await this.fetchWalletHistory(resolvedAddress);
      const { score, issues } = this.evaluateHistory(walletData);
      const riskLevel = this.determineRiskLevel(score);
      const scanTime = Date.now() - startTime;

      return {
        score,
        riskLevel,
        issues: issues.map(i => i.description),
        summary: this.generateSummary(score, riskLevel, walletData, issues),
        details: { ...walletData, checksPerformed: 5, resolvedFrom: creatorAddress !== resolvedAddress ? creatorAddress : undefined },
        scanTime
      };
    } catch (error: any) {
      console.error('❌ History fetch failed:', error.message);
      throw new Error(`History analysis failed for ${creatorAddress}: ${error.message}`);
    }
  }

  private async resolveAddress(address: string): Promise<string> {
    const headers: Record<string, string> = {};
    if (process.env.HIRO_API_KEY) headers['x-hiro-api-key'] = process.env.HIRO_API_KEY;

    if (address.startsWith('0x') && address.length === 66) {
      console.log(`🔍 Resolving tx hash: ${address}`);
      const txRes = await axios.get(`${this.STACKS_API}/extended/v1/tx/${address}`, { timeout: 10000, headers });
      // For history, we want the sender (creator) address
      const sender = txRes.data?.sender_address;
      if (sender) {
        console.log(`✅ Resolved to creator: ${sender}`);
        return sender;
      }
      throw new Error(`Cannot resolve tx ${address} to a creator address`);
    }
    return address;
  }

  private async fetchWalletHistory(address: string): Promise<Record<string, any>> {
    const headers: Record<string, string> = {};
    if (process.env.HIRO_API_KEY) {
      headers['x-hiro-api-key'] = process.env.HIRO_API_KEY;
    }

    const parts = address.split('.');
    const principal = parts[0];

    const [balanceRes, txRes, contractsRes] = await Promise.all([
      axios.get(`${this.STACKS_API}/extended/v1/address/${principal}/balances`, {
        timeout: 10000, headers
      }),
      axios.get(`${this.STACKS_API}/extended/v1/address/${principal}/transactions?limit=50`, {
        timeout: 10000, headers
      }),
      axios.get(`${this.STACKS_API}/extended/v1/address/${principal}/assets`, {
        timeout: 10000, headers
      }).catch(() => null)  // assets endpoint may not exist for all addresses
    ]);

    const stxBalance = parseInt(balanceRes?.data?.stx?.balance || '0');
    const txs = txRes?.data?.results || [];
    const totalTxCount = txRes?.data?.total || 0;
    console.log(`📜 HistoryAgent REAL data: balance=${stxBalance}, txCount=${totalTxCount}, recentTxs=${txs.length} for ${principal}`);
    
    // Analyze transaction patterns
    const contractDeployments = txs.filter((tx: any) => tx.tx_type === 'smart_contract');
    const tokenTransfers = txs.filter((tx: any) => tx.tx_type === 'token_transfer');
    
    // Check wallet age from oldest transaction
    const oldestTx = txs.length > 0 ? txs[txs.length - 1] : null;
    const walletAge = oldestTx?.burn_block_time 
      ? Math.floor((Date.now() / 1000 - oldestTx.burn_block_time) / 86400) 
      : 0;

    return {
      principal,
      stxBalance,
      totalTxCount,
      contractDeployments: contractDeployments.length,
      tokenTransfers: tokenTransfers.length,
      walletAgeDays: walletAge,
      recentTxCount: txs.length,
      hasMultipleContracts: contractDeployments.length > 1,
      assetCount: contractsRes?.data?.results?.length || 0,
      dataSource: 'hiro-api'
    };
  }

  private evaluateHistory(data: Record<string, any>): { score: number; issues: Array<{severity: string; description: string}> } {
    const issues: Array<{severity: string; description: string}> = [];
    let score = 85;

    // Wallet age check
    if (data.walletAgeDays < 7) {
      issues.push({ severity: 'high', description: 'Wallet created less than 7 days ago - very new account' });
      score -= 25;
    } else if (data.walletAgeDays < 30) {
      issues.push({ severity: 'medium', description: 'Wallet is less than 30 days old' });
      score -= 10;
    }

    // Transaction history check
    if (data.totalTxCount < 5) {
      issues.push({ severity: 'high', description: 'Very minimal transaction history' });
      score -= 20;
    } else if (data.totalTxCount < 20) {
      issues.push({ severity: 'medium', description: 'Limited transaction history' });
      score -= 10;
    }

    // Multiple contract deployments (potential serial deployer)
    if (data.contractDeployments > 5) {
      issues.push({ severity: 'high', description: 'Creator has deployed many contracts - potential serial token launcher' });
      score -= 20;
    } else if (data.contractDeployments > 2) {
      issues.push({ severity: 'medium', description: 'Multiple contract deployments detected' });
      score -= 10;
    }

    // Low STX balance
    if (data.stxBalance < 100000) { // Less than 0.1 STX
      issues.push({ severity: 'medium', description: 'Creator wallet has very low STX balance' });
      score -= 10;
    }

    // Large outbound transfers (possible fund draining)
    if (data.tokenTransfers > data.totalTxCount * 0.7) {
      issues.push({ severity: 'high', description: 'High ratio of token transfers - possible fund movement' });
      score -= 15;
    }

    return { score: Math.max(0, Math.min(100, score)), issues };
  }

  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 75) return 'LOW';
    if (score >= 55) return 'MEDIUM';
    if (score >= 35) return 'HIGH';
    return 'CRITICAL';
  }

  private generateSummary(score: number, riskLevel: string, data: Record<string, any>, issues: Array<{description: string}>): string {
    const age = data.walletAgeDays || 0;
    const txCount = data.totalTxCount || 0;
    
    if (issues.length === 0) {
      return `Creator wallet analysis: ${age} days old, ${txCount} transactions. Score: ${score}/100. No suspicious patterns detected.`;
    }
    return `Creator history analysis (Risk: ${riskLevel}): Wallet ${age} days old with ${txCount} transactions. Score: ${score}/100. ${issues[0].description}.`;
  }

}
