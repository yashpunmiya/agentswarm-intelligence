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
        issues: issues.map(i => `[${i.severity.toUpperCase()}] ${i.description}`),
        summary: this.generateSummary(score, riskLevel, walletData, issues),
        details: {
          walletProfile: {
            principal: walletData.principal,
            ageDays: walletData.walletAgeDays,
            firstSeen: walletData.firstSeenDate,
            lastActive: walletData.lastActiveDate,
            stxBalance: walletData.stxBalanceSTX,
            fungibleTokens: walletData.fungibleTokensHeld,
            nftCollections: walletData.nftCollections,
          },
          activityBreakdown: {
            totalTransactions: walletData.totalTxCount,
            contractDeployments: walletData.contractDeployments,
            contractCalls: walletData.contractCalls,
            tokenTransfers: walletData.tokenTransfers,
            failedTransactions: walletData.failedTransactions,
            failureRate: `${walletData.failureRate}%`,
          },
          deployedContracts: walletData.deployedContracts,
          networkAnalysis: {
            uniqueTransferPartners: walletData.uniqueTransferPartners,
            uniqueContractsInteracted: walletData.uniqueContractsInteracted,
            calledContracts: walletData.calledContracts,
            totalSTXSent: walletData.totalSTXSent,
            totalSTXReceived: walletData.totalSTXReceived,
          },
          checksPerformed: 8,
          resolvedFrom: creatorAddress !== resolvedAddress ? creatorAddress : undefined,
          contractAddress: resolvedAddress,
        },
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
      }).catch(() => null)
    ]);

    const stxBalance = parseInt(balanceRes?.data?.stx?.balance || '0');
    const txs = txRes?.data?.results || [];
    const totalTxCount = txRes?.data?.total || 0;
    
    // Detailed transaction categorization
    const contractDeployments = txs.filter((tx: any) => tx.tx_type === 'smart_contract');
    const tokenTransfers = txs.filter((tx: any) => tx.tx_type === 'token_transfer');
    const contractCalls = txs.filter((tx: any) => tx.tx_type === 'contract_call');
    const failedTxs = txs.filter((tx: any) => tx.tx_status === 'abort_by_response' || tx.tx_status === 'abort_by_post_condition');
    
    // Build deployment timeline
    const deployedContracts = contractDeployments.map((tx: any) => ({
      name: tx.smart_contract?.contract_id?.split('.').pop() || 'unknown',
      contractId: tx.smart_contract?.contract_id || '',
      date: tx.burn_block_time_iso || '',
      txId: tx.tx_id || ''
    }));
    
    // Analyze transfer patterns
    let totalSent = 0;
    let totalReceived = 0;
    const transferPartners = new Set<string>();
    tokenTransfers.forEach((tx: any) => {
      const amount = parseInt(tx.token_transfer?.amount || '0');
      if (tx.sender_address === principal) {
        totalSent += amount;
      } else {
        totalReceived += amount;
      }
      const partner = tx.sender_address === principal ? tx.token_transfer?.recipient_address : tx.sender_address;
      if (partner) transferPartners.add(partner);
    });
    
    // Wallet age
    const oldestTx = txs.length > 0 ? txs[txs.length - 1] : null;
    const walletAge = oldestTx?.burn_block_time 
      ? Math.floor((Date.now() / 1000 - oldestTx.burn_block_time) / 86400) 
      : 0;
    
    // First seen date
    const firstSeenDate = oldestTx?.burn_block_time_iso || null;
    const lastActiveDate = txs[0]?.burn_block_time_iso || null;
    
    // Unique contracts called
    const calledContracts = new Set<string>();
    contractCalls.forEach((tx: any) => {
      if (tx.contract_call?.contract_id) calledContracts.add(tx.contract_call.contract_id);
    });
    
    // Fungible token count
    const ftCount = Object.keys(balanceRes?.data?.fungible_tokens || {}).length;
    const nftCount = Object.keys(balanceRes?.data?.non_fungible_tokens || {}).length;

    console.log(`📜 HistoryAgent: age=${walletAge}d, txs=${totalTxCount}, deploys=${contractDeployments.length}, partners=${transferPartners.size}`);

    return {
      principal,
      stxBalance,
      stxBalanceSTX: (stxBalance / 1_000_000).toFixed(6),
      totalTxCount,
      walletAgeDays: walletAge,
      firstSeenDate,
      lastActiveDate,
      contractDeployments: contractDeployments.length,
      deployedContracts: deployedContracts.slice(0, 10),
      tokenTransfers: tokenTransfers.length,
      contractCalls: contractCalls.length,
      failedTransactions: failedTxs.length,
      failureRate: txs.length > 0 ? Math.round((failedTxs.length / txs.length) * 100) : 0,
      totalSTXSent: (totalSent / 1_000_000).toFixed(6),
      totalSTXReceived: (totalReceived / 1_000_000).toFixed(6),
      uniqueTransferPartners: transferPartners.size,
      uniqueContractsInteracted: calledContracts.size,
      calledContracts: [...calledContracts].slice(0, 10),
      fungibleTokensHeld: ftCount,
      nftCollections: nftCount,
      recentTxCount: txs.length,
      hasMultipleContracts: contractDeployments.length > 1,
      assetCount: contractsRes?.data?.results?.length || 0,
      dataSource: 'hiro-api'
    };
  }

  private evaluateHistory(data: Record<string, any>): { score: number; issues: Array<{severity: string; description: string}> } {
    const issues: Array<{severity: string; description: string}> = [];
    let score = 85;

    if (data.walletAgeDays < 7) {
      issues.push({ severity: 'high', description: `Creator wallet only ${data.walletAgeDays} days old - extremely new, first seen ${data.firstSeenDate?.split('T')[0] || 'recently'}` });
      score -= 25;
    } else if (data.walletAgeDays < 30) {
      issues.push({ severity: 'medium', description: `Creator wallet is ${data.walletAgeDays} days old (created ${data.firstSeenDate?.split('T')[0] || 'recently'})` });
      score -= 10;
    }

    if (data.totalTxCount < 5) {
      issues.push({ severity: 'high', description: `Minimal history: only ${data.totalTxCount} transactions ever - unproven creator` });
      score -= 20;
    } else if (data.totalTxCount < 20) {
      issues.push({ severity: 'medium', description: `Light history: ${data.totalTxCount} total transactions` });
      score -= 10;
    }

    if (data.contractDeployments > 5) {
      issues.push({ severity: 'high', description: `Serial deployer: ${data.contractDeployments} contracts deployed (${data.deployedContracts.map((c: any) => c.name).join(', ')}) - potential token factory` });
      score -= 20;
    } else if (data.contractDeployments > 2) {
      issues.push({ severity: 'medium', description: `Multiple deployments: ${data.contractDeployments} contracts (${data.deployedContracts.map((c: any) => c.name).slice(0, 3).join(', ')})` });
      score -= 10;
    }

    if (data.stxBalance < 100000) {
      issues.push({ severity: 'medium', description: `Creator holds only ${data.stxBalanceSTX} STX - low commitment to ecosystem` });
      score -= 10;
    }

    if (data.failureRate > 30) {
      issues.push({ severity: 'medium', description: `High failure rate: ${data.failureRate}% of recent transactions failed` });
      score -= 10;
    }

    if (data.tokenTransfers > data.totalTxCount * 0.7 && data.totalTxCount > 10) {
      issues.push({ severity: 'high', description: `${Math.round(data.tokenTransfers / data.recentTxCount * 100)}% transfer ratio - possible fund extraction pattern` });
      score -= 15;
    }

    if (data.uniqueTransferPartners <= 2 && data.tokenTransfers > 5) {
      issues.push({ severity: 'medium', description: `Only ${data.uniqueTransferPartners} transfer partners - limited network, possible self-dealing` });
      score -= 10;
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
    lines.push(`Creator History Analysis for ${data.principal}`);
    lines.push(`Wallet age: ${data.walletAgeDays} days (since ${data.firstSeenDate?.split('T')[0] || 'unknown'}) | Last active: ${data.lastActiveDate?.split('T')[0] || 'unknown'}`);
    lines.push(`Activity: ${data.totalTxCount.toLocaleString()} txs total | ${data.contractDeployments} contract deploys | ${data.contractCalls} contract calls | ${data.tokenTransfers} transfers`);
    lines.push(`Network: ${data.uniqueTransferPartners} transfer partners | ${data.uniqueContractsInteracted} contracts interacted with`);
    lines.push(`Holdings: ${data.stxBalanceSTX} STX | ${data.fungibleTokensHeld} tokens | ${data.nftCollections} NFT collections`);
    if (data.deployedContracts.length > 0) {
      lines.push(`Deployed: ${data.deployedContracts.map((c: any) => c.name).join(', ')}`);
    }
    lines.push(`Score: ${score}/100 (${riskLevel}). ${issues.length > 0 ? issues[0].description : 'No suspicious patterns detected'}`);
    return lines.join('. ');
  }

}
