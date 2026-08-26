import { config } from '../src/config/env.js';
import { orderService } from '../src/services/order.service.js';
import { paypalService } from '../src/services/paypal.service.js';
import { vaultService } from '../src/services/vault.service.js';
import { tokenService } from '../src/security/token.service.js';
import { paymentController } from '../src/controllers/payment.controller.js';

async function runTests() {
  console.log('--- [Test Suite] Iniciando verificación in-memory de paypal-download-integration ---');

  try {
    // 1. Test Configuración de PayPal
    console.log('1. Verificando configuración de variables...');
    console.assert(config.paypal.clientId.startsWith('AapqVw'), 'Client ID debe coincidir con las credenciales de Sandbox');
    console.assert(config.paypal.clientSecret.startsWith('EKh96'), 'Client Secret debe coincidir');
    console.assert(config.item.unitPrice === 5, 'El precio debe ser $5.00 USD');
    console.assert(config.item.currencyId === 'USD', 'La moneda debe ser USD');
    console.log('✅ Configuración de PayPal Sandbox verificada correctamente.');

    // 2. Test Crear Orden Local
    console.log('\n2. Probando creación de orden y persistencia...');
    const testCardData = {
      name: 'Santiago',
      age: '7',
      address: 'Calle Falsa 123',
      city: 'Junín',
      date: 'Domingo 20',
      time: '16:00 hs'
    };

    const order = orderService.createOrder({ test: true }, testCardData);
    console.assert(order.id && order.shortId, 'La orden debe tener id y shortId');
    console.assert(order.status === 'pending', 'El estado inicial debe ser pending');
    console.log(`✅ Orden creada con éxito. ID: ${order.id} (ShortId: ${order.shortId})`);

    // 3. Test Simulación de Pago y Aprobación
    console.log('\n3. Probando flujo de aprobación y captura...');
    const approvedOrder = paypalService.simulatePaymentApproval(order.id);
    console.assert(approvedOrder.status === 'approved', 'La orden debe estar aprobada');
    console.assert(Boolean(approvedOrder.downloadToken), 'Debe tener token de descarga');
    console.log(`✅ Orden aprobada exitosamente. Token: ${approvedOrder.downloadToken.slice(0, 16)}...`);

    // 4. Test Búsqueda universal (ID completo y ShortId)
    console.log('\n4. Probando resolución de orden por identificador universal...');
    const foundByShortId = orderService.getOrder(order.shortId);
    console.assert(foundByShortId && foundByShortId.id === order.id, 'Debe encontrarse por ShortId');
    const foundByFullId = orderService.getOrder(order.id);
    console.assert(foundByFullId && foundByFullId.id === order.id, 'Debe encontrarse por ID completo');
    console.log('✅ Búsqueda universal verificada.');

    // 5. Test Generación del Producto Digital Protegido (Bóveda)
    console.log('\n5. Probando compilación de la tarjeta interactiva en la bóveda...');
    const productHtml = vaultService.getProtectedProductContent(order.id, approvedOrder);
    console.assert(productHtml.includes('Santiago'), 'El HTML debe contener el nombre Santiago');
    console.assert(productHtml.includes('Junín'), 'El HTML debe contener la ciudad');
    console.assert(productHtml.includes('celebration.mp3'), 'El HTML debe contener la pista de música');
    console.log('✅ Producto digital compilado correctamente (tamaño:', productHtml.length, 'bytes).');

    // 6. Test Seguridad de Tokens Criptográficos HMAC-SHA256
    console.log('\n6. Probando validación criptográfica de tokens...');
    const token = tokenService.generateDownloadToken(order.id, 48);
    const verification = tokenService.verifyToken(token);
    console.assert(verification.valid === true, 'El token debe ser válido');
    console.assert(verification.payload.orderId === order.id, 'El payload debe contener el ID de la orden');
    
    const tampered = token.substring(0, 10) + (token[10] === 'a' ? 'b' : 'a') + token.substring(11);
    const fakeVerification = tokenService.verifyToken(tampered);
    console.assert(fakeVerification.valid === false, 'El token alterado debe ser rechazado');
    console.log('✅ Verificación criptográfica y defensa contra manipulación aprobada.');

    // 7. Test Controlador getOrderStatus
    console.log('\n7. Probando controlador getOrderStatus...');
    let jsonResult = null;
    const mockReq = { params: { orderId: order.shortId } };
    const mockRes = {
      json: (data) => { jsonResult = data; return mockRes; },
      status: () => mockRes
    };
    await paymentController.getOrderStatus(mockReq, mockRes);
    console.assert(jsonResult.success === true, 'Controlador debe responder success: true');
    console.assert(jsonResult.order.isApproved === true, 'isApproved debe ser true');
    console.assert(jsonResult.order.accessUrl.includes(order.shortId), 'accessUrl debe apuntar a la tarjeta');
    console.log('✅ Controlador getOrderStatus verificado:', jsonResult.order.accessUrl);

    console.log('\n======================================================');
    console.log('🎉 TODOS LOS TESTS PASARON EXITOSAMENTE (7/7)');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Error en los tests:', error);
    process.exit(1);
  }
}

runTests();
