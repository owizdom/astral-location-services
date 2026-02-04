/**
 * Confidence Assessment for Location Proofs
 *
 * Computes overall confidence from stamp results and correlation analysis.
 * Based on the evidence evaluation framework from "Towards Stronger Location Proofs".
 *
 * Key principles:
 * - Independent, corroborating evidence increases confidence
 * - Redundant evidence from the same system neither adds nor subtracts
 * - Invalid stamps reduce overall confidence
 */

import type {
  StampResult,
  CorrelationAssessment,
  CredibilityAssessment,
} from './types/index.js';

/**
 * Compute overall confidence from stamp results and correlation.
 *
 * The confidence calculation incorporates:
 * - Stamp validity (did each stamp pass internal verification?)
 * - Claim support scores (how well does each stamp support the claim?)
 * - Independence (are evidence sources uncorrelated?)
 * - Agreement (do sources agree with each other?)
 *
 * Note: This is a heuristic, not a calibrated probability.
 */
export function computeConfidence(
  stampResults: StampResult[],
  correlation?: CorrelationAssessment
): number {
  if (stampResults.length === 0) {
    return 0;
  }

  // Single stamp case
  if (stampResults.length === 1) {
    return computeSingleStampConfidence(stampResults[0]);
  }

  // Multi-stamp case
  return computeMultiStampConfidence(stampResults, correlation);
}

/**
 * Compute confidence for a single stamp.
 */
function computeSingleStampConfidence(result: StampResult): number {
  // If stamp is invalid, confidence is very low
  if (!result.signaturesValid || !result.structureValid) {
    return 0.1; // Invalid stamp provides minimal confidence
  }

  // Base confidence from claim support score
  let confidence = result.claimSupportScore;

  // Penalty for inconsistent signals
  if (!result.signalsConsistent) {
    confidence *= 0.8;
  }

  // Cap at 0.85 for single stamp (multi-stamp can exceed)
  return Math.min(confidence, 0.85);
}

/**
 * Compute confidence for multiple stamps with correlation analysis.
 */
function computeMultiStampConfidence(
  stampResults: StampResult[],
  correlation?: CorrelationAssessment
): number {
  // Count valid and invalid stamps
  const validResults = stampResults.filter(
    (r) => r.signaturesValid && r.structureValid && r.supportsClaim
  );
  const invalidCount = stampResults.length - validResults.length;

  if (validResults.length === 0) {
    return 0.1; // No valid stamps
  }

  // Base confidence: average of valid stamp support scores
  const baseConfidence =
    validResults.reduce((sum, r) => sum + r.claimSupportScore, 0) /
    validResults.length;

  // Independence bonus (if stamps from different systems)
  let independenceBonus = 0;
  if (correlation && correlation.independence > 0.5) {
    // Up to 10% bonus for high independence
    independenceBonus = (correlation.independence - 0.5) * 0.2;
  }

  // Agreement bonus (if stamps corroborate each other)
  let agreementBonus = 0;
  if (correlation && correlation.agreement > 0.7) {
    // Up to 5% bonus for high agreement
    agreementBonus = (correlation.agreement - 0.7) * 0.15;
  }

  // Invalid stamp penalty
  const invalidPenalty = invalidCount * 0.05;

  // Compute final confidence
  const confidence = baseConfidence + independenceBonus + agreementBonus - invalidPenalty;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Build a complete credibility assessment from verification results.
 */
export function buildCredibilityAssessment(
  stampResults: StampResult[],
  correlation?: CorrelationAssessment
): CredibilityAssessment {
  const confidence = computeConfidence(stampResults, correlation);

  return {
    confidence,
    stampResults,
    correlation,
  };
}

/**
 * Scale confidence (0-1) to uint8 (0-100) for EAS attestation.
 */
export function scaleConfidenceToUint8(confidence: number): number {
  return Math.round(Math.max(0, Math.min(1, confidence)) * 100);
}
