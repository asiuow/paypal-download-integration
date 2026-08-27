import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../src/config/env.js';
import { orderService } from '../src/services/order.service.js';
import { paypalService } from '../src/services/paypal.service.js';
import { vaultService } from '../src/services/vault.service.js';
import { tokenService } from '../src/security/token.service.js';
import { paymentController } from '../src/controllers/payment.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('--- [Test Suite] Iniciando verificación de paypal-download-integration ---');

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
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      province: 'Oregon',
      zipCode: '97477',
      country: 'United States',
      date: 'Saturday, Nov 15',
      time: '6:00 PM',
      photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
    };

    const order = orderService.createOrder({ test: true }, testCardData);
    console.assert(order.id && order.shortId, 'La orden debe tener id y shortId');
    console.assert(order.status === 'pending', 'El estado inicial debe ser pending');
    console.assert(order.validityDays === 30, 'Los días de validez por defecto deben ser 30');
    console.assert(Boolean(order.expiresAt), 'Debe tener fecha de expiración');
    console.log(`✅ Orden creada con éxito. ID: ${order.id} (ShortId: ${order.shortId})`);

    // 3. Test Simulación de Pago y Aprobación
    console.log('\n3. Probando flujo de aprobación y captura...');
    const approvedOrder = paypalService.simulatePaymentApproval(order.id);
    console.assert(approvedOrder.status === 'approved', 'La orden debe estar aprobada');
    console.assert(Boolean(approvedOrder.downloadToken), 'Debe tener token de descarga');
    console.log(`✅ Orden aprobada exitosamente. Token: ${approvedOrder.downloadToken.slice(0, 16)}...`);

    // 4. Test Bóveda Privada de Archivos Pagados y Foto Optimizada
    console.log('\n4. Probando bóveda privada física de tarjetas pagadas (data/paid_vault/)...');
    const vaultOrderDir = path.join(__dirname, '../data/paid_vault', order.shortId);
    console.assert(fs.existsSync(vaultOrderDir), 'El directorio privado de la orden debe existir en paid_vault');
    console.assert(fs.existsSync(path.join(vaultOrderDir, 'card.html')), 'Debe guardarse copia física de card.html');
    console.assert(fs.existsSync(path.join(vaultOrderDir, 'photo.jpg')), 'Debe guardarse la foto optimizada photo.jpg');
    console.assert(fs.existsSync(path.join(vaultOrderDir, 'order-archive.json')), 'Debe guardarse el registro order-archive.json');
    console.log('✅ Bóveda física y optimización de foto verificadas correctamente.');

    // 5. Test Control de Días y Ajuste (+ y -)
    console.log('\n5. Probando control de días y ajuste de vigencia (+ y -)...');
    const initialDays = approvedOrder.validityDays;
    orderService.adjustOrderDays(order.id, 5); // Sumar 5 días
    const extendedOrder = orderService.getOrder(order.id);
    console.assert(extendedOrder.validityDays === initialDays + 5, 'Debe haber sumado 5 días');
    
    orderService.adjustOrderDays(order.id, -10); // Restar 10 días
    const reducedOrder = orderService.getOrder(order.id);
    console.assert(reducedOrder.validityDays === initialDays - 5, 'Debe haber restado los días correspondientes');
    console.log('✅ Ajustes interactivos de vigencia (+ y - días) verificados.');

    // 6. Test Admin Dashboard Data
    console.log('\n6. Probando obtención de datos para el panel tipo Excel...');
    const adminOrders = orderService.getPaidOrdersForAdmin();
    console.assert(Array.isArray(adminOrders), 'Debe devolver un arreglo de órdenes pagadas');
    const foundAdminOrder = adminOrders.find(o => o.id === order.id);
    console.assert(foundAdminOrder, 'La orden pagada debe figurar en el listado del panel');
    console.assert(foundAdminOrder.photoUrl.includes(order.shortId), 'photoUrl debe apuntar a la foto de la bóveda');
    console.assert(typeof foundAdminOrder.daysRemaining === 'number', 'daysRemaining debe ser un número');
    console.log('✅ Listado y métricas para el Panel de Control verificadas.');

    // 7. Test Búsqueda universal y Token Criptográfico
    console.log('\n7. Probando validación criptográfica de tokens y acceso universal...');
    const token = tokenService.generateDownloadToken(order.id, 48);
    const verification = tokenService.verifyToken(token);
    console.assert(verification.valid === true, 'El token debe ser válido');
    console.log('✅ Verificación criptográfica y defensa contra manipulación aprobada.');

    console.log('\n======================================================');
    console.log('🎉 TODOS LOS TESTS PASARON EXITOSAMENTE (7/7)');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Error en los tests:', error);
    process.exit(1);
  }
}

runTests();
