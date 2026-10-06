import { Router } from 'express';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
import { Task, User } from './db.js';
import { authRequired } from './middleware/auth.js';

export const reminderRouter = Router();
reminderRouter.use(authRequired);

// GET /api/reminders/today — pengingat dalam aplikasi (tanpa email)
reminderRouter.get('/today', async (req, res) => {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const [overdue, today] = await Promise.all([
    Task.findAll({
      where: { userId: req.user.id, status: { [Op.ne]: 'DONE' }, logDate: { [Op.lt]: startToday } },
      order: [['logDate', 'ASC']],
      limit: 20,
    }),
    Task.findAll({
      where: { userId: req.user.id, logDate: { [Op.between]: [startToday, endToday] } },
      order: [['startTime', 'ASC']],
    }),
  ]);
  const todoToday = today.filter((t) => t.status !== 'DONE');
  res.json({
    overdueCount: overdue.length,
    overdue,
    todayCount: today.length,
    todoTodayCount: todoToday.length,
    todoToday,
  });
});

function buildTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
  });
}

async function sendDailyDigest() {
  const transport = buildTransport();
  if (!transport) {
    console.log('Reminder email dilewati: SMTP_HOST belum dikonfigurasi di .env (Telegram/Push tetap dicoba).');
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const users = await User.findAll();
  for (const u of users) {
    const todos = await Task.findAll({
      where: { userId: u.id, status: { [Op.ne]: 'DONE' }, logDate: { [Op.between]: [start, end] } },
      order: [['startTime', 'ASC']],
    });
    if (!todos.length) continue;
    const list = todos.map((t) => `- ${t.title}${t.startTime ? ` (${t.startTime})` : ''}`).join('\n');
    // F3/F4: dorong juga via Telegram + Web Push (graceful bila belum dikonfigurasi)
    try {
      const { pushTelegramDigest } = await import('./telegram.js');
      await pushTelegramDigest(u.id, list);
    } catch { /* abaikan */ }
    try {
      const { pushToUser } = await import('./routes/push.js');
      await pushToUser(u.id, { title: 'DailyLog pagi ini', body: `${todos.length} tugas menunggu:\n${list.slice(0, 200)}` }, 'reminder');
    } catch { /* abaikan */ }
    if (!transport) continue;
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: u.email,
        subject: `DailyLog: ${todos.length} tugas hari ini`,
        text: `Halo ${u.name},\n\nJadwal hari ini:\n${list}\n\nBuka DailyLog untuk detailnya.`,
      });
      console.log(`Digest terkirim ke ${u.email}`);
    } catch (err) {
      console.error(`Gagal kirim digest ke ${u.email}:`, err.message);
    }
  }
}

let started = false;
export function startReminders() {
  if (started) return;
  started = true;
  const schedule = process.env.REMINDER_CRON || '0 7 * * *';
  cron.schedule(schedule, () => {
    sendDailyDigest().catch((e) => console.error('Digest error:', e.message));
  });
  console.log(`Pengingat email aktif (jadwal: ${schedule}). Atur SMTP_HOST di .env untuk mengaktifkan kirim.`);
}
