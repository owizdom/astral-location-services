/**
 * Plugin Interface for Location Verification
 *
 * All verification plugins implement this interface.
 * The same interface applies across environments; implementations differ.
 */

import type {
  LocationStamp,
  LocationClaim,
  StampVerificationResult,
} from '../../types/verify.js';

/**
 * Assessment of how well a stamp supports a claim.
 */
export interface ClaimAssessment {
  /** Does the stamp support the claim? */
  supportsClaim: boolean;

  /** Support score (0-1) */
  claimSupportScore: number;

  /** Plugin-specific assessment details */
  details: Record<string, unknown>;
}

/**
 * Plugin interface for location verification.
 *
 * Server-side plugins only need to implement verify() and assess().
 * Client-side plugins (future) would also implement collect(), create(), sign().
 */
export interface LocationProofPlugin {
  /** Plugin name (e.g., "proofmode", "witnesschain") */
  readonly name: string;

  /** Plugin version (semver) */
  readonly version: string;

  /** Environments where this plugin operates */
  readonly environments: string[];

  /** Human-readable description */
  readonly description: string;

  /**
   * Verify a stamp's internal validity.
   *
   * Checks:
   * - Signature validity
   * - Structure validity
   * - Signal consistency
   *
   * This is plugin-specific because different evidence types
   * have different validity requirements.
   */
  verify(stamp: LocationStamp): Promise<StampVerificationResult>;

  /**
   * Assess how well a stamp supports a claim.
   *
   * This is a probabilistic evaluation, not a simple geometric intersection.
   * The assessment considers:
   * - Spatial overlap (does stamp footprint cover claim?)
   * - Temporal overlap (does stamp timeframe cover claim?)
   * - Signal quality and consistency
   */
  assess(stamp: LocationStamp, claim: LocationClaim): Promise<ClaimAssessment>;
}

/**
 * Plugin metadata for listing available plugins.
 */
export interface PluginMetadata {
  name: string;
  version: string;
  environments: string[];
  description: string;
}

/**
 * Extract metadata from a plugin instance.
 */
export function getPluginMetadata(plugin: LocationProofPlugin): PluginMetadata {
  return {
    name: plugin.name,
    version: plugin.version,
    environments: plugin.environments,
    description: plugin.description,
  };
}
