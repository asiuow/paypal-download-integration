import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_FILE = path.join(__dirname, '../vault/product-app.html');

export const vaultService = {
  /**
   * Genera el HTML protegido de la tarjeta final inyectando los datos de la orden aprobada
   */
  getProtectedProductContent(orderId, order) {
    if (!fs.existsSync(TEMPLATE_FILE)) {
      throw new Error('Plantilla protegida no encontrada en la bóveda.');
    }

    let html = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    const cardData = order?.cardData || {};

    const name = cardData.name || 'Cumpleañero';
    const age = cardData.age || '5';
    const photo = cardData.photo || '';
    const address = cardData.address || 'Av. Principal 123';
    const city = cardData.city || 'Ciudad';
    const date = cardData.date || 'Sábado';
    const time = cardData.time || '18:00 hs';

    // Remplazar variables en la plantilla protegida
    html = html.replaceAll('{{NAME}}', escapeHtml(name));
    html = html.replaceAll('{{AGE}}', escapeHtml(age));
    html = html.replaceAll('{{PHOTO}}', photo);
    html = html.replaceAll('{{ADDRESS}}', escapeHtml(address));
    html = html.replaceAll('{{CITY}}', escapeHtml(city));
    html = html.replaceAll('{{DATE}}', escapeHtml(date));
    html = html.replaceAll('{{TIME}}', escapeHtml(time));
    html = html.replaceAll('{{ORDER_ID}}', orderId);

    return html;
  }
};

function escapeHtml(string) {
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
