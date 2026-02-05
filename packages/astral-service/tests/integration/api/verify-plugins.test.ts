/**
 * Integration tests for GET /verify/v0/plugins endpoint.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createVerifyTestApp } from '../../helpers/verify-test-server.js';

const app = createVerifyTestApp();

describe('GET /verify/v0/plugins', () => {
  it('lists available plugins', async () => {
    const res = await request(app).get('/verify/v0/plugins');

    expect(res.status).toBe(200);
    expect(res.body.plugins).toBeInstanceOf(Array);
    expect(res.body.plugins.length).toBeGreaterThan(0);

    // Should include proofmode
    const proofmode = res.body.plugins.find(
      (p: { name: string }) => p.name === 'proofmode'
    );
    expect(proofmode).toBeDefined();
    expect(proofmode.version).toBe('0.1.0');
    expect(proofmode.environments).toContain('mobile');
    expect(proofmode.description).toBeDefined();
  });

  it('returns plugin metadata in expected format', async () => {
    const res = await request(app).get('/verify/v0/plugins');

    expect(res.status).toBe(200);

    for (const plugin of res.body.plugins) {
      expect(plugin).toMatchObject({
        name: expect.any(String),
        version: expect.any(String),
        environments: expect.any(Array),
        description: expect.any(String),
      });
    }
  });
});
