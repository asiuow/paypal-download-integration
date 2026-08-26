import { orderService } from '../services/order.service.js';
import { paypalService } from '../services/paypal.service.js';
import { config } from '../config/env.js';

function getBaseUrl(req) {
  if (config.baseUrl) return config.baseUrl.replace(/\/$/, '');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
}

export const paymentController = {
  /**
   * Crea una orden de compra e inicia el checkout con PayPal v2
   */
  async createPayPalOrder(req, res) {
    try {
      const baseUrl = getBaseUrl(req);
      const cardData = req.body?.cardData || {};

      const order = orderService.createOrder(
        {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        cardData
      );

      const result = await paypalService.createOrder(order, baseUrl);

      return res.status(201).json({
        success: true,
        orderId: order.id,
        shortId: order.shortId,
        paypalOrderId: result.paypalOrderId,
        amount: order.amount,
        currency: order.currency,
        approveUrl: result.approveUrl,
        isMock: result.isMock
      });
    } catch (error) {
      console.error('[PaymentController] Error creando orden en PayPal:', error);
      return res.status(500).json({
        success: false,
        error: 'No se pudo iniciar la orden de PayPal.',
        details: error.message
      });
    }
  },

  /**
   * Captura los fondos una vez que el comprador aprueba el pago en PayPal
   */
  async capturePayPalOrder(req, res) {
    try {
      const { paypalOrderId } = req.params;
      const { localOrderId } = req.body || {};

      if (!paypalOrderId) {
        return res.status(400).json({ success: false, error: 'paypalOrderId requerido' });
      }

      const result = await paypalService.captureOrder(paypalOrderId, localOrderId);

      if (result.approved) {
        const order = orderService.getOrder(localOrderId || result.orderId);
        const cleanUrl = `/tarjeta/${order?.shortId || order?.id}`;
        return res.json({
          success: true,
          approved: true,
          accessUrl: cleanUrl,
          orderId: order?.id
        });
      }

      return res.status(400).json({
        success: false,
        approved: false,
        message: 'No se pudo completar la captura del pago.',
        result
      });
    } catch (error) {
      console.error('[PaymentController] Error capturando orden:', error);
      return res.status(500).json({
        success: false,
        error: 'Error al procesar la captura de fondos con PayPal.',
        details: error.message
      });
    }
  },

  /**
   * Consulta el estado de una orden en tiempo real
   */
  async getOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const order = orderService.getOrder(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Orden no encontrada'
        });
      }

      const isApproved = order.status === 'approved' || order.status === 'delivered';
      const cleanUrl = `/tarjeta/${order.shortId || order.id}`;

      return res.json({
        success: true,
        order: {
          id: order.id,
          shortId: order.shortId,
          status: order.status,
          amount: order.amount,
          currency: order.currency,
          createdAt: order.createdAt,
          isApproved,
          accessUrl: isApproved ? cleanUrl : null
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error consultando estado de la orden'
      });
    }
  },

  /**
   * Webhook oficial de PayPal (PAYMENT.CAPTURE.COMPLETED)
   */
  async handleWebhook(req, res) {
    try {
      const result = await paypalService.handleWebhook(req.headers, req.body);
      return res.status(200).json({ success: true, result });
    } catch (error) {
      console.error('[PaymentController] Error procesando webhook:', error.message);
      return res.status(200).json({ success: false, error: error.message });
    }
  },

  /**
   * Simulador de Pago para testing local
   */
  async simulatePayment(req, res) {
    try {
      const { orderId } = req.params;
      const order = paypalService.simulatePaymentApproval(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Orden no encontrada para simulación'
        });
      }

      const cleanUrl = `/tarjeta/${order.shortId || order.id}`;

      return res.json({
        success: true,
        message: 'Pago simulado aprobado exitosamente.',
        order: {
          id: order.id,
          shortId: order.shortId,
          status: order.status,
          accessUrl: cleanUrl
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};
