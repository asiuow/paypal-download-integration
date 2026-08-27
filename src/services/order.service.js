import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { tokenService } from '../security/token.service.js';
import { vaultStorageService } from './vault-storage.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../../data/orders.json');
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

class OrderService {
  constructor() {
    this.orders = new Map();
    this.settings = { defaultValidityDays: 30 };
    this.loadFromDisk();
    this.loadSettings();
  }

  loadSettings() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (e) {
      console.warn('[OrderService] Error loading settings from disk:', e.message);
    }
  }

  saveSettings() {
    try {
      const dir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (e) {
      console.error('[OrderService] Error saving settings to disk:', e.message);
    }
  }

  getDefaultValidityDays() {
    return this.settings.defaultValidityDays || 30;
  }

  setDefaultValidityDays(days) {
    const num = Math.max(1, parseInt(days, 10) || 30);
    this.settings.defaultValidityDays = num;
    this.saveSettings();
    return num;
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const list = JSON.parse(raw);
        for (const ord of list) {
          if (ord && ord.id) {
            this.orders.set(ord.id, ord);
          }
        }
        console.log(`[OrderService] ${this.orders.size} órdenes cargadas desde el almacenamiento persistente.`);
      }
    } catch (e) {
      console.warn('[OrderService] Error cargando órdenes de disco:', e.message);
    }
  }

  saveToDisk() {
    try {
      const list = Array.from(this.orders.values());
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.error('[OrderService] Error guardando en disco:', e.message);
    }
  }

  /**
   * Crea una nueva orden vinculada a los datos del archivo/tarjeta
   */
  createOrder(metadata = {}, cardData = {}) {
    const orderId = uuidv4();
    const shortId = orderId.slice(0, 8);
    const eventType = cardData.eventType || 'cumpleanos';
    const defaultDays = this.getDefaultValidityDays();
    
    const eventTitles = {
      'cumpleanos': 'Birthday Invitation',
      'bautismo': 'Baptism Invitation',
      'asado': 'Barbecue Invitation',
      'evento': 'Special Event Invitation'
    };

    const order = {
      id: orderId,
      shortId: shortId,
      status: 'pending',
      item: {
        ...config.item,
        title: `${eventTitles[eventType] || 'Digital Card'} - ${cardData.name || 'Custom'}`,
        description: `Interactive invitation for ${cardData.name || 'event'} (${eventType})`
      },
      amount: config.item.unitPrice,
      currency: config.item.currencyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paidAt: null,
      validityDays: defaultDays,
      expiresAt: new Date(Date.now() + (defaultDays * 24 * 60 * 60 * 1000)).toISOString(),
      paypalOrderId: null,
      paymentId: null,
      downloadToken: null,
      cardData: {
        eventType: eventType,
        name: (cardData.name || 'Honoree').slice(0, 20),
        age: cardData.age || '',
        photo: cardData.photo || '',
        address: cardData.address || '742 Evergreen Terrace',
        city: cardData.city || 'Springfield',
        province: cardData.province || cardData.state || 'Oregon',
        zipCode: cardData.zipCode || '97477',
        country: cardData.country || 'United States',
        date: cardData.date || 'Saturday, Nov 15',
        time: cardData.time || '6:00 PM'
      },
      metadata
    };

    this.orders.set(orderId, order);
    this.saveToDisk();
    return order;
  }

  /**
   * Búsqueda universal por ID completo, ID corto o Token firmado
   */
  getOrder(identifier) {
    if (!identifier) return null;

    // 1. Coincidencia directa por ID completo
    if (this.orders.has(identifier)) {
      return this.orders.get(identifier);
    }

    // 2. Coincidencia por ID corto o paypalOrderId o downloadToken
    for (const [id, ord] of this.orders.entries()) {
      if (
        ord.shortId === identifier ||
        id.startsWith(identifier) ||
        ord.paypalOrderId === identifier ||
        ord.downloadToken === identifier
      ) {
        return ord;
      }
    }

    // 3. Coincidencia decodificando token criptográfico
    const verification = tokenService.verifyToken(identifier, false);
    if (verification.valid && verification.payload?.orderId) {
      return this.orders.get(verification.payload.orderId) || null;
    }

    return null;
  }

  setPayPalOrderId(orderId, paypalOrderId) {
    const order = this.getOrder(orderId);
    if (order) {
      order.paypalOrderId = paypalOrderId;
      order.updatedAt = new Date().toISOString();
      this.saveToDisk();
    }
    return order;
  }

  /**
   * Aprueba una orden al acreditarse el pago
   * Crea una copia física en la bóveda privada (data/paid_vault/)
   */
  approveOrder(orderId, paymentDetails = {}) {
    const order = this.getOrder(orderId);
    if (!order) return null;

    const now = new Date();
    const validityDays = order.validityDays || this.getDefaultValidityDays();

    order.status = 'approved';
    order.paymentId = paymentDetails.id || null;
    order.paymentMethod = paymentDetails.paymentMethod || 'paypal';
    order.paidAt = now.toISOString();
    order.updatedAt = now.toISOString();
    order.validityDays = validityDays;
    order.expiresAt = new Date(now.getTime() + (validityDays * 24 * 60 * 60 * 1000)).toISOString();
    order.downloadToken = tokenService.generateDownloadToken(order.id);

    this.saveToDisk();
    console.log(`[OrderService] Orden ${order.id} APROBADA (ShortId: ${order.shortId}). Caduca: ${order.expiresAt}`);

    // Crear copia física en la bóveda privada
    try {
      vaultStorageService.archivePaidCard(order);
    } catch (err) {
      console.warn('[OrderService] Error archivando tarjeta en bóveda:', err.message);
    }

    return order;
  }

  /**
   * Ajusta los días de vigencia de una tarjeta específica (+ o - días)
   */
  adjustOrderDays(orderId, deltaDays) {
    const order = this.getOrder(orderId);
    if (!order) return null;

    const currentExpire = new Date(order.expiresAt || order.createdAt).getTime();
    const newExpireTime = currentExpire + (deltaDays * 24 * 60 * 60 * 1000);
    order.expiresAt = new Date(newExpireTime).toISOString();
    order.validityDays = Math.max(0, (order.validityDays || 30) + deltaDays);
    order.updatedAt = new Date().toISOString();

    this.saveToDisk();

    try {
      vaultStorageService.archivePaidCard(order);
    } catch (err) {
      console.warn('[OrderService] Error actualizando archivo en bóveda:', err.message);
    }

    return order;
  }

  /**
   * Obtiene todas las órdenes pagadas con información calculada de días restantes para el panel
   */
  getPaidOrdersForAdmin() {
    const paidList = [];
    const now = Date.now();

    for (const order of this.orders.values()) {
      if (order.status === 'approved') {
        const expireTime = new Date(order.expiresAt || order.createdAt).getTime();
        const diffMs = expireTime - now;
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isExpired = diffMs <= 0;

        paidList.push({
          id: order.id,
          shortId: order.shortId,
          eventType: order.cardData?.eventType || 'cumpleanos',
          name: order.cardData?.name || 'Honoree',
          age: order.cardData?.age || '',
          address: order.cardData?.address || '',
          city: order.cardData?.city || '',
          state: order.cardData?.province || order.cardData?.state || '',
          zipCode: order.cardData?.zipCode || '',
          country: order.cardData?.country || 'United States',
          date: order.cardData?.date || '',
          time: order.cardData?.time || '',
          amount: order.amount || 5.00,
          currency: order.currency || 'USD',
          paidAt: order.paidAt || order.updatedAt,
          expiresAt: order.expiresAt,
          validityDays: order.validityDays || 30,
          daysRemaining: daysRemaining,
          isExpired: isExpired,
          hasPhoto: Boolean(order.cardData?.photo),
          photoUrl: order.cardData?.photo ? `/api/admin/photo/${order.shortId}` : null,
          directUrl: `/tarjeta/${order.shortId}`
        });
      }
    }

    // Ordenar por fecha de pago más reciente primero
    paidList.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
    return paidList;
  }
}

export const orderService = new OrderService();
