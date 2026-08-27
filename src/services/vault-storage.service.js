import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { vaultService } from './vault.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VAULT_STORAGE_DIR = path.join(__dirname, '../../data/paid_vault');

export const vaultStorageService = {
  /**
   * Asegura que el directorio raíz de la bóveda de pagos exista
   */
  ensureStorageDir() {
    if (!fs.existsSync(VAULT_STORAGE_DIR)) {
      fs.mkdirSync(VAULT_STORAGE_DIR, { recursive: true });
    }
  },

  /**
   * Guarda una copia física independiente de la tarjeta y la foto optimizada al confirmarse el pago
   */
  archivePaidCard(order) {
    this.ensureStorageDir();

    const shortId = order.shortId || order.id.slice(0, 8);
    const orderDir = path.join(VAULT_STORAGE_DIR, shortId);

    if (!fs.existsSync(orderDir)) {
      fs.mkdirSync(orderDir, { recursive: true });
    }

    const card = order.cardData || {};
    let photoFilename = null;

    // 1. Optimizar y guardar foto si existe
    if (card.photo && typeof card.photo === 'string' && card.photo.startsWith('data:image/')) {
      try {
        const matches = card.photo.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const buffer = Buffer.from(matches[2], 'base64');
          photoFilename = 'photo.jpg';
          const photoPath = path.join(orderDir, photoFilename);
          fs.writeFileSync(photoPath, buffer);
          console.log(`[VaultStorage] Foto optimizada guardada en: ${photoPath} (${buffer.length} bytes)`);
        }
      } catch (err) {
        console.warn('[VaultStorage] Error guardando foto física:', err.message);
      }
    }

    // 2. Compilar y guardar archivo HTML de la tarjeta
    try {
      const htmlContent = vaultService.getProtectedProductContent(order.id, order);
      const cardPath = path.join(orderDir, 'card.html');
      fs.writeFileSync(cardPath, htmlContent, 'utf8');
      console.log(`[VaultStorage] Copia HTML de tarjeta guardada en: ${cardPath}`);
    } catch (err) {
      console.warn('[VaultStorage] Error guardando HTML de tarjeta:', err.message);
    }

    // 3. Guardar registro estructurado para el panel de control
    const archiveRecord = {
      orderId: order.id,
      shortId: shortId,
      eventType: card.eventType || 'cumpleanos',
      name: card.name || 'Honoree',
      age: card.age || '',
      address: card.address || '',
      city: card.city || '',
      state: card.province || card.state || '',
      zipCode: card.zipCode || '',
      country: card.country || 'United States',
      date: card.date || '',
      time: card.time || '',
      amount: order.amount || 5.00,
      currency: order.currency || 'USD',
      paypalOrderId: order.paypalOrderId || '',
      paymentId: order.paymentId || '',
      paidAt: order.paidAt || order.updatedAt || new Date().toISOString(),
      expiresAt: order.expiresAt || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
      validityDays: order.validityDays || 30,
      hasPhoto: Boolean(photoFilename),
      photoUrl: photoFilename ? `/api/admin/photo/${shortId}` : null
    };

    const recordPath = path.join(orderDir, 'order-archive.json');
    fs.writeFileSync(recordPath, JSON.stringify(archiveRecord, null, 2), 'utf8');

    return archiveRecord;
  },

  /**
   * Obtiene la ruta física de la foto de una orden
   */
  getPhotoPath(shortId) {
    const photoPath = path.join(VAULT_STORAGE_DIR, shortId, 'photo.jpg');
    if (fs.existsSync(photoPath)) {
      return photoPath;
    }
    return null;
  }
};
