// Main SDK exports
export { AstralCompute, createAstralCompute } from './compute.js';
export { AstralVerify, createAstralVerify } from './verify.js';
export { AstralEAS, createAstralEAS, submitDelegatedAttestation, type AttestationResult } from './eas.js';

// Type exports
export type {
  Input,
  RawGeometryInput,
  OnchainInput,
  OffchainInput,
  ComputeOptions,
  DelegatedAttestation,
  DelegatedAttestationMessage,
  DelegatedAttestationSignature,
  NumericComputeResult,
  BooleanComputeResult,
  ComputeResult,
  AstralComputeConfig,
  SubmitDelegatedOptions,
} from './types.js';

// Verify type exports
export type {
  LocationClaim,
  LocationStamp,
  LocationProof,
  StampResult,
  CorrelationAssessment,
  CredibilityAssessment,
  StampVerificationResult,
  PluginInfo,
  VerifyProofResult,
  VerifyOptions,
  AstralVerifyConfig,
  SubjectIdentifier,
  TimeBounds,
  LocationData,
  Signature,
} from './verify.js';

/**
 * Astral Location Services SDK
 *
 * @example
 * ```typescript
 * import { createAstralCompute, createAstralVerify, createAstralEAS } from '@decentralized-geo/astral-compute';
 *
 * // Initialize compute client
 * const compute = createAstralCompute({
 *   apiUrl: 'https://api.astral.global',
 *   chainId: 8453, // Base Mainnet
 * });
 *
 * // Compute distance with signed attestation
 * const result = await compute.distance(
 *   { type: 'Point', coordinates: [-122.4194, 37.7749] },
 *   { type: 'Point', coordinates: [-73.9857, 40.7484] },
 *   {
 *     schema: '0x...',
 *     recipient: '0x...',
 *   }
 * );
 *
 * console.log(`Distance: ${result.result} ${result.units}`);
 *
 * // Initialize verify client
 * const verify = createAstralVerify({
 *   apiUrl: 'https://api.astral.global',
 *   chainId: 8453,
 * });
 *
 * // Verify a location proof
 * const verifyResult = await verify.proof(locationProof, {
 *   schema: '0x...',
 *   recipient: '0x...',
 * });
 *
 * console.log(`Confidence: ${verifyResult.credibility.confidence}`);
 *
 * // Submit attestation to EAS
 * const eas = createAstralEAS(signer, 8453);
 * const receipt = await eas.submitDelegated(result.attestation);
 * ```
 */
