import crypto from 'crypto';
import { config } from '../config/env.js';

export const tokenService = {
  /**
   * Genera un token HMAC-SHA256 firmado con expiración para descargas protegidas
   */
  generateDownloadToken(orderId, expiresInHours = 72) {
    const expiresAt = Date.now() + expiresInHours * 60 * 60 * 1000;
    const payload = `${orderId}:${expiresAt}`;
    
    const signature = crypto
      .createHmac('sha256', config.vaultSecret)
      .update(payload)
      .digest('hex');

    // Token seguro para URLs en Base64Url
    const rawToken = `${payload}:${signature}`;
    return Buffer.from(rawToken).toString('base64url');
  },

  /**
   * Valida la firma del token y su expiración
   */
  verifyToken(token, enforceExpiration = false) {
    try {
      if (!token) return { valid: false, reason: 'Token no provisto' };

      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const parts = decoded.split(':');

      if (parts.length !== 3) {
        return { valid: false, reason: 'Formato de token inválido' };
      }

      const [orderId, expiresAtStr, receivedSignature] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);
      const payload = `${orderId}:${expiresAt}`;

      const expectedSignature = crypto
        .createHmac('sha256', config.vaultSecret)
        .update(payload)
        .digest('hex');

      // Comparación segura contra ataques de temporización
      const sigBufferA = Buffer.from(receivedSignature, 'hex');
      const sigBufferB = Buffer.from(expectedSignature, 'hex');

      if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
        return { valid: false, reason: 'Firma de token inválida' };
      }

      if (enforceExpiration && Date.now() > expiresAt) {
        return { valid: false, reason: 'El token ha expirado', expired: true };
      }

      return {
        valid: true,
        payload: {
          orderId,
          expiresAt
        }
      };
    } catch (err) {
      return { valid: false, reason: 'Error al decodificar token: ' + err.message };
    }
  }
};
