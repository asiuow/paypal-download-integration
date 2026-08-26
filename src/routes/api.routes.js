import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { config } from '../config/env.js';

const router = Router();

// Configuración pública para el cliente (solo el Client ID público)
router.get('/config', (req, res) => {
  res.json({
    clientId: config.paypal.clientId,
    currency: config.item.currencyId,
    price: config.item.unitPrice,
    itemTitle: config.item.title
  });
});

// Crear orden de compra en PayPal
router.post('/paypal/create-order', paymentController.createPayPalOrder);

// Capturar fondos de la orden aprobada
router.post('/paypal/capture-order/:paypalOrderId', paymentController.capturePayPalOrder);

// Polling del estado de la orden
router.get('/order-status/:orderId', paymentController.getOrderStatus);

// Webhook oficial de PayPal (PAYMENT.CAPTURE.COMPLETED)
router.post('/webhook', paymentController.handleWebhook);

// Simulador de pago para desarrollo/pruebas locales
router.post('/simulate-payment/:orderId', paymentController.simulatePayment);

export default router;
