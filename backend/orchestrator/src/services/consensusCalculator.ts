import { AgentResponse, ConsensusResult } from '../types';

export class ConsensusCalculator {
  calculateConsensus(responses: AgentResponse[]): ConsensusResult {
    if (responses.length === 0) {
      throw new Error('No responses to calculate consensus');
    }

    const averageScore = responses.reduce((sum, r) => sum + r.score, 0) / responses.length;

    const scores = responses.map(r => r.score);
    const variance = this.calculateVariance(scores);
    const maxVariance = 2500;
    const consensusStrength = Math.max(0, 1 - (variance / maxVariance));

    const recommendation = this.determineRecommendation(responses, averageScore);

    const confidence = Math.round(
      consensusStrength * 100 * (Math.min(responses.length, 5) / 5)
    );

    const totalCost = responses.reduce((sum, r) => {
      const price = r.metadata?.price || 0;
      return sum + price;
    }, 0);

    return {
      averageScore: Math.round(averageScore),
      consensusStrength: Math.round(consensusStrength * 100) / 100,
      recommendation,
      confidence,
      totalCost,
      responses
    };
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
  }

  private determineRecommendation(responses: AgentResponse[], avgScore: number): string {
    const criticalCount = responses.filter(r => r.riskLevel === 'CRITICAL').length;
    const highCount = responses.filter(r => r.riskLevel === 'HIGH').length;

    if (criticalCount > 0) {
      return 'CRITICAL RISK - AVOID COMPLETELY';
    }

    if (highCount >= responses.length / 2) {
      return 'HIGH RISK - DO NOT RECOMMEND';
    }

    if (avgScore >= 80) {
      return 'LOW RISK - APPEARS SAFE';
    } else if (avgScore >= 60) {
      return 'MEDIUM RISK - EXERCISE CAUTION';
    } else if (avgScore >= 40) {
      return 'HIGH RISK - NOT RECOMMENDED';
    } else {
      return 'CRITICAL RISK - AVOID COMPLETELY';
    }
  }
}

export const consensusCalculator = new ConsensusCalculator();
