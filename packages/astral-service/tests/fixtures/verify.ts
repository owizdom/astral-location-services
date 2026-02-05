/**
 * Test fixtures for verify module.
 */

import type { LocationClaim, LocationStamp, LocationProof } from '../../src/types/verify.js';
import { TEST_SCHEMA_UID, TEST_RECIPIENT, TEST_CHAIN_ID } from './geometries.js';

// SRS URI for WGS84
const WGS84_SRS = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';

// Current timestamp for testing
const now = Math.floor(Date.now() / 1000);

/**
 * Valid LocationClaim for San Francisco
 */
export const VALID_CLAIM: LocationClaim = {
  lpVersion: '0.2',
  locationType: 'geojson-point',
  location: { type: 'Point', coordinates: [-122.4194, 37.7749] },
  srs: WGS84_SRS,
  subject: { scheme: 'eth-address', value: '0x1234567890123456789012345678901234567890' },
  radius: 100, // 100 meters
  time: { start: now - 60, end: now }, // Last minute
  eventType: 'presence',
};

/**
 * Valid LocationStamp matching the claim
 */
export const VALID_STAMP: LocationStamp = {
  lpVersion: '0.2',
  locationType: 'geojson-point',
  location: { type: 'Point', coordinates: [-122.4194, 37.7749] },
  srs: WGS84_SRS,
  temporalFootprint: { start: now - 120, end: now + 60 },
  plugin: 'proofmode',
  pluginVersion: '0.1.0',
  signals: {
    deviceType: 'mobile',
    accuracy: 10,
  },
  signatures: [
    {
      signer: { scheme: 'device-pubkey', value: '0xabcdef1234567890' },
      algorithm: 'secp256k1',
      value: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00',
      timestamp: now - 30,
    },
  ],
};

/**
 * Valid LocationProof with single stamp
 */
export const VALID_PROOF: LocationProof = {
  claim: VALID_CLAIM,
  stamps: [VALID_STAMP],
};

/**
 * Stamp that is outside the claim radius
 */
export const STAMP_OUTSIDE_RADIUS: LocationStamp = {
  ...VALID_STAMP,
  location: { type: 'Point', coordinates: [-122.5, 37.8] }, // ~10km away
};

/**
 * Stamp with temporal mismatch
 */
export const STAMP_TEMPORAL_MISMATCH: LocationStamp = {
  ...VALID_STAMP,
  temporalFootprint: { start: now - 3600, end: now - 1800 }, // 1 hour ago
};

/**
 * Stamp with invalid signature format
 */
export const STAMP_INVALID_SIGNATURE: LocationStamp = {
  ...VALID_STAMP,
  signatures: [
    {
      ...VALID_STAMP.signatures[0],
      value: 'not-a-hex-signature',
    },
  ],
};

/**
 * Stamp with missing required fields
 */
export const STAMP_MISSING_FIELDS: Partial<LocationStamp> = {
  lpVersion: '0.2',
  locationType: 'geojson-point',
  // Missing location, plugin, signatures, etc.
};

/**
 * Second valid stamp (still proofmode, but simulates a different session)
 * For future: use witnesschain when that plugin is implemented
 */
export const VALID_STAMP_SECOND: LocationStamp = {
  lpVersion: '0.2',
  locationType: 'geojson-point',
  location: { type: 'Point', coordinates: [-122.4195, 37.775] }, // Slightly different
  srs: WGS84_SRS,
  temporalFootprint: { start: now - 90, end: now + 30 },
  plugin: 'proofmode', // Using proofmode since witnesschain isn't implemented yet
  pluginVersion: '0.1.0',
  signals: {
    deviceType: 'tablet',
    accuracy: 15,
    session: 2,
  },
  signatures: [
    {
      signer: { scheme: 'device-pubkey', value: '0x9876543210fedcba' },
      algorithm: 'secp256k1',
      value: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba098765432100',
      timestamp: now - 45,
    },
  ],
};

/**
 * Multi-stamp proof with two stamps
 * Note: Both stamps use proofmode since witnesschain isn't implemented yet
 */
export const MULTI_STAMP_PROOF: LocationProof = {
  claim: VALID_CLAIM,
  stamps: [VALID_STAMP, VALID_STAMP_SECOND],
};

/**
 * Multi-stamp proof with redundant stamps (same plugin)
 */
export const REDUNDANT_STAMP_PROOF: LocationProof = {
  claim: VALID_CLAIM,
  stamps: [VALID_STAMP, { ...VALID_STAMP, signals: { ...VALID_STAMP.signals, session: 2 } }],
};

/**
 * Claim with NYC location (for testing with different stamps)
 */
export const NYC_CLAIM: LocationClaim = {
  lpVersion: '0.2',
  locationType: 'geojson-point',
  location: { type: 'Point', coordinates: [-73.9857, 40.7484] },
  srs: WGS84_SRS,
  subject: { scheme: 'eth-address', value: '0x1234567890123456789012345678901234567890' },
  radius: 50,
  time: { start: now - 60, end: now },
  eventType: 'presence',
};

/**
 * Helper to make verify proof request
 */
export function makeVerifyRequest(proof: LocationProof, options?: Record<string, unknown>) {
  return {
    proof,
    options: {
      chainId: TEST_CHAIN_ID,
      schema: TEST_SCHEMA_UID,
      recipient: TEST_RECIPIENT,
      ...options,
    },
  };
}

/**
 * Helper to make verify stamp request
 */
export function makeStampRequest(stamp: LocationStamp) {
  return { stamp };
}
