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
      return res.status(404).send('Identifier not provided.');
    }

    // 1. Buscar orden por identificador universal (shortId, ID completo o Token)
    let order = orderService.getOrder(idParam);

    if (!order) {
      const verification = tokenService.verifyToken(idParam, false);
      if (verification.valid && verification.payload?.orderId) {
        order = orderService.getOrder(verification.payload.orderId);
      }
    }

    if (!order) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation Not Found</title>
          <style>
            body { background: #0b0b0f; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
            .card { background: #161620; padding: 36px 28px; border-radius: 24px; border: 1px solid #282836; max-width: 380px; }
            h1 { font-size: 20px; margin-bottom: 10px; color: #ef4444; font-weight: 800; }
            p { color: #9ca3af; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
            a { display: inline-block; background: #0070ba; color: #fff; padding: 13px 22px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Invitation Not Found</h1>
            <p>The invitation you are trying to view does not exist or has been removed.</p>
            <a href="/">Create an invitation</a>
          </div>
        </body>
        </html>
      `);
    }

    // 2. Control de Caducidad (Vencimiento)
    if (order.expiresAt && new Date() > new Date(order.expiresAt)) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation Expired</title>
          <style>
            body { background: #0b0b0f; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
            .card { background: #161620; padding: 36px 28px; border-radius: 24px; border: 1px solid #282836; max-width: 380px; }
            h1 { font-size: 20px; margin-bottom: 10px; color: #f59e0b; font-weight: 800; }
            p { color: #9ca3af; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
            a { display: inline-block; background: #0070ba; color: #fff; padding: 13px 22px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Invitation Expired</h1>
            <p>This invitation card has expired and is no longer available.</p>
            <a href="/">Create a new invitation</a>
          </div>
        </body>
        </html>
      `);
    }

    try {
      const productContent = vaultService.getProtectedProductContent(order.id, order);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(productContent);
    } catch (error) {
      console.error('[DownloadController] Error sirviendo producto:', error);
      return res.status(500).send('Error loading invitation card.');
    }
  }
};
