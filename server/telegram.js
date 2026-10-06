import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { ChatLink, LinkCode, Task, User } from './db.js';
import { parseNatural } from './nlp.js';
import { buildSummary } from './summarize.js';

const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export function telegramEnabled() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export async function tgSend(chatId, text) {
  if (!telegramEnabled()) return;
  try {
    await fetch(`${API()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4000) }),
    });
  } catch (err) {
    console.error('Telegram send gagal:', err.message);
  }
}

function keyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function todayTasks(userId) {
  const now = new Date();
  const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return Task.findAll({
    where: { userId, logDate: { [Op.between]: [s, e] } },
    order: [['startTime', 'ASC']],
  });
}

const HELP = [
  'Perintah DailyLog:',
  '• log <teks> — catat cepat (cth: log besok jam 3 meeting #kantor)',
  '• todo <teks> — sama dengan log',
  '• hari ini — lihat tugas hari ini',
  '• selesai <nomor> — tandai selesai dari daftar hari ini',
  '• ringkasan minggu — ringkasan 7 hari terakhir',
  '• batal — putuskan tautan akun',
].join('\n');

export async function handleTelegramUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.chat) return;
  const chatId = String(msg.chat.id);
  const text = String(msg.text || '').trim();
  if (!text) return;

  // 1) Penautan akun via kode
  const codeMatch = text.match(/^(?:\/start\s+|link\s+|taut\s+)?([A-Z0-9]{6})$/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const rec = await LinkCode.findByPk(code);
    if (!rec || rec.expiresAt < new Date() || rec.usedAt) {
      await tgSend(chatId, 'Kode tidak valid atau kedaluwarsa. Buat kode baru di Pengaturan/Profil DailyLog.');
      return;
    }
    const existing = await ChatLink.findOne({ where: { provider: 'TELEGRAM', externalId: chatId } });
    if (existing) {
      await tgSend(chatId, 'Akun chat ini sudah tertaut. Kirim "batal" untuk melepas sebelum menautkan ulang.');
      return;
    }
    await ChatLink.create({
      userId: rec.userId, provider: 'TELEGRAM', externalId: chatId,
      label: msg.from?.username ? `@${msg.from.username}` : msg.from?.first_name || null,
    });
    rec.usedAt = new Date();
    await rec.save();
    await tgSend(chatId, 'Akun tertaut! Kirim "log <teks>" untuk mencatat atau "bantuan" untuk daftar perintah.');
    return;
  }

  const link = await ChatLink.findOne({ where: { provider: 'TELEGRAM', externalId: chatId } });
  if (!link) {
    await tgSend(chatId, 'Akun belum tertaut. Buat kode di Profil DailyLog → Tautkan Telegram, lalu kirim kodenya ke sini.');
    return;
  }
  const low = text.toLowerCase();

  if (/^(bantuan|help|\/help|\/start)$/.test(low)) {
    await tgSend(chatId, HELP);
    return;
  }
  if (/^(batal|unlink|putus|lepas)/.test(low)) {
    await link.destroy();
    await tgSend(chatId, 'Tautan diputus. Data log Anda tetap aman di DailyLog.');
    return;
  }
  if (/^(hari\s*ini|today|todo\s*hari\s*ini)$/.test(low)) {
    const rows = await todayTasks(link.userId);
    if (!rows.length) {
      await tgSend(chatId, 'Hari ini belum ada tugas. Kirim "log <teks>" untuk menambah.');
      return;
    }
    const lines = rows.map((t, i) => `${i + 1}. [${t.status}] ${t.title}${t.startTime ? ` (${t.startTime})` : ''}`);
    await tgSend(chatId, `Tugas hari ini (${rows.length}):\n${lines.join('\n')}`);
    return;
  }
  let m = low.match(/^selesai\s+(\d+)/);
  if (m) {
    const rows = await todayTasks(link.userId);
    const idx = Number(m[1]) - 1;
    if (!rows[idx]) {
      await tgSend(chatId, 'Nomor tidak ada. Kirim "hari ini" untuk melihat daftar.');
      return;
    }
    await rows[idx].update({ status: 'DONE' });
    await tgSend(chatId, `Selesai: ${rows[idx].title} ✅`);
    return;
  }
  if (/ringkasan/.test(low)) {
    const now = new Date();
    const to = keyOf(now);
    const fromD = new Date(now);
    fromD.setDate(now.getDate() - 6);
    const tasks = await Task.findAll({
      where: { userId: link.userId, logDate: { [Op.between]: [new Date(`${keyOf(fromD)}T00:00:00`), new Date(`${to}T23:59:59.999`)] } },
      order: [['logDate', 'ASC']],
    });
    if (!tasks.length) {
      await tgSend(chatId, 'Belum ada log 7 hari terakhir.');
      return;
    }
    const content = buildSummary({ tasks, from: keyOf(fromD), to, style: 'ringkas' });
    await tgSend(chatId, content);
    return;
  }
  m = text.match(/^(log|todo|catat)\s+([\s\S]+)/i);
  const payload = m ? m[2] : text;
  const draft = parseNatural(payload, new Date());
  const task = await Task.create({
    userId: link.userId,
    title: draft.title,
    description: null,
    logDate: new Date(`${draft.logDate}T00:00:00`),
    startTime: draft.startTime,
    endTime: draft.endTime,
    status: draft.status === 'DONE' ? 'TODO' : draft.status,
    priority: draft.priority,
    tags: draft.tags.join(','),
    recurrence: 'NONE',
    estimatedMinutes: draft.estimatedMinutes,
    source: 'TELEGRAM',
  });
  await tgSend(
    chatId,
    `Tercatat: ${task.title}\nTanggal ${draft.logDate}${draft.startTime ? ` • ${draft.startTime}` : ''} • ${draft.priority}`
  );
}

export function randomCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

// Digest via bot untuk user tertaut (dipanggil dari cron pengingat)
export async function pushTelegramDigest(userId, lines) {
  if (!telegramEnabled() || !lines) return;
  const links = await ChatLink.findAll({ where: { userId, provider: 'TELEGRAM' } });
  for (const l of links) {
    const user = await User.findByPk(userId);
    await tgSend(l.externalId, `Halo ${user?.name || ''}, jadwal hari ini:\n${lines}`);
  }
}
