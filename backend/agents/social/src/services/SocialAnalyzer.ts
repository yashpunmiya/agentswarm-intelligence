import axios from 'axios';

interface SocialResult {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
  summary: string;
  details: Record<string, any>;
  scanTime: number;
}

export class SocialAnalyzer {
  private readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  async analyze(tokenIdentifier: string): Promise<SocialResult> {
    const startTime = Date.now();

    try {
      // Require AI-powered sentiment analysis via Gemini
      if (!this.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured - cannot perform social sentiment analysis');
      }
      return await this.aiSentimentAnalysis(tokenIdentifier, startTime);
    } catch (error: any) {
      console.error('❌ AI sentiment analysis failed:', error.message);
      throw new Error(`Social sentiment analysis failed: ${error.message}`);
    }
  }

  private async aiSentimentAnalysis(token: string, startTime: number): Promise<SocialResult> {
    // Resolve contract name for better context  
    let contractName = token;
    let contractContext = '';
    try {
      if (token.startsWith('0x') && token.length === 66) {
        const headers: Record<string, string> = {};
        if (process.env.HIRO_API_KEY) headers['x-hiro-api-key'] = process.env.HIRO_API_KEY;
        const txRes = await axios.get(`https://api.hiro.so/extended/v1/tx/${token}`, { timeout: 8000, headers });
        contractName = txRes.data?.smart_contract?.contract_id || txRes.data?.contract_call?.contract_id || token;
      }
      if (contractName.includes('.')) {
        const parts = contractName.split('.');
        contractContext = `Contract name: "${parts.slice(1).join('.')}", deployed by ${parts[0]}`;
      }
    } catch {}
    
    const prompt = `You are a blockchain security analyst specializing in Stacks/Bitcoin ecosystem tokens. Analyze the following token contract and provide a detailed risk assessment:

Token: "${contractName}"
${contractContext}
Blockchain: Stacks (Bitcoin L2)

Provide a DETAILED JSON response with these exact fields:
{
  "sentimentScore": <number 0-100, where 100=safest>,
  "communityHealth": "<strong|moderate|weak|unknown>",
  "redFlags": ["<specific red flag 1>", "..."],
  "scamIndicators": ["<specific indicator 1>", "..."],
  "narrative": "<2-3 sentence detailed risk narrative specific to this token>",
  "tokenCategory": "<meme|defi|nft|utility|governance|unknown>",
  "trustSignals": ["<positive signal 1>", "..."],
  "riskFactors": ["<specific risk 1>", "..."]
}

Be SPECIFIC to this token. If you recognize the contract name pattern (like brc20-*, alex-*, arkadiko-*), factor that into analysis. Score unknown/unrecognized tokens conservatively (40-60 range). Be detailed in narrative.`;

    // Retry with exponential backoff for rate limiting
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 2000;
        console.log(`⏳ Gemini rate limited, retrying in ${delay/1000}s (attempt ${attempt + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.GEMINI_API_KEY}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 800 }
          },
          { timeout: 20000 }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`🤖 Gemini response (${text.length} chars) for ${contractName}`);
        
        let parsed: any = {};
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Failed to parse AI response JSON');
        }

        const score = Math.min(100, Math.max(0, parsed.sentimentScore || 50));
        const redFlags: string[] = parsed.redFlags || [];
        const scamIndicators: string[] = parsed.scamIndicators || [];
        const trustSignals: string[] = parsed.trustSignals || [];
        const riskFactors: string[] = parsed.riskFactors || [];
        const allIssues = [...redFlags, ...scamIndicators];
        const riskLevel = this.determineRiskLevel(score, allIssues);
        const scanTime = Date.now() - startTime;
        
        const narrative = parsed.narrative || `Sentiment analysis for ${contractName}: Score ${score}/100.`;

        return {
          score,
          riskLevel,
          issues: allIssues.slice(0, 5),
          summary: `AI Sentiment Analysis of ${contractName.split('.').pop() || contractName}: ${narrative} Score: ${score}/100 (${parsed.communityHealth || 'unknown'} community, ${parsed.tokenCategory || 'unknown'} category).`,
          details: {
            contractName: contractName,
            tokenCategory: parsed.tokenCategory || 'unknown',
            communityHealth: parsed.communityHealth || 'unknown',
            sentimentSource: 'gemini-2.5-flash',
            narrative: narrative,
            redFlags: redFlags,
            scamIndicators: scamIndicators,
            trustSignals: trustSignals,
            riskFactors: riskFactors,
            checksPerformed: 6,
            redFlagCount: redFlags.length,
            scamIndicatorCount: scamIndicators.length,
            trustSignalCount: trustSignals.length,
          },
          scanTime
        };
      } catch (err: any) {
        lastError = err;
        if (err.response?.status !== 429) throw err;
      }
    }
    throw lastError || new Error('Gemini API failed after 3 retries');
  }

  private determineRiskLevel(score: number, issues: string[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'LOW';
    if (score >= 60) return 'MEDIUM';
    if (score >= 35 || issues.length <= 2) return 'HIGH';
    return 'CRITICAL';
  }
}
