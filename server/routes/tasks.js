import { Router } from 'express';
import { Op } from 'sequelize';
import {
  Task, VALID_STATUSES, VALID_PRIORITIES, VALID_RECURRENCE, VALID_SOURCES, formatTags, parseTags,
} from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

// Daftar tag yang pernah dipakai user (untuk autosuggest), diurut paling sering.
router.get('/tags', async (req, res) => {
  const rows = await Task.findAll({
    where: { userId: req.user.id },
    attributes: ['tags'],
    raw: true,
  });
  const freq = {};
  for (const r of rows) {
    for (const t of parseTags(r.tags)) freq[t] = (freq[t] || 0) + 1;
  }
  const list = Object.entries(freq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 60);
  res.json(list);
});

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function sortTasks(rows) {
  return rows.slice().sort((a, b) => {
    const pa = PRIORITY_RANK[a.priority] ?? 1;
    const pb = PRIORITY_RANK[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    const sa = a.startTime || '99';
    const sb = b.startTime || '99';
    if (sa !== sb) return sa < sb ? -1 : 1;
    return new Date(a.logDate) - new Date(b.logDate);
  });
}

function dayRange(dateStr) {
  return [new Date(`${dateStr}T00:00:00`), new Date(`${dateStr}T23:59:59.999`)];
}

function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function expandRecurrence(logDate, recurrence, until) {
  const out = [];
  const start = new Date(`${logDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return out;
  const limit = until ? new Date(`${until}T00:00:00`) : null;
  const cap = (n) => out.slice(0, n);

  if (recurrence === 'DAILY' || recurrence === 'WEEKDAYS') {
    const maxDays = limit
      ? Math.min(93, Math.max(1, Math.round((limit - start) / 86400000) + 1))
      : 30;
    for (let i = 1; i < maxDays; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (recurrence === 'WEEKDAYS' && [0, 6].includes(d.getDay())) continue;
      out.push(dateKeyLocal(d));
      if (out.length >= 60) break;
    }
    return cap(60);
  }
  if (recurrence === 'WEEKLY') {
    const count = limit
      ? Math.min(26, Math.max(1, Math.round((limit - start) / (7 * 86400000)) + 1))
      : 8;
    for (let i = 1; i < count; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i * 7);
      out.push(dateKeyLocal(d));
    }
    return cap(26);
  }
  if (recurrence === 'MONTHLY') {
    const count = 6;
    for (let i = 1; i < count; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      if (limit && d > limit) break;
      out.push(dateKeyLocal(d));
    }
    return out;
  }
  return out;
}

function applyListFilters(where, query) {
  const { status, priority, tag } = query;
  if (status && VALID_STATUSES.includes(String(status))) where.status = String(status);
  if (priority && VALID_PRIORITIES.includes(String(priority))) where.priority = String(priority);
  if (tag) where.tags = { [Op.like]: `%${String(tag).replace(/[%_]/g, '')}%` };
}

router.get('/', async (req, res) => {
  const { month, year, date, from, to } = req.query;
  const where = { userId: req.user.id };
  applyListFilters(where, req.query);
  if (date) {
    const [start, end] = dayRange(date);
    const tasks = await Task.findAll({
      where: { ...where, logDate: { [Op.between]: [start, end] } },
      order: [['startTime', 'ASC'], ['createdAt', 'ASC']],
    });
    return res.json(sortTasks(tasks));
  }
  if (from && to) {
    const end = new Date(`${to}T23:59:59.999`);
    const startDate = new Date(`${from}T00:00:00`);
    const tasks = await Task.findAll({
      where: { ...where, logDate: { [Op.between]: [startDate, end] } },
      order: [['logDate', 'ASC'], ['startTime', 'ASC']],
    });
    return res.json(sortTasks(tasks));
  }
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    const tasks = await Task.findAll({
      where: { ...where, logDate: { [Op.between]: [start, end] } },
      order: [['logDate', 'ASC']],
    });
    return res.json(sortTasks(tasks));
  }
  res.status(400).json({ error: 'Parameter month & year, date, atau from & to diperlukan' });
});

router.post('/', async (req, res) => {
  const {
    title, description, logDate, startTime, endTime, status,
    priority, tags, recurrence, recurrenceUntil, estimatedMinutes, source,
  } = req.body || {};
  if (!title || !logDate) return res.status(400).json({ error: 'Judul dan tanggal wajib diisi' });
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Status tidak valid' });
  if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Prioritas tidak valid' });
  if (recurrence && !VALID_RECURRENCE.includes(recurrence)) return res.status(400).json({ error: 'Pengulangan tidak valid' });
  if (source && !VALID_SOURCES.includes(source)) return res.status(400).json({ error: 'Sumber tidak valid' });

  const base = {
    userId: req.user.id,
    title,
    description: description || null,
    logDate: new Date(`${logDate}T00:00:00`),
    startTime: startTime || null,
    endTime: endTime || null,
    status: status || 'TODO',
    priority: priority || 'MEDIUM',
    tags: formatTags(tags),
    recurrence: recurrence || 'NONE',
    recurrenceUntil: recurrenceUntil || null,
    estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
    source: source || 'WEB',
  };
  const task = await Task.create(base);

  // Ekspansi tugas berulang menjadi baris individual (maks 60)
  let created = [task];
  if (base.recurrence !== 'NONE') {
    const dates = expandRecurrence(logDate, base.recurrence, recurrenceUntil);
    if (dates.length) {
      const rows = await Task.bulkCreate(
        dates.map((d) => ({ ...base, logDate: new Date(`${d}T00:00:00`) }))
      );
      created = [task, ...rows];
    }
  }
  res.status(201).json(created.length === 1 ? created[0] : created);
});

router.put('/:id', async (req, res) => {
  const task = await Task.findByPk(req.params.id);
  if (!task || task.userId !== req.user.id) return res.status(404).json({ error: 'Catatan tidak ditemukan' });
  const {
    title, description, logDate, startTime, endTime, status,
    priority, tags, recurrence, recurrenceUntil, estimatedMinutes, source,
  } = req.body || {};
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Status tidak valid' });
  if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Prioritas tidak valid' });
  if (recurrence && !VALID_RECURRENCE.includes(recurrence)) return res.status(400).json({ error: 'Pengulangan tidak valid' });
  if (source && !VALID_SOURCES.includes(source)) return res.status(400).json({ error: 'Sumber tidak valid' });
  await task.update({
    title: title ?? task.title,
    description: description ?? task.description,
    logDate: logDate ? new Date(`${logDate}T00:00:00`) : task.logDate,
    startTime: startTime === undefined ? task.startTime : startTime || null,
    endTime: endTime === undefined ? task.endTime : endTime || null,
    status: status ?? task.status,
    priority: priority ?? task.priority,
    tags: tags === undefined ? task.tags : formatTags(tags),
    recurrence: recurrence ?? task.recurrence,
    recurrenceUntil: recurrenceUntil === undefined ? task.recurrenceUntil : recurrenceUntil || null,
    estimatedMinutes: estimatedMinutes === undefined ? task.estimatedMinutes : estimatedMinutes ? Number(estimatedMinutes) : null,
    source: source ?? task.source,
  });
  res.json(task);
});

router.delete('/:id', async (req, res) => {
  const task = await Task.findByPk(req.params.id);
  if (!task || task.userId !== req.user.id) return res.status(404).json({ error: 'Catatan tidak ditemukan' });
  await task.destroy();
  res.json({ ok: true });
});

export default router;
