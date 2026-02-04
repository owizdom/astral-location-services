import { Router } from 'express';
import { listPlugins } from '../index.js';
import type { PluginsListResponse } from '../types/index.js';

const router = Router();

/**
 * GET /verify/v0/plugins
 *
 * List available verification plugins.
 */
router.get('/', (_req, res) => {
  const plugins = listPlugins();

  const response: PluginsListResponse = {
    plugins,
  };

  res.json(response);
});

export default router;
