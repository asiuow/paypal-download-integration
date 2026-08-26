import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VAULT_FILE_PATH = path.join(__dirname, '../vault/product-app.html');

export const vaultService = {
  getProtectedProductContent(orderId, order = {}) {
    if (!fs.existsSync(VAULT_FILE_PATH)) {
      throw new Error('Plantilla de tarjeta no encontrada en la bóveda.');
    }

    let content = fs.readFileSync(VAULT_FILE_PATH, 'utf8');
    const card = order.cardData || {
      eventType: 'cumpleanos',
      name: 'Festejado',
      age: '5',
      photo: '',
      address: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      province: 'Buenos Aires',
      country: 'Argentina',
      date: 'Sábado',
      time: '18:00 hs'
    };

    const eventLabels = {
      'cumpleanos': {
        ogTitle: 'Te invito a mi cumple',
        ogDesc: 'Toca para ver la invitación',
        shareText: 'Te invito a mi cumple',
        badge: card.age ? `¡Cumple ${card.age} Años!` : '¡Feliz Cumpleaños!',
        headline: '¡Te invito a festejar mi cumpleaños juntos!',
        themeColor: '#ef4444'
      },
      'bautismo': {
        ogTitle: 'Te invito a mi bautismo',
        ogDesc: 'Toca para ver la invitación',
        shareText: 'Te invito a mi bautismo',
        badge: 'Mi Bautismo',
        headline: 'Te invito a compartir este momento tan especial y bendecido',
        themeColor: '#0ea5e9'
      },
      'asado': {
        ogTitle: 'Te invito a un asado',
        ogDesc: 'Toca para ver la invitación',
        shareText: 'Te invito a un asado',
        badge: '¡Gran Asado!',
        headline: '¡Se prende el fuego! Te invito a compartir un gran asado',
        themeColor: '#f97316'
      },
      'evento': {
        ogTitle: 'Te invito a mi evento',
        ogDesc: 'Toca para ver la invitación',
        shareText: 'Te invito a mi evento',
        badge: 'Evento Especial',
        headline: 'Estás cordialmente invitado a celebrar con nosotros',
        themeColor: '#8b5cf6'
      }
    };

    const cfg = eventLabels[card.eventType] || eventLabels['cumpleanos'];

    let fullLocation = card.address;
    if (card.city) fullLocation += `, ${card.city}`;
    if (card.province) fullLocation += `, ${card.province}`;
    if (card.country) fullLocation += `, ${card.country}`;

    content = content
      .replace(/{{NAME}}/g, card.name || 'Festejado')
      .replace(/{{AGE}}/g, card.age || '')
      .replace(/{{DATE}}/g, card.date || 'Próximamente')
      .replace(/{{TIME}}/g, card.time || 'A coordinar')
      .replace(/{{ADDRESS}}/g, card.address || 'Ubicación')
      .replace(/{{CITY}}/g, card.city || '')
      .replace(/{{PROVINCE}}/g, card.province || '')
      .replace(/{{COUNTRY}}/g, card.country || 'Argentina')
      .replace(/{{MAPS_QUERY_ENCODED}}/g, encodeURIComponent(fullLocation))
      .replace(/{{PHOTO}}/g, card.photo || '')
      .replace(/{{ORDER_ID}}/g, orderId)
      .replace(/{{BADGE_TEXT}}/g, cfg.badge)
      .replace(/{{HEADLINE_TEXT}}/g, cfg.headline)
      .replace(/{{THEME_COLOR}}/g, cfg.themeColor)
      .replace(/{{OG_TITLE}}/g, cfg.ogTitle)
      .replace(/{{OG_DESC}}/g, cfg.ogDesc)
      .replace(/{{SHARE_TEXT}}/g, cfg.shareText);

    return content;
  }
};
