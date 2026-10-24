/**
 * Core protocol retrieval algorithm with discrete matched vs abstain triage safety.
 * Measures real execution latency via performance.now() without artificial delays.
 */

import type { EmergencyProtocol, TriageOutcome, AbstainReason } from '../types';
import { EMERGENCY_PROTOCOLS } from './emergencyProtocols';

export const MIN_CONFIDENCE_THRESHOLD = 0.45;

/** Tokenizes text into lowercase normalized alphanumeric keywords */
export function tokenizeText(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Computes keyword overlap and relevance score between query and protocol */
export function scoreProtocolMatch(
  queryTokens: string[],
  protocol: EmergencyProtocol
): { score: number; matchedKeywords: string[] } {
  if (queryTokens.length === 0) {
    return { score: 0, matchedKeywords: [] };
  }

  const matchedKeywords: string[] = [];
  let score = 0;

  // Exact phrase check on keywords
  const fullText = protocol.keywords.join(' ').toLowerCase();
  for (const token of queryTokens) {
    if (fullText.includes(token)) {
      matchedKeywords.push(token);
      score += 0.2;
    }
  }

  // Bonus for title or category match
  for (const token of queryTokens) {
    if (protocol.title.toLowerCase().includes(token)) {
      score += 0.35;
    }
    if (protocol.category.toLowerCase().includes(token)) {
      score += 0.25;
    }
  }

  // Normalize score between 0 and 1
  const normalizedScore = Math.min(1.0, score);
  return { score: normalizedScore, matchedKeywords };
}

/**
 * Resolves query into either a matched EmergencyProtocol or an explicit abstain outcome.
 * Prevents defaulting unclassified symptoms to OHCA / cardiac arrest.
 */
export function resolveTriageOutcome(
  query: string,
  protocols: EmergencyProtocol[] = EMERGENCY_PROTOCOLS
): TriageOutcome {
  const startTime = performance.now();
  const trimmed = query.trim();

  if (!trimmed || trimmed.length < 3) {
    const elapsed = performance.now() - startTime;
    return {
      status: 'abstain',
      reason: 'insufficient_signal',
      score: 0,
      latencyMs: Number(elapsed.toFixed(2)),
      suggestedQuestions: [
        'Can you describe exactly what the patient is experiencing right now?',
        'Is the person conscious, breathing, or having chest discomfort?'
      ],
    };
  }

  const tokens = tokenizeText(trimmed);
  let bestProtocol: EmergencyProtocol | null = null;
  let highestScore = 0;
  let bestMatches: string[] = [];

  for (const protocol of protocols) {
    const { score, matchedKeywords } = scoreProtocolMatch(tokens, protocol);
    if (score > highestScore) {
      highestScore = score;
      bestProtocol = protocol;
      bestMatches = matchedKeywords;
    }
  }

  const elapsed = performance.now() - startTime;
  const latencyMs = Math.max(0.08, Number(elapsed.toFixed(2)));

  if (highestScore < MIN_CONFIDENCE_THRESHOLD || !bestProtocol) {
    let reason: AbstainReason = 'below_confidence_threshold';
    if (tokens.length > 5 && highestScore < 0.3) {
      reason = 'ambiguous_presentation';
    }

    return {
      status: 'abstain',
      reason,
      score: Number(highestScore.toFixed(3)),
      latencyMs,
      suggestedQuestions: [
        'Is the person breathing normally right now?',
        'Are they having severe chest pressure, weakness, or bleeding?',
        'Did this happen suddenly or gradually over hours?'
      ],
    };
  }

  return {
    status: 'matched',
    protocol: bestProtocol,
    confidence: Number(highestScore.toFixed(3)),
    matchedKeywords: bestMatches,
    latencyMs,
  };
}
