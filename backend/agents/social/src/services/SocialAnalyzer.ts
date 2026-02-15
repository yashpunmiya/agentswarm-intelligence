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
    const prompt = `Analyze the social sentiment and risk of a Stacks blockchain token/contract: "${token}". 
    Provide a JSON response with:
    - sentimentScore (0-100, higher is more positive)
    - redFlags (array of strings)
    - communityHealth (string: strong/moderate/weak/unknown)
    - scamIndicators (array of strings)
    Keep the analysis brief and factual.`;

    // Retry with exponential backoff for rate limiting
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 2000; // 4s, 8s
        console.log(`⏳ Gemini rate limited, retrying in ${delay/1000}s (attempt ${attempt + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.GEMINI_API_KEY}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
          },
          { timeout: 15000 }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`🤖 Gemini REAL response received (${text.length} chars)`);
        
        // Parse AI response
        let parsed: any = {};
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch {
          throw new Error('Failed to parse AI sentiment analysis response');
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
      } catch (err: any) {
        lastError = err;
        if (err.response?.status !== 429) {
          throw err; // Only retry on rate limit
        }
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
