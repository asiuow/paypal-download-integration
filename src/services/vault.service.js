import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VAULT_FILE_PATH = path.join(__dirname, '../vault/product-app.html');

export const vaultService = {
  getProtectedProductContent(orderId, order = {}) {
    if (!fs.existsSync(VAULT_FILE_PATH)) {
      throw new Error('Card template not found in vault.');
    }

    let content = fs.readFileSync(VAULT_FILE_PATH, 'utf8');
    const card = order.cardData || {
      eventType: 'cumpleanos',
      name: 'Honoree',
      age: '5',
      photo: '',
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      province: 'Oregon',
      zipCode: '97477',
      country: 'United States',
      date: 'Saturday, Nov 15',
      time: '6:00 PM'
    };

    const eventLabels = {
      'cumpleanos': {
        ogTitle: 'Birthday Invitation',
        ogDesc: 'Tap to view the invitation',
        shareText: 'Hi, here is the invitation:',
        badge: card.age ? `Turning ${card.age}!` : 'Happy Birthday!',
        headline: 'You are invited to celebrate together!',
        themeColor: '#f43f5e'
      },
      'bautismo': {
        ogTitle: 'Baptism Invitation',
        ogDesc: 'Tap to view the invitation',
        shareText: 'Hi, here is the invitation:',
        badge: 'Holy Baptism',
        headline: 'Join us in celebrating this sacred and blessed milestone',
        themeColor: '#0284c7'
      },
      'asado': {
        ogTitle: 'Barbecue Invitation',
        ogDesc: 'Tap to view the invitation',
        shareText: 'Hi, here is the invitation:',
        badge: 'Great Barbecue!',
        headline: 'The grill is fired up! Come enjoy good food and friends',
        themeColor: '#ea580c'
      },
      'evento': {
        ogTitle: 'Special Event Invitation',
        ogDesc: 'Tap to view the invitation',
        shareText: 'Hi, here is the invitation:',
        badge: 'Special Celebration',
        headline: 'You are cordially invited to celebrate with us',
        themeColor: '#7c3aed'
      }
    };

    const cfg = eventLabels[card.eventType] || eventLabels['cumpleanos'];

    let fullLocation = card.address || '';
    if (card.city) fullLocation += `, ${card.city}`;
    if (card.province) fullLocation += `, ${card.province}`;
    if (card.zipCode) fullLocation += ` ${card.zipCode}`;
    if (card.country) fullLocation += `, ${card.country}`;

    content = content
      .replace(/{{NAME}}/g, card.name || 'Honoree')
      .replace(/{{AGE}}/g, card.age || '')
      .replace(/{{DATE}}/g, card.date || 'Coming Soon')
      .replace(/{{TIME}}/g, card.time || 'TBD')
      .replace(/{{ADDRESS}}/g, card.address || 'Location')
      .replace(/{{CITY}}/g, card.city || '')
      .replace(/{{PROVINCE}}/g, card.province || '')
      .replace(/{{ZIP_CODE}}/g, card.zipCode || '')
      .replace(/{{COUNTRY}}/g, card.country || 'United States')
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
