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

    // Fetch extended STX market data from CoinGecko
    const cgResponse = await axios.get(
      'https://api.coingecko.com/api/v3/coins/blockstack?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false',
      { timeout: 10000 }
    );
    if (!cgResponse.data) throw new Error('CoinGecko returned no data for STX');

    const md = cgResponse.data.market_data;
    const stxPrice = md?.current_price?.usd || 0;
    const stx24hChange = md?.price_change_percentage_24h || 0;
    const stx7dChange = md?.price_change_percentage_7d || 0;
    const stx30dChange = md?.price_change_percentage_30d || 0;
    const stxMarketCap = md?.market_cap?.usd || 0;
    const stxVolume24h = md?.total_volume?.usd || 0;
    const stxCirculatingSupply = md?.circulating_supply || 0;
    const stxTotalSupply = md?.total_supply || 0;
    const stxATH = md?.ath?.usd || 0;
    const stxATHDate = md?.ath_date?.usd || '';
    const stxATHChange = md?.ath_change_percentage?.usd || 0;

    console.log(`📊 CoinGecko: STX=$${stxPrice} | 24h=${stx24hChange?.toFixed(2)}% | 7d=${stx7dChange?.toFixed(2)}% | MCap=$${(stxMarketCap / 1e9).toFixed(2)}B`);

    // Fetch contract-specific transaction data
    const parts = address.split('.');
    const principal = parts[0];
    const contractName = parts.length > 1 ? parts.slice(1).join('.') : null;

    const txResponse = await axios.get(
      `${this.STACKS_API}/extended/v1/address/${principal}/transactions?limit=50`,
      { timeout: 10000, headers }
    );
    const txs = txResponse.data?.results || [];
    const txCount = txResponse.data?.total || 0;
    
    // Analyze fee patterns and transaction activity
    let totalFees = 0;
    let maxFee = 0;
    let contractCallCount = 0;
    const feeList: number[] = [];
    
    txs.forEach((tx: any) => {
      const fee = parseInt(tx.fee_rate || '0');
      totalFees += fee;
      feeList.push(fee);
      if (fee > maxFee) maxFee = fee;
      if (tx.tx_type === 'contract_call') contractCallCount++;
    });
    
    const avgFee = txs.length > 0 ? Math.round(totalFees / txs.length) : 0;
    
    // Calculate activity ratio (contract calls vs total)
    const activityRatio = txs.length > 0 ? Math.round((contractCallCount / txs.length) * 100) : 0;

    console.log(`📊 Hiro: ${txCount} txs, ${contractCallCount} calls, avg fee ${avgFee} for ${principal}`);

    return {
      stxPrice,
      stx24hChange,
      stx7dChange,
      stx30dChange,
      stxMarketCap,
      stxVolume24h,
      stxCirculatingSupply,
      stxTotalSupply,
      stxATH,
      stxATHDate: stxATHDate ? new Date(stxATHDate).toISOString().split('T')[0] : null,
      stxATHChange,
      txCount,
      contractCallCount,
      activityRatio,
      totalFeesSpent: totalFees,
      avgFeePerTx: avgFee,
      maxFee,
      volatilityIndex: Math.abs(stx24hChange) > 15 ? 'extreme' : Math.abs(stx24hChange) > 10 ? 'high' : Math.abs(stx24hChange) > 5 ? 'moderate' : 'low',
      priceFromATH: `${stxATHChange?.toFixed(1)}%`,
      contractAddress: address,
      contractName: contractName,
      dataSource: 'coingecko+hiro'
    };
  }

  private evaluatePriceMetrics(data: Record<string, any>): { score: number; issues: Array<{severity: string; description: string}> } {
    const issues: Array<{severity: string; description: string}> = [];
    let score = 80;

    const change24h = Math.abs(data.stx24hChange || 0);
    if (change24h > 20) {
      issues.push({ severity: 'high', description: `Extreme 24h volatility: ${data.stx24hChange?.toFixed(1)}% - high risk of sudden price swings` });
      score -= 25;
    } else if (change24h > 10) {
      issues.push({ severity: 'medium', description: `Elevated 24h movement: ${data.stx24hChange?.toFixed(1)}% indicates increased market uncertainty` });
      score -= 15;
    } else if (change24h > 5) {
      issues.push({ severity: 'low', description: `Moderate 24h change: ${data.stx24hChange?.toFixed(1)}%` });
      score -= 5;
    }

    const change7d = Math.abs(data.stx7dChange || 0);
    if (change7d > 30) {
      issues.push({ severity: 'high', description: `Severe 7-day swing: ${data.stx7dChange?.toFixed(1)}% - potential manipulation or major event` });
      score -= 15;
    }

    if (data.txCount < 10) {
      issues.push({ severity: 'high', description: `Extremely low activity: only ${data.txCount} transactions - potential liquidity trap` });
      score -= 20;
    } else if (data.txCount < 50) {
      issues.push({ severity: 'medium', description: `Limited activity: ${data.txCount} transactions - thin market` });
      score -= 10;
    }

    if (data.stx24hChange > 50) {
      issues.push({ severity: 'critical', description: `Pump pattern detected: +${data.stx24hChange?.toFixed(1)}% in 24h - classic pump-and-dump indicator` });
      score -= 30;
    }

    if (data.stxATHChange < -90) {
      issues.push({ severity: 'medium', description: `${data.stxATHChange?.toFixed(1)}% from ATH ($${data.stxATH?.toFixed(2)}) - deep decline territory` });
      score -= 5;
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
    const lines: string[] = [];
    lines.push(`Market Analysis for ${data.contractName || data.contractAddress}`);
    lines.push(`STX Price: $${data.stxPrice?.toFixed(4)} | 24h: ${data.stx24hChange > 0 ? '+' : ''}${data.stx24hChange?.toFixed(2)}% | 7d: ${data.stx7dChange > 0 ? '+' : ''}${data.stx7dChange?.toFixed(2)}% | 30d: ${data.stx30dChange > 0 ? '+' : ''}${data.stx30dChange?.toFixed(2)}%`);
    lines.push(`Market Cap: $${(data.stxMarketCap / 1e6).toFixed(1)}M | 24h Volume: $${(data.stxVolume24h / 1e6).toFixed(1)}M | ATH: $${data.stxATH?.toFixed(2)} (${data.priceFromATH})`);
    lines.push(`On-chain: ${data.txCount.toLocaleString()} txs, ${data.contractCallCount} contract calls, avg fee ${data.avgFeePerTx} microSTX`);
    lines.push(`Volatility: ${data.volatilityIndex} | Score: ${score}/100 (${riskLevel})`);
    if (issues.length > 0) {
      lines.push(`Concerns: ${issues[0].description}`);
    }
    return lines.join('. ');
  }

}
