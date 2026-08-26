import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.routes.js';
import downloadRoutes from './routes/download.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Seguridad de encabezados HTTP con Helmet (permitiendo scripts de PayPal SDK)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Habilitar CORS
app.use(cors());

// Parseo de payloads JSON (hasta 50mb para fotos de celulares)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir frontend público y recursos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Montaje de rutas
app.use('/api', apiRoutes);
app.use('/', downloadRoutes);

// Fallback a index.html para rutas no-API
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/tarjeta') ||
    req.path.startsWith('/p') ||
    req.path.startsWith('/t') ||
    req.path.startsWith('/v') ||
    req.path.startsWith('/audio')
  ) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

export default app;
