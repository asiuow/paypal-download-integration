import { getPayPalAccessToken, getApiBaseUrl, isConfigured } from '../config/paypal.js';
import { orderService } from './order.service.js';

export const paypalService = {
  /**
   * Crea una orden oficial en PayPal Checkout v2 (POST /v2/checkout/orders)
   */
  async createOrder(order, baseUrl) {
    if (!isConfigured) {
      console.warn('[PayPal Service] Modo simulador activo (sin credenciales completas).');
      const mockPaypalOrderId = `MOCK-PP-${order.id.slice(0, 8)}`;
      orderService.setPayPalOrderId(order.id, mockPaypalOrderId);
      return {
        isMock: true,
        paypalOrderId: mockPaypalOrderId,
        orderId: order.id,
        status: 'CREATED'
      };
    }

    try {
      const accessToken = await getPayPalAccessToken();
      const apiUrl = getApiBaseUrl();

      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: order.id,
            custom_id: order.id,
            description: order.item.title.slice(0, 127),
            amount: {
              currency_code: order.currency || 'USD',
              value: Number(order.amount).toFixed(2)
            }
          }
        ],
        application_context: {
          brand_name: 'Pi Digital Cards',
          locale: 'es-ES',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${baseUrl}/?order_id=${order.id}`,
          cancel_url: `${baseUrl}/?order_id=${order.id}&status=cancelled`
        }
      };

      console.log(`[PayPal Service] Creando orden v2 para localOrderId: ${order.id} ($${order.amount} ${order.currency})`);

      const response = await fetch(`${apiUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PayPal Service] Error creando orden en PayPal:', errorText);
        throw new Error(`PayPal API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      orderService.setPayPalOrderId(order.id, data.id);

      const approveLink = data.links?.find(l => l.rel === 'approve')?.href;

      return {
        isMock: false,
        paypalOrderId: data.id,
        orderId: order.id,
        status: data.status,
        approveUrl: approveLink
      };
    } catch (error) {
      console.error('[PayPal Service] Excepción al crear orden:', error.message);
      throw error;
    }
  },

  /**
   * Captura el pago aprobado por el usuario (POST /v2/checkout/orders/{id}/capture)
   */
  async captureOrder(paypalOrderId, localOrderId) {
    if (!isConfigured || paypalOrderId.startsWith('MOCK-PP-')) {
      console.log(`[PayPal Service] Capturando orden simulada: ${paypalOrderId}`);
      const order = orderService.approveOrder(localOrderId, {
        id: `SIM-CAPTURE-${Date.now()}`,
        paymentMethod: 'paypal_simulated'
      });
      return { success: true, approved: true, isMock: true, order };
    }

    try {
      const accessToken = await getPayPalAccessToken();
      const apiUrl = getApiBaseUrl();

      console.log(`[PayPal Service] Capturando fondos para PayPal Order: ${paypalOrderId}`);

      const response = await fetch(`${apiUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PayPal Service] Error capturando orden:', errorText);
        throw new Error(`PayPal Capture Error (${response.status}): ${errorText}`);
      }

      const captureData = await response.json();
      console.log(`[PayPal Service] Orden ${paypalOrderId} capturada con estado: ${captureData.status}`);

      if (captureData.status === 'COMPLETED') {
        const purchaseUnit = captureData.purchase_units?.[0];
        const targetOrderId = localOrderId || purchaseUnit?.reference_id || purchaseUnit?.custom_id;
        const captureObj = purchaseUnit?.payments?.captures?.[0] || { id: paypalOrderId };

        const order = orderService.approveOrder(targetOrderId, {
          id: captureObj.id,
          paymentMethod: 'paypal'
        });

        return {
          success: true,
          approved: true,
          status: captureData.status,
          orderId: order?.id,
          captureId: captureObj.id
        };
      }

      return {
        success: false,
        approved: false,
        status: captureData.status,
        details: captureData
      };
    } catch (error) {
      console.error('[PayPal Service] Excepción al capturar orden:', error.message);
      throw error;
    }
  },

  /**
   * Procesa la señal oficial de Webhook de PayPal (PAYMENT.CAPTURE.COMPLETED)
   */
  async handleWebhook(headers, body) {
    console.log('[PayPal Webhook] Evento recibido:', body?.event_type);

    const eventType = body?.event_type;
    const resource = body?.resource;

    if (!eventType || !resource) {
      return { handled: false, message: 'Payload de webhook inválido' };
    }

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const customId = resource.custom_id;
      const orderId = customId || resource.supplementary_data?.related_ids?.order_id;

      if (!orderId) {
        console.warn('[PayPal Webhook] Captura completada sin custom_id vinculado.');
        return { handled: true, message: 'Captura sin orden identificable' };
      }

      const order = orderService.approveOrder(orderId, {
        id: resource.id,
        paymentMethod: 'paypal_webhook'
      });

      console.log(`[PayPal Webhook] Orden ${orderId} aprobada exitosamente vía Webhook.`);
      return { handled: true, approved: true, orderId: order?.id };
    }

    return { handled: true, eventType, message: 'Evento procesado sin acción requerida' };
  },

  /**
   * Simulación local de pago para testing
   */
  simulatePaymentApproval(orderId) {
    const order = orderService.getOrder(orderId);
    if (!order) return null;

    return orderService.approveOrder(orderId, {
      id: `SIM-PP-${Date.now()}`,
      paymentMethod: 'paypal_simulated'
    });
  }
};
