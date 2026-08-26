import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '7860', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || '',
  vaultSecret: process.env.VAULT_SECRET_KEY || 'boveda_paypal_secret_key_fixed_2026_super_secure',
  paypal: {
    mode: process.env.PAYPAL_MODE || 'sandbox',
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || ''
  },
  item: {
    id: 'prod-digital-card-01',
    title: 'Tarjeta Digital Interactiva Personalizada',
    description: 'Invitación con música festiva, mapa gráfico y foto personalizada.',
    unitPrice: parseFloat(process.env.ITEM_PRICE || '5.00'),
    currencyId: process.env.ITEM_CURRENCY || 'USD',
    quantity: 1
  }
};
