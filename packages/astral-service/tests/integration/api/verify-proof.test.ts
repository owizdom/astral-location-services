/**
 * Integration tests for POST /verify/v0/proof endpoint.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createVerifyTestApp } from '../../helpers/verify-test-server.js';
import {
  VALID_PROOF,
  MULTI_STAMP_PROOF,
  REDUNDANT_STAMP_PROOF,
  STAMP_OUTSIDE_RADIUS,
  STAMP_TEMPORAL_MISMATCH,
  NYC_CLAIM,
  makeVerifyRequest,
} from '../../fixtures/verify.js';
import { TEST_SCHEMA_UID, TEST_RECIPIENT } from '../../fixtures/geometries.js';

const app = createVerifyTestApp();

describe('POST /verify/v0/proof', () => {
  describe('successful verification', () => {
    it('verifies a valid single-stamp proof', async () => {
      const res = await request(app)
        .post('/verify/v0/proof')
        .send(makeVerifyRequest(VALID_PROOF));

      expect(res.status).toBe(200);

      // Check credibility assessment
      expect(res.body.credibility).toBeDefined();
      expect(res.body.credibility.confidence).toBeGreaterThan(0);
      expect(res.body.credibility.confidence).toBeLessThanOrEqual(1);
      expect(res.body.credibility.stampResults).toHaveLength(1);

      // Check stamp result
      const stampResult = res.body.credibility.stampResults[0];
      expect(stampResult.stampIndex).toBe(0);
      expect(stampResult.plugin).toBe('proofmode');
      expect(stampResult.signaturesValid).toBe(true);
      expect(stampResult.structureValid).toBe(true);
      expect(stampResult.supportsClaim).toBe(true);

      // Single-stamp proofs should not have correlation
      expect(res.body.credibility.correlation).toBeUndefined();

      // Check response structure
      expect(res.body.uid).toMatch(/^0x[a-f0-9]{64}$/);
      expect(res.body.proof).toBeDefined();
      expect(res.body.attester).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(res.body.timestamp).toBeTypeOf('number');

      // Check attestation
      expect(res.body.attestation).toBeDefined();
      expect(res.body.attestation.schema).toBe(TEST_SCHEMA_UID);
      expect(res.body.attestation.signature).toMatch(/^0x[a-fA-F0-9]+$/);

      // Check delegated attestation
      expect(res.body.delegatedAttestation).toBeDefined();
      expect(res.body.delegatedAttestation.deadline).toBeTypeOf('number');
    });

    it('verifies a multi-stamp proof with correlation analysis', async () => {
      const res = await request(app)
        .post('/verify/v0/proof')
        .send(makeVerifyRequest(MULTI_STAMP_PROOF));

      expect(res.status).toBe(200);
      expect(res.body.credibility.stampResults).toHaveLength(2);

      // Multi-stamp proofs should have correlation
      expect(res.body.credibility.correlation).toBeDefined();
      // Note: Both stamps use proofmode, so independence will be 0.5 (1 unique / 2 total)
      expect(res.body.credibility.correlation.independence).toBeGreaterThanOrEqual(0);
      expect(res.body.credibility.correlation.agreement).toBeGreaterThan(0);
      expect(res.body.credibility.correlation.notes).toBeInstanceOf(Array);
    });

    it('handles redundant stamps (same plugin) appropriately', async () => {
      const res = await request(app)
        .post('/verify/v0/proof')
        .send(makeVerifyRequest(REDUNDANT_STAMP_PROOF));

      expect(res.status).toBe(200);

      // Redundant stamps should have low independence
      expect(res.body.credibility.correlation).toBeDefined();
      expect(res.body.credibility.correlation.independence).toBeLessThanOrEqual(0.5);
    });
  });

  describe('claim assessment', () => {
    it('detects stamp outside claim radius', async () => {
      const proof = {
        claim: VALID_PROOF.claim,
        stamps: [STAMP_OUTSIDE_RADIUS],
      };

      const res = await request(app)
        .post('/verify/v0/proof')
        .send(makeVerifyRequest(proof));

      expect(res.status).toBe(200);

      // Stamp should be valid but not support claim
      const stampResult = res.body.credibility.stampResults[0];
      expect(stampResult.signaturesValid).toBe(true);
      expect(stampResult.structureValid).toBe(true);
      expect(stampResult.supportsClaim).toBe(false);
      expect(stampResult.claimSupportScore).toBeLessThan(0.5);

      // Overall confidence should be lower
      expect(res.body.credibility.confidence).toBeLessThan(0.5);
    });

    it('detects temporal mismatch between stamp and claim', async () => {
      const proof = {
        claim: VALID_PROOF.claim,
        stamps: [STAMP_TEMPORAL_MISMATCH],
      };

      const res = await request(app)
        .post('/verify/v0/proof')
        .send(makeVerifyRequest(proof));

      expect(res.status).toBe(200);

      // Temporal mismatch should reduce support score
      const stampResult = res.body.credibility.stampResults[0];
      expect(stampResult.claimSupportScore).toBeLessThan(1.0);
    });
  });

  describe('validation errors', () => {
    it('rejects missing proof', async () => {
      const res = await request(app)
        .post('/verify/v0/proof')
        .send({ options: { chainId: 84532 } });

      expect(res.status).toBe(400);
    });

    it('rejects proof with empty stamps array', async () => {
      const proof = { claim: VALID_PROOF.claim, stamps: [] };
      const res = await request(app)
        .post('/verify/v0/proof')
        .send(makeVerifyRequest(proof));

      expect(res.status).toBe(400);
    });

    it('rejects invalid claim format', async () => {
      const invalidProof = {
        claim: { ...VALID_PROOF.claim, lpVersion: 'invalid' },
        stamps: VALID_PROOF.stamps,
      };

      const res = await request(app)
        .post('/verify/v0/proof')
        .send(makeVerifyRequest(invalidProof));

      expect(res.status).toBe(400);
    });

    it('rejects claim with missing radius', async () => {
      const claim = { ...VALID_PROOF.claim };
      delete (claim as Record<string, unknown>).radius;
      const invalidProof = { claim, stamps: VALID_PROOF.stamps };

      const res = await request(app)
        .post('/verify/v0/proof')
        .send(makeVerifyRequest(invalidProof));

      expect(res.status).toBe(400);
    });
  });

  describe('response format', () => {
    it('returns RFC 7807 problem details on error', async () => {
      const res = await request(app)
        .post('/verify/v0/proof')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        type: expect.stringContaining('astral.global/errors'),
        title: expect.any(String),
        status: 400,
        detail: expect.any(String),
        instance: '/verify/v0/proof',
      });
    });
  });
});
