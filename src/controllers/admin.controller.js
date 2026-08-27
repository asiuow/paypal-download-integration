import fs from 'fs';
import { orderService } from '../services/order.service.js';
import { vaultStorageService } from '../services/vault-storage.service.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MAU886';

export const adminController = {
  /**
   * Middleware de autenticación con contraseña
   */
  authMiddleware(req, res, next) {
    const pass = req.headers['x-admin-password'] || req.query.password || req.body?.password;
    if (pass === ADMIN_PASSWORD) {
      return next();
    }
    return res.status(401).json({ success: false, error: 'Unauthorized. Incorrect password.' });
  },

  /**
   * Validación de login
   */
  login(req, res) {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      return res.json({ success: true, message: 'Authentication successful.' });
    }
    return res.status(401).json({ success: false, error: 'Incorrect password.' });
  },

  /**
   * Obtiene todos los datos para la grilla tipo Excel
   */
  getDashboardData(req, res) {
    try {
      const orders = orderService.getPaidOrdersForAdmin();
      const defaultValidityDays = orderService.getDefaultValidityDays();

      const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
      const activeCount = orders.filter(o => !o.isExpired).length;
      const expiredCount = orders.filter(o => o.isExpired).length;

      return res.json({
        success: true,
        stats: {
          totalPaid: orders.length,
          totalRevenue: totalRevenue.toFixed(2),
          activeCount,
          expiredCount,
          defaultValidityDays
        },
        orders
      });
    } catch (err) {
      console.error('[AdminController] Error obteniendo datos del dashboard:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  /**
   * Ajusta los días de vigencia de una tarjeta específica (+ o - días)
   */
  adjustCardDays(req, res) {
    try {
      const { id } = req.params;
      const deltaDays = parseInt(req.body.deltaDays, 10);

      if (isNaN(deltaDays)) {
        return res.status(400).json({ success: false, error: 'Invalid deltaDays value.' });
      }

      const updated = orderService.adjustOrderDays(id, deltaDays);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }

      const expireTime = new Date(updated.expiresAt).getTime();
      const diffMs = expireTime - Date.now();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return res.json({
        success: true,
        order: {
          id: updated.id,
          shortId: updated.shortId,
          expiresAt: updated.expiresAt,
          validityDays: updated.validityDays,
          daysRemaining,
          isExpired: diffMs <= 0
        }
      });
    } catch (err) {
      console.error('[AdminController] Error ajustando días:', err);
      return res.status(500).json({ success: false, error: 'Failed to adjust days.' });
    }
  },

  /**
   * Actualiza los días globales por defecto para todas las tarjetas futuras
   */
  updateDefaultDays(req, res) {
    try {
      const days = parseInt(req.body.days, 10);
      if (isNaN(days) || days < 1) {
        return res.status(400).json({ success: false, error: 'Days must be at least 1.' });
      }

      const newDefault = orderService.setDefaultValidityDays(days);
      return res.json({ success: true, defaultValidityDays: newDefault });
    } catch (err) {
      console.error('[AdminController] Error actualizando días globales:', err);
      return res.status(500).json({ success: false, error: 'Failed to update default days.' });
    }
  },

  /**
   * Sirve la foto optimizada física de la bóveda
   */
  servePhoto(req, res) {
    const { shortId } = req.params;
    const photoPath = vaultStorageService.getPhotoPath(shortId);

    if (photoPath && fs.existsSync(photoPath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(photoPath);
    }

    // Fallback: si no está en disco físico, verificar si la orden tiene la foto en memoria/JSON
    const order = orderService.getOrder(shortId);
    if (order && order.cardData?.photo && order.cardData.photo.startsWith('data:image/')) {
      const matches = order.cardData.photo.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', 'image/jpeg');
        return res.send(buffer);
      }
    }

    return res.status(404).send('Photo not found.');
  }
};
