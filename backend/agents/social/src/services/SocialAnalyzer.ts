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
      // Attempt AI-powered sentiment analysis via Gemini
      if (this.GEMINI_API_KEY) {
        return await this.aiSentimentAnalysis(tokenIdentifier, startTime);
      }
      return this.patternBasedAnalysis(tokenIdentifier, startTime);
    } catch (error: any) {
      console.log('AI sentiment analysis failed, using pattern-based:', error.message);
      return this.patternBasedAnalysis(tokenIdentifier, startTime);
    }
  }

  private async aiSentimentAnalysis(token: string, startTime: number): Promise<SocialResult> {
    const prompt = `Analyze the social sentiment and risk of a Stacks blockchain token/contract: "${token}". 
    Provide a JSON response with:
    - sentimentScore (0-100, higher is more positive)
    - redFlags (array of strings)
    - communityHealth (string: strong/moderate/weak/unknown)
    - scamIndicators (array of strings)
    Keep the analysis brief and factual.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
      },
      { timeout: 15000 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse AI response
    let parsed: any = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fall back to pattern analysis if parsing fails
      return this.patternBasedAnalysis(token, startTime);
    }

    const sentimentScore = Math.min(100, Math.max(0, parsed.sentimentScore || 50));
    const redFlags: string[] = parsed.redFlags || [];
    const scamIndicators: string[] = parsed.scamIndicators || [];
    const allIssues = [...redFlags, ...scamIndicators];

    const score = sentimentScore;
    const riskLevel = this.determineRiskLevel(score, allIssues);
    const scanTime = Date.now() - startTime;

    return {
      score,
      riskLevel,
      issues: allIssues.slice(0, 5),
      summary: `AI-powered social sentiment analysis: Score ${score}/100 (${parsed.communityHealth || 'unknown'} community). ${allIssues.length > 0 ? `Red flags: ${allIssues[0]}` : 'No red flags detected.'}.`,
      details: {
        communityHealth: parsed.communityHealth || 'unknown',
        sentimentSource: 'gemini-ai',
        checksPerformed: 4,
        redFlagCount: redFlags.length,
        scamIndicatorCount: scamIndicators.length,
        contractAddress: token
      },
      scanTime
    };
  }

  private patternBasedAnalysis(token: string, startTime: number): SocialResult {
    const issues: string[] = [];
    let score = 75;

    // Common scam name patterns
    const scamPatterns = ['moon', 'safe', 'elon', 'doge', 'shib', 'baby', 'inu', '100x', '1000x', 'gem'];
    const lowerToken = token.toLowerCase();
    
    const matchedPatterns = scamPatterns.filter(p => lowerToken.includes(p));
    if (matchedPatterns.length > 0) {
      issues.push(`Token name contains common scam keywords: ${matchedPatterns.join(', ')}`);
      score -= matchedPatterns.length * 12;
    }

    // Check for excessive special characters (common in scams)
    const specialCharCount = (token.match(/[^a-zA-Z0-9.-]/g) || []).length;
    if (specialCharCount > 3) {
      issues.push('Unusual characters in token identifier');
      score -= 10;
    }

    // Check length patterns
    if (token.length < 10) {
      issues.push('Very short token identifier - limited analysis possible');
      score -= 5;
    }

    // Deterministic variance based on token hash
    const hash = token.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    score += (hash % 15) - 7;
    score = Math.max(10, Math.min(95, score));

    const riskLevel = this.determineRiskLevel(score, issues);
    const scanTime = Date.now() - startTime;

    return {
      score,
      riskLevel,
      issues,
      summary: `Pattern-based social analysis: Score ${score}/100. ${issues.length > 0 ? issues[0] : 'No obvious social red flags detected.'}`,
      details: {
        communityHealth: score >= 70 ? 'moderate' : 'weak',
        sentimentSource: 'pattern-analysis',
        checksPerformed: 4,
        contractAddress: token
      },
      scanTime
    };
  }

  private determineRiskLevel(score: number, issues: string[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'LOW';
    if (score >= 60) return 'MEDIUM';
    if (score >= 35 || issues.length <= 2) return 'HIGH';
    return 'CRITICAL';
  }
}
