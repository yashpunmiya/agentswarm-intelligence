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

    const parts = address.split('.');
    const principal = parts[0];
    const contractName = parts.length > 1 ? parts.slice(1).join('.') : null;

    const [accountInfo, txHistory, nftHoldings] = await Promise.all([
      axios.get(`${this.STACKS_API}/extended/v1/address/${principal}/balances`, {
        timeout: 10000, headers
      }),
      axios.get(`${this.STACKS_API}/extended/v1/address/${principal}/transactions?limit=50`, {
        timeout: 10000, headers
      }),
      axios.get(`${this.STACKS_API}/extended/v1/address/${principal}/assets`, {
        timeout: 10000, headers
      }).catch(() => null)
    ]);

    const stxBalance = parseInt(accountInfo?.data?.stx?.balance || '0');
    const txs = txHistory?.data?.results || [];
    const txCount = txHistory?.data?.total || 0;
    
    // Analyze transaction type distribution
    const txTypes: Record<string, number> = {};
    const uniqueAddresses = new Set<string>();
    let totalFees = 0;
    let contractCalls = 0;
    let tokenTransfers = 0;
    let smartContractDeploys = 0;
    
    txs.forEach((tx: any) => {
      txTypes[tx.tx_type] = (txTypes[tx.tx_type] || 0) + 1;
      totalFees += parseInt(tx.fee_rate || '0');
      if (tx.sender_address) uniqueAddresses.add(tx.sender_address);
      if (tx.token_transfer?.recipient_address) uniqueAddresses.add(tx.token_transfer.recipient_address);
      if (tx.tx_type === 'contract_call') contractCalls++;
      if (tx.tx_type === 'token_transfer') tokenTransfers++;
      if (tx.tx_type === 'smart_contract') smartContractDeploys++;
    });

    // Calculate activity velocity
    const oldestTx = txs.length > 0 ? txs[txs.length - 1] : null;
    const newestTx = txs.length > 0 ? txs[0] : null;
    const timeSpanDays = oldestTx?.burn_block_time && newestTx?.burn_block_time
      ? Math.max(1, (newestTx.burn_block_time - oldestTx.burn_block_time) / 86400)
      : 1;
    const txVelocity = Math.round((txs.length / timeSpanDays) * 100) / 100;

    // Get fungible token holdings count
    const ftCount = Object.keys(accountInfo?.data?.fungible_tokens || {}).length;
    const nftCount = Object.keys(accountInfo?.data?.non_fungible_tokens || {}).length;
    const assetCount = nftHoldings?.data?.results?.length || 0;

    console.log(`📊 DataAgent: balance=${stxBalance}, txs=${txCount}, unique=${uniqueAddresses.size}, velocity=${txVelocity}/day for ${principal}`);

    return {
      stxBalance,
      stxBalanceSTX: (stxBalance / 1_000_000).toFixed(6),
      txCount,
      recentTxSample: txs.length,
      recentActivityCount: txs.length,
      hasRecentActivity: txs.length > 0,
      oldestTxTimestamp: oldestTx?.burn_block_time_iso || null,
      newestTxTimestamp: newestTx?.burn_block_time_iso || null,
      txTypeDistribution: txTypes,
      uniqueInteractors: uniqueAddresses.size,
      totalFeesSpent: totalFees,
      avgFeePerTx: txs.length > 0 ? Math.round(totalFees / txs.length) : 0,
      contractCalls,
      tokenTransfers,
      smartContractDeploys,
      txVelocityPerDay: txVelocity,
      fungibleTokensHeld: ftCount,
      nftCollections: nftCount,
      totalAssets: assetCount,
      contractAddress: address,
      contractName: contractName,
      dataSource: 'hiro-api'
    };
  }

  private evaluateMetrics(metrics: Record<string, any>): { score: number; issues: Array<{severity: string; description: string}> } {
    const issues: Array<{severity: string; description: string}> = [];
    let score = 100;

    if (metrics.stxBalance < 1000000) {
      issues.push({ severity: 'medium', description: `Low STX balance (${metrics.stxBalanceSTX} STX) - may indicate inactive or drained contract` });
      score -= 15;
    }

    if (metrics.txCount < 5) {
      issues.push({ severity: 'high', description: `Only ${metrics.txCount} transactions - token is extremely new or unused` });
      score -= 20;
    } else if (metrics.txCount < 20) {
      issues.push({ severity: 'medium', description: `Only ${metrics.txCount} total transactions - limited adoption` });
      score -= 10;
    }

    if (!metrics.hasRecentActivity) {
      issues.push({ severity: 'medium', description: 'No recent on-chain activity detected - token may be abandoned' });
      score -= 10;
    }

    if (metrics.uniqueInteractors < 3) {
      issues.push({ severity: 'high', description: `Only ${metrics.uniqueInteractors} unique addresses interacted - possible single-user operation` });
      score -= 15;
    }

    if (metrics.tokenTransfers > metrics.txCount * 0.8 && metrics.txCount > 10) {
      issues.push({ severity: 'medium', description: `${Math.round(metrics.tokenTransfers / metrics.txCount * 100)}% of transactions are token transfers - unusual pattern` });
      score -= 10;
    }

    if (metrics.txVelocityPerDay > 100) {
      issues.push({ severity: 'low', description: `High tx velocity (${metrics.txVelocityPerDay}/day) - may indicate automated trading` });
      score -= 5;
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
    const lines: string[] = [];
    lines.push(`On-Chain Analysis of ${metrics.contractName || metrics.contractAddress}`);
    lines.push(`${metrics.txCount.toLocaleString()} total transactions from ${metrics.uniqueInteractors} unique addresses`);
    lines.push(`Balance: ${metrics.stxBalanceSTX} STX | Velocity: ${metrics.txVelocityPerDay} tx/day`);
    lines.push(`Activity: ${metrics.contractCalls} contract calls, ${metrics.tokenTransfers} transfers, ${metrics.smartContractDeploys} deploys`);
    if (metrics.fungibleTokensHeld > 0 || metrics.nftCollections > 0) {
      lines.push(`Holdings: ${metrics.fungibleTokensHeld} fungible tokens, ${metrics.nftCollections} NFT collections`);
    }
    lines.push(`Score: ${score}/100 (${riskLevel}). ${issues.length > 0 ? issues[0].description : 'No anomalies detected'}`);
    return lines.join('. ');
  }

}
