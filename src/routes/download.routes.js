import { Router } from 'express';
import { downloadController } from '../controllers/download.controller.js';

const router = Router();

// Rutas de visualización y entrega de la tarjeta activada
router.get('/tarjeta/:id', downloadController.viewProduct);
router.get('/t/:id', downloadController.viewProduct);
router.get('/p/:id', downloadController.viewProduct);
router.get('/v/:id', downloadController.viewProduct);

export default router;
