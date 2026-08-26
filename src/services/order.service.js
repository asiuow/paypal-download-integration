import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { tokenService } from '../security/token.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../../data/orders.json');

class OrderService {
  constructor() {
    this.orders = new Map();
    this.loadFromDisk();
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
    const shortId = orderId.slice(0, 8); // Identificador corto universal (ej: 9af8058c)
    const eventType = cardData.eventType || 'cumpleanos';
    
    const eventTitles = {
      'cumpleanos': 'Tarjeta de Cumpleaños',
      'bautismo': 'Tarjeta de Bautismo',
      'asado': 'Invitación a Gran Asado',
      'evento': 'Invitación a Evento Especial'
    };

    const order = {
      id: orderId,
      shortId: shortId,
      status: 'pending',
      item: {
        ...config.item,
        title: `${eventTitles[eventType] || 'Tarjeta Digital'} - ${cardData.name || 'Personalizada'}`,
        description: `Invitación interactiva para ${cardData.name || 'evento'} (${eventType})`
      },
      amount: config.item.unitPrice,
      currency: config.item.currencyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paypalOrderId: null,
      paymentId: null,
      downloadToken: null,
      cardData: {
        eventType: eventType,
        name: (cardData.name || 'Festejado').slice(0, 20),
        age: cardData.age || '',
        photo: cardData.photo || '',
        address: cardData.address || 'Av. Principal 123',
        city: cardData.city || 'Buenos Aires',
        province: cardData.province || 'Buenos Aires',
        country: cardData.country || 'Argentina',
        date: cardData.date || 'Sábado',
        time: cardData.time || '18:00 hs'
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

  approveOrder(orderId, paymentDetails = {}) {
    const order = this.getOrder(orderId);
    if (!order) return null;

    order.status = 'approved';
    order.paymentId = paymentDetails.id || null;
    order.paymentMethod = paymentDetails.paymentMethod || 'paypal';
    order.updatedAt = new Date().toISOString();
    order.downloadToken = tokenService.generateDownloadToken(order.id);

    this.saveToDisk();
    console.log(`[OrderService] Orden ${order.id} APROBADA (ShortId: ${order.shortId}).`);
    return order;
  }
}

export const orderService = new OrderService();
