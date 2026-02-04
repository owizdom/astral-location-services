import { Router } from 'express';
import stampRouter from './stamp.js';
import proofRouter from './proof.js';
import pluginsRouter from './plugins.js';

const router = Router();

// Mount verify operation routes
router.use('/stamp', stampRouter);
router.use('/proof', proofRouter);
router.use('/plugins', pluginsRouter);

export default router;
