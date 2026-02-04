/**
 * Test server factory for verify module integration tests.
 * Creates an Express app with only verify routes (no database dependency).
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import verifyRoutes from '../../src/verify/routes/index.js';
import { errorHandler } from '../../src/core/middleware/error-handler.js';
import { initSigner } from '../../src/core/signing/attestation.js';
import { initPluginRegistry } from '../../src/verify/index.js';

/**
 * Hardhat/Anvil default account #0 private key.
 *
 * Derived from the standard test mnemonic:
 *   "test test test test test test test test test test test junk"
 *
 * Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
 *
 * WARNING: This key is publicly known. Never use with real funds.
 */
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Create a test Express app with only verify routes mounted.
 * Does NOT require database - use for verify module tests.
 */
export function createVerifyTestApp() {
  const app = express();

  // Initialize signer with test key
  initSigner(TEST_PRIVATE_KEY, 84532);

  // Initialize verify plugin registry
  initPluginRegistry();

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Mount verify routes at /verify/v0
  app.use('/verify/v0', verifyRoutes);

  // Error handler
  app.use(errorHandler);

  return app;
}
