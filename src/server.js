import app from './app.js';
import { config } from './config/env.js';

const PORT = config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
======================================================
  🚀 PayPal Digital Vault Server Activo
  📍 Puerto: ${PORT}
  🌍 Modo PayPal: ${config.paypal.mode.toUpperCase()}
  💳 Moneda / Precio: $${config.item.unitPrice} ${config.item.currencyId}
  🔑 Client ID: ${config.paypal.clientId ? config.paypal.clientId.slice(0, 10) + '...' : 'NO CONFIGURADO'}
======================================================
  `);
});
