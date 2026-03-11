require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { initDB, seedDB } = require('./db');

// ── Sentry (опционально, если SENTRY_DSN задан) ──────────────────────────────
let Sentry = null;
if (process.env.SENTRY_DSN) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.1,
    });
    console.log('✅ Sentry initialized');
  } catch (e) {
    console.warn('⚠️ Sentry not installed (run: npm i @sentry/node)');
  }
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// ── WebSocket (Socket.IO) ──────────────────────────────────────────────────────
const io = new SocketIO(server, {
  cors: corsOptions,
  pingTimeout: 60000,
});

// Комнаты: map:{mapId} — все редакторы одной карты
io.on('connection', (socket) => {
  socket.on('join-map', ({ mapId, userEmail, userName }) => {
    socket.join(`map:${mapId}`);
    socket.data = { mapId, userEmail, userName };
    socket.to(`map:${mapId}`).emit('user-joined', { email: userEmail, name: userName });
  });

  // Синхронизация перемещения узла
  socket.on('node-move', ({ mapId, nodeId, x, y }) => {
    socket.to(`map:${mapId}`).emit('node-move', { nodeId, x, y, from: socket.data?.userEmail });
  });

  // Синхронизация изменения поля узла
  socket.on('node-update', ({ mapId, node }) => {
    socket.to(`map:${mapId}`).emit('node-update', { node, from: socket.data?.userEmail });
  });

  // Синхронизация добавления узла
  socket.on('node-add', ({ mapId, node }) => {
    socket.to(`map:${mapId}`).emit('node-add', { node, from: socket.data?.userEmail });
  });

  // Синхронизация удаления узла
  socket.on('node-delete', ({ mapId, nodeId }) => {
    socket.to(`map:${mapId}`).emit('node-delete', { nodeId, from: socket.data?.userEmail });
  });

  // Синхронизация рёбер
  socket.on('edge-update', ({ mapId, edges }) => {
    socket.to(`map:${mapId}`).emit('edge-update', { edges, from: socket.data?.userEmail });
  });

  // Курсор (live presence)
  socket.on('cursor-move', ({ mapId, x, y }) => {
    socket.to(`map:${mapId}`).emit('cursor-move', {
      email: socket.data?.userEmail,
      name: socket.data?.userName,
      x, y,
    });
  });

  socket.on('leave-map', ({ mapId }) => {
    socket.leave(`map:${mapId}`);
    socket.to(`map:${mapId}`).emit('user-left', { email: socket.data?.userEmail });
  });

  socket.on('disconnect', () => {
    if (socket.data?.mapId) {
      socket.to(`map:${socket.data.mapId}`).emit('user-left', { email: socket.data?.userEmail });
    }
  });
});

// Экспортируем io для использования в роутах
app.set('io', io);

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Sentry request handler (должен быть первым middleware) ───────────────────
if (Sentry) {
  app.use(Sentry.Handlers.requestHandler());
}

// ── Stripe Webhook (нужен raw body ПЕРЕД json-парсером) ───────────────────────
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// ── JSON / urlencoded ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const generalLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
});
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: 'Слишком много попыток. Подождите 15 минут.' },
});
const aiLimit = rateLimit({
  windowMs: 60 * 1000, max: 15,
  message: { error: 'Слишком много AI запросов. Подождите минуту.' },
});

app.use('/api/', generalLimit);
app.use('/api/auth/login', authLimit);
app.use('/api/auth/register', authLimit);
app.use('/api/auth/forgot-password', authLimit);
app.use('/api/ai/', aiLimit);

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const projectRoutes      = require('./routes/projects');
const mapRoutes          = require('./routes/maps');
const { router: tierRoutes } = require('./routes/tiers');
const paymentRoutes      = require('./routes/payments');
const webhookRoutes      = require('./routes/webhooks');
const shareRoutes        = require('./routes/shares');
const aiRoutes           = require('./routes/ai');
const searchRoutes       = require('./routes/search');
const { router: notifRoutes } = require('./routes/notifications');
const versionsRoutes     = require('./routes/versions');

app.use('/api/auth',         authRoutes);
app.use('/api/projects',     projectRoutes);
app.use('/api/projects',     mapRoutes);
app.use('/api/projects',     versionsRoutes);
app.use('/api/tiers',        tierRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/webhooks',     webhookRoutes);
app.use('/api/shares',       shareRoutes);
app.use('/api/ai',           aiRoutes);
app.use('/api/search',       searchRoutes);
app.use('/api/notifications', notifRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.1.0', time: new Date().toISOString() });
});

// ── Global error handler ──────────────────────────────────────────────────────
if (Sentry) {
  app.use(Sentry.Handlers.errorHandler());
}
app.use((err, req, res, _next) => {
  console.error('❌ Error:', err.message);
  const status = err.status || err.statusCode || 500;
  if (status === 500 && Sentry) {
    Sentry.captureException(err);
  }
  res.status(status).json({
    error: status === 500 ? 'Внутренняя ошибка сервера' : err.message,
  });
});

// ── Фронтенд (статика из /public) — ПОСЛЕ error handler и API роутов ─────────
const path = require('path');
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
// SPA fallback — все не-API роуты отдают index.html
app.get('*', (req, res) => {
  const indexFile = path.join(publicDir, 'index.html');
  res.sendFile(indexFile, err => {
    if (err) res.status(404).send('App not built yet. Run: npm run build');
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  // Проверяем обязательные переменные окружения
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set! Add PostgreSQL to your Railway project and link DATABASE_URL.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET not set — using default (change in production!)');
  }

  console.log('🔄 Connecting to database...');
  await initDB();
  await seedDB();

  server.listen(PORT, () => {
    console.log(`🚀 Strategy AI Server v1.1 running on port ${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DB:  connected`);
    console.log(`   WS:  enabled`);
  });
}

start().catch(err => {
  console.error('❌ Fatal startup error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
