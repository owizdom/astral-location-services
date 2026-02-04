import { Router } from 'express';
import { listPlugins } from '../../verify/index.js';
import type { PluginsListResponse } from '../../types/verify.js';

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
