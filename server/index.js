import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import statsRoutes from './routes/stats.js';
import exportRoutes from './routes/export.js';
import { shareRouter, publicShareRouter } from './routes/share.js';
import { reminderRouter, startReminders } from './reminders.js';
import aiRoutes from './routes/ai.js';
import summaryRoutes from './routes/summaries.js';
import chatLinkRoutes from './routes/chatlinks.js';
import syncRoutes from './routes/sync.js';
import pushRoutes from './routes/push.js';
import notesRoutes from './routes/notes.js';
import { handleTelegramUpdate, telegramEnabled } from './telegram.js';
import { syncDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/share', shareRouter);
app.use('/api/public/share', publicShareRouter);
app.use('/api/reminders', reminderRouter);
app.use('/api/ai', aiRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/chat-links', chatLinkRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/notes', notesRoutes);

// F3 webhook Telegram (verifikasi secret bila dikonfigurasi)
app.post('/webhooks/telegram', async (req, res) => {
  if (!telegramEnabled()) return res.status(503).json({ error: 'Bot Telegram belum dikonfigurasi.' });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).json({ error: 'secret tidak valid' });
  }
  res.json({ ok: true });
  handleTelegramUpdate(req.body || {}).catch((e) => console.error('Telegram update error:', e.message));
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist));
app.use((req, res, next) => {
  // File statis PWA (sw.js, manifest, ikon) harus lolos, jangan di-fallback ke index.html
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.match(/\.[a-z0-9]+$/i)) {
    return res.sendFile(path.join(dist, 'index.html'), (err) => {
      if (err) next();
    });
  }
  next();
});

const port = process.env.PORT || 5000;
syncDb()
  .then(() => {
    startReminders();
    app.listen(port, () => console.log(`DailyLog berjalan di http://localhost:${port}`));
  })
  .catch((err) => { console.error('Gagal koneksi database:', err.message); process.exit(1); });
