import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import { syncDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(dist, 'index.html'), (err) => {
      if (err) next();
    });
  }
  next();
});

const port = process.env.PORT || 5000;
syncDb()
  .then(() => app.listen(port, () => console.log(`DailyLog berjalan di http://localhost:${port}`)))
  .catch((err) => { console.error('Gagal koneksi database:', err.message); process.exit(1); });
