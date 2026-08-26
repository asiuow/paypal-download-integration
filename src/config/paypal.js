import { config } from './env.js';

let cachedToken = null;
let tokenExpiresAt = 0;

export const isConfigured = Boolean(
  config.paypal.clientId && config.paypal.clientSecret
);

export function getApiBaseUrl() {
  return config.paypal.mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

/**
 * Obtiene el token de acceso OAuth 2.0 de PayPal (con caché en memoria)
 */
export async function getPayPalAccessToken() {
  if (!isConfigured) {
    throw new Error('Credenciales de PayPal no configuradas en .env (PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET).');
  }

  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const auth = Buffer.from(
    `${config.paypal.clientId}:${config.paypal.clientSecret}`
  ).toString('base64');

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[PayPal Config] Error obteniendo OAuth Token:', errorText);
    throw new Error(`Error de autenticación con PayPal (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in * 1000);

  return cachedToken;
}
