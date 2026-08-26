# PayPal Download Integration (PayPal Checkout v2)

Plataforma modular para venta, pago internacional y entrega automatizada de archivos y tarjetas digitales interactivas utilizando **PayPal REST API v2**, Webhooks y bóveda segura.

---

## 🏛️ Arquitectura de Dos Bases

El proyecto está diseñado separando estrictamente la **Base Privada (Servidor y Secretos)** de la **Base Pública (Cliente y Frontend)**:

```
paypal-download-integration/
├── .env                     # 🔒 BASE PRIVADA: Clave Secreta PayPal + Tokens HMAC (IGNORADO EN GIT)
├── .gitignore               # 🔒 Blindaje: nunca expone .env, datos ni node_modules
├── .env.example             # 🌐 BASE PÚBLICA: Plantilla de configuración
├── package.json
├── README.md                # 🌐 Documentación
├── data/                    # 🔒 BASE PRIVADA: Base de datos local persistente de órdenes
│   └── orders.json
├── src/                     # 🔒 BASE PRIVADA (Backend / Servidor)
│   ├── server.js            # Punto de arranque Express
│   ├── app.js               # Middlewares (Helmet, CORS, JSON, Rutas)
│   ├── config/
│   │   ├── env.js           # Variables de entorno
│   │   └── paypal.js        # Cliente API REST v2 (OAuth 2.0 en Sandbox/Live)
│   ├── services/
│   │   ├── paypal.service.js# Creación de orden v2, Captura, Validación y Webhook
│   │   ├── order.service.js # Gestión de órdenes y persistencia
│   │   └── vault.service.js # Bóveda de compilación del producto digital
│   ├── controllers/
│   │   ├── payment.controller.js # Endpoints PayPal REST v2
│   │   └── download.controller.js# Servidor del archivo digital / tarjeta activada
│   ├── routes/
│   │   ├── api.routes.js
│   │   └── download.routes.js
│   ├── security/
│   │   └── token.service.js # Firmas criptográficas HMAC-SHA256
│   └── vault/
│       └── product-app.html # Producto digital protegido para entrega
└── public/                  # 🌐 BASE PÚBLICA (Frontend / Cliente)
    ├── index.html           # Interfaz del generador + SDK de PayPal (Client ID público)
    ├── css/
    │   └── style.css        # Estilos visuales
    ├── js/
    │   └── app.js           # Lógica frontend con PayPal Buttons SDK y Polling
    └── audio/
        └── celebration.mp3  # Audio festivo precargado
```

---

## 🚀 Instalación y Puesta en Marcha

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
El archivo `.env` ya contiene tus credenciales de **Sandbox**:
```ini
PORT=7860
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=AapqVwFYqt4Bjj5_7CoYTF0tUJH5pcqPa9KhdHMNHcGcQbZ9KIQEHTXEv8BYTxV94AYpDyORpT0vm_t9
PAYPAL_CLIENT_SECRET=EKh96fGs1W-N6Z8DNZMFo8tKmDyUHi6uUOXGoO72UWoSCaX3b-jL3-TiJayXle0H4xCbXEhIFMZJkXMN
ITEM_PRICE=5.00
ITEM_CURRENCY=USD
```

### 3. Ejecutar las pruebas automáticas
```bash
npm test
```

### 4. Iniciar el servidor local
```bash
npm start
```
Abre en tu navegador: `http://localhost:7860`

---

## 📦 Subir a GitHub

El proyecto ya tiene configurado el `.gitignore` para garantizar que la **Base Privada** (`.env` con tu clave secreta) nunca sea subida al repositorio público.

### Pasos para publicar en tu GitHub:
1. Crea un nuevo repositorio en tu cuenta de GitHub (ejemplo: `paypal-download-integration`).
2. En tu terminal ejecuta:
```bash
cd /Users/mauroferreyra/.gemini/antigravity/scratch/paypal-download-integration
git init
git add .
git commit -m "feat: Initial commit with PayPal Checkout v2 and digital vault delivery"
git branch -M main
git remote add origin git@github.com:asiuow/paypal-download-integration.git
git push -u origin main
```
