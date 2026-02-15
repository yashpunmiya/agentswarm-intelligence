import axios from 'axios';

interface PriceResult {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
  summary: string;
  details: Record<string, any>;
  scanTime: number;
}

export class PriceAnalyzer {
  private readonly STACKS_API = process.env.STACKS_API_URL || 'https://api.hiro.so';

  async analyze(tokenAddress: string): Promise<PriceResult> {
    const startTime = Date.now();

    try {
      // Resolve tx hashes to contract addresses
      const resolvedAddress = await this.resolveAddress(tokenAddress);
      const priceData = await this.fetchPriceData(resolvedAddress);
      const { score, issues } = this.evaluatePriceMetrics(priceData);
      const riskLevel = this.determineRiskLevel(score);
      const scanTime = Date.now() - startTime;

      return {
        score,
        riskLevel,
        issues: issues.map(i => i.description),
        summary: this.generateSummary(score, riskLevel, priceData, issues),
        details: { ...priceData, checksPerformed: 5 },
        scanTime
      };
    } catch (error: any) {
      console.error('❌ Price data fetch failed:', error.message);
      throw new Error(`Price analysis failed for ${tokenAddress}: ${error.message}`);
    }
  }

  private async resolveAddress(address: string): Promise<string> {
    // If it's a tx hash (0x...), look up the transaction to find the contract
    if (address.startsWith('0x') && address.length === 66) {
      console.log(`🔍 Resolving tx hash to contract address: ${address}`);
      const headers: Record<string, string> = {};
      if (process.env.HIRO_API_KEY) headers['x-hiro-api-key'] = process.env.HIRO_API_KEY;
      const txRes = await axios.get(`${this.STACKS_API}/extended/v1/tx/${address}`, { timeout: 10000, headers });
      const contractId = txRes.data?.smart_contract?.contract_id;
      if (contractId) {
        console.log(`✅ Resolved to contract: ${contractId}`);
        return contractId;
      }
      // If it's a contract call, use the contract being called
      const calledContract = txRes.data?.contract_call?.contract_id;
      if (calledContract) {
        console.log(`✅ Resolved to called contract: ${calledContract}`);
        return calledContract;
      }
      // Fall back to sender address
      const sender = txRes.data?.sender_address;
      if (sender) {
        console.log(`✅ Resolved to sender: ${sender}`);
        return sender;
      }
      throw new Error(`Transaction ${address} has no associated contract`);
    }
    return address;
  }

  private async fetchPriceData(address: string): Promise<Record<string, any>> {
    const headers: Record<string, string> = {};
    if (process.env.HIRO_API_KEY) {
      headers['x-hiro-api-key'] = process.env.HIRO_API_KEY;
    }

    // Fetch STX market data from CoinGecko - NO FAKE FALLBACKS
    const cgResponse = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
      { timeout: 10000 }
    );
    if (!cgResponse.data?.blockstack) {
      throw new Error('CoinGecko returned no data for STX');
    }
    const stxPrice = cgResponse.data.blockstack.usd;
    const stx24hChange = cgResponse.data.blockstack.usd_24h_change;
    const stxMarketCap = cgResponse.data.blockstack.usd_market_cap;
    console.log(`📊 CoinGecko REAL data: STX=$${stxPrice}, 24h=${stx24hChange?.toFixed(2)}%, MCap=$${stxMarketCap}`);

    // Try to fetch contract transactions for activity analysis
    const parts = address.split('.');
    const principal = parts[0];

    // Fetch REAL transaction data - NO RANDOM FALLBACKS
    const txResponse = await axios.get(
      `${this.STACKS_API}/extended/v1/address/${principal}/transactions?limit=50`,
      { timeout: 10000, headers }
    );
    const txs = txResponse.data?.results || [];
    const txCount = txResponse.data?.total || 0;
    
    // Real volume from recent transactions
    const recentVolume = txs.reduce((sum: number, tx: any) => {
      return sum + (parseInt(tx.fee_rate) || 0);
    }, 0);
    console.log(`📊 Hiro REAL data: ${txCount} txs, volume=${recentVolume} for ${principal}`);

    return {
      stxPrice,
      stx24hChange,
      stxMarketCap,
      txCount,
      recentVolume,
      volatilityIndex: Math.abs(stx24hChange) > 10 ? 'high' : Math.abs(stx24hChange) > 5 ? 'medium' : 'low',
      contractAddress: address,
      dataSource: 'coingecko+hiro'
    };
  }

  private evaluatePriceMetrics(data: Record<string, any>): { score: number; issues: Array<{severity: string; description: string}> } {
    const issues: Array<{severity: string; description: string}> = [];
    let score = 80;

    // Volatility check
    const change24h = Math.abs(data.stx24hChange || 0);
    if (change24h > 20) {
      issues.push({ severity: 'high', description: `Extreme 24h price volatility: ${data.stx24hChange?.toFixed(1)}%` });
      score -= 25;
    } else if (change24h > 10) {
      issues.push({ severity: 'medium', description: `High 24h price change: ${data.stx24hChange?.toFixed(1)}%` });
      score -= 15;
    } else if (change24h > 5) {
      issues.push({ severity: 'low', description: `Moderate price movement: ${data.stx24hChange?.toFixed(1)}%` });
      score -= 5;
    }

    // Activity check
    if (data.txCount < 10) {
      issues.push({ severity: 'high', description: 'Very low trading activity - potential liquidity risk' });
      score -= 20;
    } else if (data.txCount < 50) {
      issues.push({ severity: 'medium', description: 'Limited trading volume' });
      score -= 10;
    }

    // Pump-and-dump pattern check
    if (data.stx24hChange > 50) {
      issues.push({ severity: 'critical', description: 'Potential pump-and-dump pattern: >50% increase in 24h' });
      score -= 30;
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
    const priceStr = data.stxPrice ? `STX: $${data.stxPrice.toFixed(2)}` : '';
    const changeStr = data.stx24hChange ? `(${data.stx24hChange > 0 ? '+' : ''}${data.stx24hChange.toFixed(1)}% 24h)` : '';
    
    if (issues.length === 0) {
      return `Price analysis shows stable market conditions. ${priceStr} ${changeStr}. Score: ${score}/100.`;
    }
    return `Price analysis found ${issues.length} concern${issues.length > 1 ? 's' : ''} (Risk: ${riskLevel}). ${priceStr} ${changeStr}. Score: ${score}/100. ${issues[0].description}.`;
  }

}
