import axios from 'axios';

interface SecurityResult {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
  summary: string;
  details: Record<string, any>;
  scanTime: number;
}

interface VulnerabilityInfo {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation: string;
}

export class SecurityAnalyzer {
  private readonly STACKS_API = process.env.STACKS_API_URL || 'https://api.hiro.so';

  async analyze(contractAddress: string): Promise<SecurityResult> {
    const startTime = Date.now();
    
    try {
      const resolvedAddress = await this.resolveAddress(contractAddress);
      const source = await this.fetchContractSource(resolvedAddress);
      const contractMeta = this.parseContractSource(source, resolvedAddress);
      const vulnerabilities = this.runSecurityAudit(source, contractMeta);
      const score = this.calculateScore(vulnerabilities);
      const riskLevel = this.determineRiskLevel(score, vulnerabilities);
      const scanTime = Date.now() - startTime;

      console.log(`🔒 Security audit complete: ${contractMeta.name} | ${contractMeta.sourceLines} lines | ${vulnerabilities.length} issues found | Score: ${score}`);

      return {
        score,
        riskLevel,
        issues: vulnerabilities.map(v => `[${v.severity.toUpperCase()}] ${v.description}`),
        summary: this.generateDetailedSummary(score, riskLevel, vulnerabilities, contractMeta),
        details: {
          contractMeta: {
            name: contractMeta.name,
            principal: contractMeta.principal,
            tokenType: contractMeta.tokenType,
            sourceLines: contractMeta.sourceLines,
            sourceBytes: contractMeta.sourceBytes,
            publicFunctions: contractMeta.publicFunctions,
            readOnlyFunctions: contractMeta.readOnlyFunctions,
            privateFunctions: contractMeta.privateFunctions,
            dataVars: contractMeta.dataVars,
            maps: contractMeta.maps,
            constants: contractMeta.constants,
            traits: contractMeta.traits,
            sip010Compliance: Math.round(contractMeta.sip010Compliance * 100),
            sip010Functions: contractMeta.sip010Functions,
          },
          vulnerabilities: vulnerabilities.map(v => ({
            id: v.id,
            severity: v.severity,
            title: v.title,
            description: v.description,
            recommendation: v.recommendation
          })),
          auditSummary: {
            totalChecks: 12,
            passed: 12 - vulnerabilities.length,
            failed: vulnerabilities.length,
            critical: vulnerabilities.filter(v => v.severity === 'critical').length,
            high: vulnerabilities.filter(v => v.severity === 'high').length,
            medium: vulnerabilities.filter(v => v.severity === 'medium').length,
            low: vulnerabilities.filter(v => v.severity === 'low').length,
          },
          contractAddress: resolvedAddress,
          resolvedFrom: contractAddress !== resolvedAddress ? contractAddress : undefined
        },
        scanTime
      };

    } catch (error: any) {
      console.error('❌ Security analysis failed:', error.message);
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

  private runSecurityAudit(source: string, meta: any): VulnerabilityInfo[] {
    const vulns: VulnerabilityInfo[] = [];

    // 1. Unlimited minting
    if (!source.includes('max-supply') && !source.includes('mint-limit') && !source.includes('MAX-SUPPLY')) {
      vulns.push({
        id: 'SEC-001', severity: 'high',
        title: 'No Supply Cap',
        description: `No maximum supply cap detected in ${meta.name} - unlimited minting possible`,
        recommendation: 'Add a max-supply constant and enforce it in mint functions'
      });
    }

    // 2. Centralized ownership
    if ((source.includes('contract-owner') || source.includes('is-owner')) && source.includes('asserts!')) {
      vulns.push({
        id: 'SEC-002', severity: 'medium',
        title: 'Centralized Admin Control',
        description: `${meta.name} has owner-gated functions controlled by a single address`,
        recommendation: 'Consider multi-sig or DAO governance for admin functions'
      });
    }

    // 3. Pausable
    if (source.includes('is-paused') || source.includes('pause') || source.includes('frozen')) {
      vulns.push({
        id: 'SEC-003', severity: 'medium',
        title: 'Pausable Contract',
        description: `${meta.name} has pause/freeze functionality - all operations can be halted by admin`,
        recommendation: 'Ensure pause mechanism has timelock or multi-sig requirement'
      });
    }

    // 4. Reentrancy risk
    if (!source.includes('reentrancy-guard') && source.includes('contract-call?')) {
      vulns.push({
        id: 'SEC-004', severity: 'critical',
        title: 'Potential Reentrancy',
        description: `${meta.name} makes external contract calls without reentrancy guards`,
        recommendation: 'Add reentrancy guards before external contract calls'
      });
    }

    // 5. Unguarded STX transfers
    if (source.includes('stx-transfer?') && !source.includes('begin')) {
      vulns.push({
        id: 'SEC-005', severity: 'high',
        title: 'Unguarded STX Transfers',
        description: `${meta.name} contains STX transfer operations without proper sequencing`,
        recommendation: 'Wrap STX transfers in begin blocks with proper validation'
      });
    }

    // 6. Missing burn function
    const hasBurn = source.includes('burn') || source.includes('ft-burn?');
    if (meta.tokenType?.includes('Fungible') && !hasBurn) {
      vulns.push({
        id: 'SEC-006', severity: 'low',
        title: 'No Burn Mechanism',
        description: `${meta.name} fungible token has no burn function - tokens cannot be destroyed`,
        recommendation: 'Consider adding a burn function for deflationary mechanics'
      });
    }

    // 7. Hardcoded addresses
    const addrPattern = /SP[A-Z0-9]{38,}/g;
    const hardcodedAddrs = (source.match(addrPattern) || []);
    const uniqueAddrs = [...new Set(hardcodedAddrs)];
    if (uniqueAddrs.length > 2) {
      vulns.push({
        id: 'SEC-007', severity: 'low',
        title: 'Hardcoded Addresses',
        description: `${meta.name} contains ${uniqueAddrs.length} hardcoded Stacks addresses`,
        recommendation: 'Use configurable data-vars for addresses instead of hardcoding'
      });
    }

    // 8. No error codes
    if (!source.includes('err u') && !source.includes('(err ')) {
      vulns.push({
        id: 'SEC-008', severity: 'low',
        title: 'Missing Error Codes',
        description: `${meta.name} does not define typed error codes`,
        recommendation: 'Define error constants for better debugging and UX'
      });
    }

    // 9. SIP-010 compliance gaps
    if (meta.tokenType?.includes('Fungible') && meta.sip010Compliance < 1.0) {
      const missing = ['transfer', 'get-name', 'get-symbol', 'get-decimals', 'get-balance', 'get-total-supply', 'get-token-uri']
        .filter(fn => !meta.sip010Functions.includes(fn));
      vulns.push({
        id: 'SEC-009', severity: 'medium',
        title: 'Incomplete SIP-010',
        description: `${meta.name} is missing SIP-010 functions: ${missing.join(', ')}`,
        recommendation: 'Implement all SIP-010 standard functions for wallet compatibility'
      });
    }

    // 10. Unprotected mint
    if (source.includes('ft-mint?') && !source.includes('asserts!') && !source.includes('is-owner')) {
      vulns.push({
        id: 'SEC-010', severity: 'critical',
        title: 'Unprotected Mint Function',
        description: `${meta.name} has mint capability without access control`,
        recommendation: 'Add owner/admin check to mint functions'
      });
    }

    // 11. Large public surface area
    if (meta.publicFunctions.length > 15) {
      vulns.push({
        id: 'SEC-011', severity: 'info',
        title: 'Large Attack Surface',
        description: `${meta.name} exposes ${meta.publicFunctions.length} public functions - larger attack surface`,
        recommendation: 'Minimize public functions, use private helpers where possible'
      });
    }

    // 12. Missing trait implementation
    if (meta.tokenType?.includes('Fungible') && !meta.traits.some((t: string) => t.includes('sip-010'))) {
      vulns.push({
        id: 'SEC-012', severity: 'medium',
        title: 'No Trait Declaration',
        description: `${meta.name} appears to be a token but does not implement a standard trait`,
        recommendation: 'Add impl-trait for SIP-010 to enable standard wallet detection'
      });
    }

    return vulns;
  }

  private parseContractSource(source: string, address: string): any {
    const parts = address.split('.');
    const principal = parts[0];
    const name = parts.slice(1).join('.') || 'unknown';
    
    const extract = (regex: RegExp): string[] => {
      const results: string[] = [];
      let m;
      while ((m = regex.exec(source)) !== null) results.push(m[1]);
      return results;
    };

    const publicFunctions = extract(/\(define-public\s+\(([^\s)]+)/g);
    const readOnlyFunctions = extract(/\(define-read-only\s+\(([^\s)]+)/g);
    const privateFunctions = extract(/\(define-private\s+\(([^\s)]+)/g);
    const dataVars = extract(/\(define-data-var\s+([^\s)]+)/g);
    const maps = extract(/\(define-map\s+([^\s)]+)/g);
    const constants = extract(/\(define-constant\s+([^\s)]+)/g);
    const traits = extract(/\(impl-trait\s+'?([^\s)]+)/g);
    
    const sip010Fns = ['transfer', 'get-name', 'get-symbol', 'get-decimals', 'get-balance', 'get-total-supply', 'get-token-uri'];
    const allFns = [...publicFunctions, ...readOnlyFunctions];
    const sip010Functions = sip010Fns.filter(fn => allFns.includes(fn));
    
    let tokenType: string | null = null;
    if (source.includes('define-fungible-token')) tokenType = 'Fungible Token (SIP-010)';
    else if (source.includes('define-non-fungible-token')) tokenType = 'NFT (SIP-009)';
    else if (traits.some(t => t.includes('sip-010'))) tokenType = 'Fungible Token (SIP-010)';
    else if (traits.some(t => t.includes('sip-009'))) tokenType = 'NFT (SIP-009)';

    return {
      name, principal, publicFunctions, readOnlyFunctions, privateFunctions,
      dataVars, maps, constants, traits,
      sourceLines: source.split('\n').length,
      sourceBytes: source.length,
      sip010Compliance: sip010Functions.length / sip010Fns.length,
      sip010Functions, tokenType
    };
  }

  private calculateScore(vulns: VulnerabilityInfo[]): number {
    let score = 100;
    vulns.forEach(v => {
      if (v.severity === 'critical') score -= 25;
      else if (v.severity === 'high') score -= 15;
      else if (v.severity === 'medium') score -= 8;
      else if (v.severity === 'low') score -= 3;
    });
    return Math.max(0, score);
  }

  private determineRiskLevel(score: number, vulns: VulnerabilityInfo[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (vulns.some(v => v.severity === 'critical')) return 'CRITICAL';
    if (score >= 80) return 'LOW';
    if (score >= 60) return 'MEDIUM';
    if (score >= 40) return 'HIGH';
    return 'CRITICAL';
  }

  private generateDetailedSummary(score: number, riskLevel: string, vulns: VulnerabilityInfo[], meta: any): string {
    const lines: string[] = [];
    lines.push(`Security Audit of ${meta.name} (${meta.tokenType || 'Smart Contract'})`);
    lines.push(`Contract: ${meta.principal}.${meta.name} | ${meta.sourceLines} lines of Clarity code`);
    lines.push(`Score: ${score}/100 | Risk: ${riskLevel} | ${vulns.length} issue${vulns.length !== 1 ? 's' : ''} found across 12 checks`);
    
    if (meta.sip010Compliance < 1 && meta.tokenType?.includes('Fungible')) {
      lines.push(`SIP-010 Compliance: ${Math.round(meta.sip010Compliance * 100)}% (${meta.sip010Functions.join(', ')})`);
    }
    
    lines.push(`Public surface: ${meta.publicFunctions.length} public, ${meta.readOnlyFunctions.length} read-only, ${meta.privateFunctions.length} private functions`);
    
    if (vulns.length > 0) {
      lines.push(`Key findings: ${vulns.slice(0, 3).map(v => `[${v.severity.toUpperCase()}] ${v.title}`).join(' | ')}`);
    }
    
    return lines.join('. ');
  }

}
