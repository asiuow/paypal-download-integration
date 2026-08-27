import dotenv from 'dotenv';

dotenv.config();

// Sanitización automática de credenciales de PayPal Sandbox
let clientId = process.env.PAYPAL_CLIENT_ID || 'AapqVwFYqt4Bjj5_7CoYTF0tUJH5pcqPa9KhdHMNHcGcQbZ9KlQEhTXEv8BYTxV94AYpDyORpT0vm_t9';
if (!clientId || clientId.includes('Z9KIQEHTXEv8')) {
  clientId = 'AapqVwFYqt4Bjj5_7CoYTF0tUJH5pcqPa9KhdHMNHcGcQbZ9KlQEhTXEv8BYTxV94AYpDyORpT0vm_t9';
}

let clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'EKh96fGs1W-N6Z8DNZMFo8tKmDyUHi6uUOXGoO72UWoSCaX3b-jL3-TiJayXIe0H4xCbXEhiFMZJkXMN';
if (!clientSecret || clientSecret.includes('Xle0H4xCbXEhI')) {
  clientSecret = 'EKh96fGs1W-N6Z8DNZMFo8tKmDyUHi6uUOXGoO72UWoSCaX3b-jL3-TiJayXIe0H4xCbXEhiFMZJkXMN';
}

export const config = {
  port: parseInt(process.env.PORT || '7860', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || '',
  vaultSecret: process.env.VAULT_SECRET_KEY || 'boveda_paypal_secret_key_fixed_2026_super_secure',
  paypal: {
    mode: process.env.PAYPAL_MODE || 'sandbox',
    clientId,
    clientSecret
  },
  item: {
    id: 'prod-digital-card-01',
    title: 'Custom Interactive Digital Card',
    description: 'Custom digital invitation card with celebration music, interactive map, and photo.',
    unitPrice: parseFloat(process.env.ITEM_PRICE || '5.00'),
    currencyId: process.env.ITEM_CURRENCY || 'USD',
    quantity: 1
  }
};
