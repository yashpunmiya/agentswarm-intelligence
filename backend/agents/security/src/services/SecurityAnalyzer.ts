import axios from 'axios';

interface SecurityResult {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
  summary: string;
  details: Record<string, any>;
  scanTime: number;
}

export class SecurityAnalyzer {
  private readonly STACKS_API = process.env.STACKS_API_URL || 'https://api.hiro.so';

  async analyze(contractAddress: string): Promise<SecurityResult> {
    const startTime = Date.now();
    
    try {
      // Resolve tx hashes to contract addresses
      const resolvedAddress = await this.resolveAddress(contractAddress);
      const contractData = await this.fetchContractSource(resolvedAddress);
      const issues = this.runSecurityChecks(contractData);
      const score = this.calculateScore(issues);
      const riskLevel = this.determineRiskLevel(score, issues);
      const scanTime = Date.now() - startTime;

      return {
        score,
        riskLevel,
        issues: issues.map(i => i.description),
        summary: this.generateSummary(score, riskLevel, issues),
        details: {
          checksPerformed: 5,
          criticalIssues: issues.filter(i => i.severity === 'critical').length,
          highIssues: issues.filter(i => i.severity === 'high').length,
          mediumIssues: issues.filter(i => i.severity === 'medium').length,
          contractAddress: resolvedAddress,
          resolvedFrom: contractAddress !== resolvedAddress ? contractAddress : undefined
        },
        scanTime
      };

    } catch (error: any) {
      console.error('❌ Contract fetch failed:', error.message);
      throw new Error(`Security analysis failed for ${contractAddress}: ${error.message}`);
    }
  }

  private async resolveAddress(address: string): Promise<string> {
    const headers: Record<string, string> = {};
    if (process.env.HIRO_API_KEY) headers['x-hiro-api-key'] = process.env.HIRO_API_KEY;

    // If it's a tx hash (0x...), look up the transaction to find the contract
    if (address.startsWith('0x') && address.length === 66) {
      console.log(`🔍 Resolving tx hash to contract: ${address}`);
      const txRes = await axios.get(`${this.STACKS_API}/extended/v1/tx/${address}`, { timeout: 10000, headers });
      const contractId = txRes.data?.smart_contract?.contract_id;
      if (contractId) {
        console.log(`✅ Resolved to contract: ${contractId}`);
        return contractId;
      }
      const calledContract = txRes.data?.contract_call?.contract_id;
      if (calledContract) {
        console.log(`✅ Resolved to called contract: ${calledContract}`);
        return calledContract;
      }
      throw new Error(`Transaction ${address} has no associated smart contract for security analysis`);
    }
    return address;
  }

  private async fetchContractSource(address: string): Promise<string> {
    // Parse "PRINCIPAL.contract-name" format
    const parts = address.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid contract address format. Expected: PRINCIPAL.contract-name');
    }
    const principal = parts[0];
    const contractName = parts.slice(1).join('.');

    const response = await axios.get(
      `${this.STACKS_API}/v2/contracts/source/${principal}/${contractName}`,
      { 
        timeout: 10000,
        headers: process.env.HIRO_API_KEY 
          ? { 'x-hiro-api-key': process.env.HIRO_API_KEY }
          : {}
      }
    );
    return response.data.source;
  }

  private runSecurityChecks(source: string): Array<{severity: string; description: string; pattern: string}> {
    const issues: Array<{severity: string; description: string; pattern: string}> = [];

    if (!source.includes('max-supply') && !source.includes('mint-limit')) {
      issues.push({
        severity: 'high',
        description: 'No maximum supply cap detected - unlimited minting possible',
        pattern: 'unlimited-mint'
      });
    }

    if ((source.includes('contract-owner') || source.includes('tx-sender')) && 
        source.includes('asserts!')) {
      issues.push({
        severity: 'medium',
        description: 'Centralized admin control detected - single point of failure',
        pattern: 'centralized-control'
      });
    }

    if (source.includes('is-paused') || source.includes('pause')) {
      issues.push({
        severity: 'medium',
        description: 'Contract has pausable functions - operations can be halted',
        pattern: 'pausable'
      });
    }

    if (!source.includes('reentrancy-guard') && source.includes('contract-call?')) {
      issues.push({
        severity: 'critical',
        description: 'Potential reentrancy vulnerability - no guard on external calls',
        pattern: 'reentrancy'
      });
    }

    if (source.includes('stx-transfer?') && !source.includes('begin')) {
      issues.push({
        severity: 'high',
        description: 'Unguarded STX transfers detected',
        pattern: 'unguarded-transfer'
      });
    }

    return issues;
  }

  private calculateScore(issues: Array<{severity: string}>): number {
    let score = 100;
    
    issues.forEach(issue => {
      if (issue.severity === 'critical') score -= 30;
      else if (issue.severity === 'high') score -= 20;
      else if (issue.severity === 'medium') score -= 10;
      else if (issue.severity === 'low') score -= 5;
    });

    return Math.max(0, score);
  }

  private determineRiskLevel(score: number, issues: Array<{severity: string}>): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const hasCritical = issues.some(i => i.severity === 'critical');
    if (hasCritical) return 'CRITICAL';
    if (score >= 80) return 'LOW';
    if (score >= 60) return 'MEDIUM';
    if (score >= 40) return 'HIGH';
    return 'CRITICAL';
  }

  private generateSummary(score: number, riskLevel: string, issues: Array<{description: string}>): string {
    const issueCount = issues.length;
    
    if (issueCount === 0) {
      return `Contract passed all security checks with a perfect score of ${score}/100. No vulnerabilities detected.`;
    }

    return `Security analysis reveals ${issueCount} potential issue${issueCount > 1 ? 's' : ''} (Risk: ${riskLevel}). Score: ${score}/100. Key concerns: ${issues.slice(0, 2).map(i => i.description).join('; ')}.`;
  }

}
