import { orderService } from '../services/order.service.js';
import { vaultService } from '../services/vault.service.js';
import { tokenService } from '../security/token.service.js';

export const downloadController = {
  /**
   * Visualización universal del archivo / tarjeta activada (Compatible con Android, iOS/Safari, Windows, Mac, Linux)
   */
  async viewProduct(req, res) {
    const idParam = req.params.id || req.params.token;
    
    if (!idParam) {
      return res.status(404).send('Identificador no provisto.');
    }

    // 1. Buscar orden por identificador universal (shortId, ID completo o Token)
    const order = orderService.getOrder(idParam);

    if (!order) {
      // Si no coincide directo, intentar verificación criptográfica
      const verification = tokenService.verifyToken(idParam, false);
      if (!verification.valid) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitación no encontrada</title>
            <style>
              body { background: #0b0b0f; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
              .card { background: #161620; padding: 32px 24px; border-radius: 20px; border: 1px solid #282836; max-width: 380px; }
              h1 { font-size: 20px; margin-bottom: 10px; color: #ef4444; }
              p { color: #9ca3af; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
              a { display: inline-block; background: #0070ba; color: #fff; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>🎈 Invitación no disponible</h1>
              <p>El enlace que intentas abrir no existe o ha expirado.</p>
              <a href="/">Crear una nueva tarjeta</a>
            </div>
          </body>
          </html>
        `);
      }
    }

    try {
      const orderId = order ? order.id : idParam;
      const productContent = vaultService.getProtectedProductContent(orderId, order);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache liviano para móviles
      return res.send(productContent);
    } catch (error) {
      console.error('[DownloadController] Error sirviendo producto:', error);
      return res.status(500).send('Error cargando la tarjeta de invitación.');
    }
  }
};
