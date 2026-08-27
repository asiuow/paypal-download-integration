import express from 'express';
import { adminController } from '../controllers/admin.controller.js';

const router = express.Router();

// 1. Ruta de autenticación
router.post('/login', adminController.login);

// 2. Ruta pública/protegida para servir fotos de la bóveda
router.get('/photo/:shortId', adminController.servePhoto);

// 3. Rutas protegidas con contraseña MAU886
router.use(adminController.authMiddleware);

router.get('/orders', adminController.getDashboardData);
router.post('/orders/:id/adjust-days', adminController.adjustCardDays);
router.post('/settings/default-days', adminController.updateDefaultDays);

export default router;
