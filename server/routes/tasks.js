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

const DAY_MS = 86400000;
const MAX_ROWS = 60;

function clampInt(v, min, max, fallback = null) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

// Ubah "1,3,5" menjadi array hari getDay() yang valid & unik (0=Min..6=Sab).
// String kosong / undefined menghasilkan [] (bukan [0] — Number('') adalah 0!).
function parseDays(raw) {
  const days = String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// Tanggal dengan hari dijepit ke akhir bulan (31 Feb -> 28/29 Feb).
function clampDay(year, monthIndex, day) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, last));
}

function fmtTime(totalMinutes) {
  const m = ((Math.trunc(totalMinutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function parseTime(str, fallbackH = 8, fallbackM = 0) {
  const m = String(str || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { h: fallbackH, min: fallbackM };
  const h = Math.max(0, Math.min(23, Number(m[1])));
  const min = Math.max(0, Math.min(59, Number(m[2])));
  return { h, min };
}

function minutesOf(str) {
  const m = String(str || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// Kembangkan pola berulang menjadi kemunculan SETELAH baris dasar.
// Mengembalikan [{ date: 'YYYY-MM-DD', startTime, endTime }].
// Baris lama (tanpa parameter baru) menghasilkan jadwal yang identik seperti dulu.
function expandRecurrence(logDate, recurrence, until, opts = {}) {
  const out = [];
  const start = new Date(`${logDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return out;
  const limit = until ? new Date(`${until}T00:00:00`) : null;
  const baseStart = opts.startTime || null;
  const baseEnd = opts.endTime || null;
  const push = (d, st = baseStart, et = baseEnd) => {
    if (out.length >= MAX_ROWS) return false;
    out.push({ date: dateKeyLocal(d), startTime: st, endTime: et });
    return out.length < MAX_ROWS;
  };

  if (recurrence === 'DAILY' || recurrence === 'WEEKDAYS') {
    const step = recurrence === 'DAILY' ? clampInt(opts.interval, 1, 30, 1) : 1;
    const maxDays = limit
      ? Math.min(93, Math.max(1, Math.round((limit - start) / DAY_MS) + 1))
      : 30;
    for (let i = step; i < maxDays && out.length < MAX_ROWS; i += step) {
      const d = addDays(start, i);
      if (recurrence === 'WEEKDAYS' && [0, 6].includes(d.getDay())) continue;
      push(d);
    }
    return out.slice(0, MAX_ROWS);
  }
  if (recurrence === 'WEEKLY') {
    // days kosong = hari yang sama dengan tanggal mulai (perilaku lama).
    const days = parseDays(opts.days);
    const want = days.length ? days : [start.getDay()];
    const every = clampInt(opts.interval, 1, 12, 1);
    if (limit) {
      for (let i = 1; i <= 1095 && out.length < MAX_ROWS; i += 1) {
        const d = addDays(start, i);
        if (d > limit) break;
        const weekIdx = Math.floor((d - start) / (7 * DAY_MS));
        if (weekIdx % every === 0 && want.includes(d.getDay())) push(d);
      }
    } else {
      // Tanpa batas: 7 kemunculan berikutnya (sama seperti dulu untuk 1 hari).
      for (let i = 1; i <= 1095 && out.length < 7; i += 1) {
        const d = addDays(start, i);
        const weekIdx = Math.floor((d - start) / (7 * DAY_MS));
        if (weekIdx % every === 0 && want.includes(d.getDay())) push(d);
      }
    }
    return out;
  }
  if (recurrence === 'MONTHLY') {
    const day = clampInt(opts.monthDay, 1, 31, start.getDate());
    if (limit) {
      for (let i = 1; i <= 120 && out.length < MAX_ROWS; i += 1) {
        const d = clampDay(start.getFullYear(), start.getMonth() + i, day);
        if (d > limit) break;
        push(d);
      }
    } else {
      for (let i = 1; i <= 5; i += 1) {
        push(clampDay(start.getFullYear(), start.getMonth() + i, day));
      }
    }
    return out;
  }
  if (recurrence === 'YEARLY') {
    const month = clampInt(opts.month, 1, 12, start.getMonth() + 1);
    const day = clampInt(opts.monthDay, 1, 31, start.getDate());
    if (limit) {
      for (let i = 1; i <= 30 && out.length < MAX_ROWS; i += 1) {
        const d = clampDay(start.getFullYear() + i, month - 1, day);
        if (d > limit) break;
        push(d);
      }
    } else {
      for (let i = 1; i <= 5; i += 1) {
        push(clampDay(start.getFullYear() + i, month - 1, day));
      }
    }
    return out;
  }
  if (recurrence === 'HOURLY') {
    const everyH = clampInt(opts.interval, 1, 24, 1);
    const { h, min } = parseTime(baseStart, 8, 0);
    const dur = minutesOf(baseStart) !== null && minutesOf(baseEnd) !== null
      ? minutesOf(baseEnd) - minutesOf(baseStart)
      : 0;
    const endLimit = limit
      ? new Date(limit.getFullYear(), limit.getMonth(), limit.getDate(), 23, 59, 59)
      : new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59);
    let t = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, min, 0);
    t = new Date(t.getTime() + everyH * 3600000); // setelah baris dasar
    while (t <= endLimit && out.length < MAX_ROWS) {
      const mins = t.getHours() * 60 + t.getMinutes();
      push(new Date(t), fmtTime(mins), dur > 0 ? fmtTime(mins + dur) : null);
      t = new Date(t.getTime() + everyH * 3600000);
    }
    return out;
  }
  return out;
}

// Normalisasi + validasi parameter pola lanjutan dari body request.
// Mengembalikan { interval, days, monthDay, month } atau melempar { status, error }.
function normalizePattern(recurrence, body, logDate) {
  const start = new Date(`${logDate}T00:00:00`);
  const startDay = Number.isNaN(start.getTime()) ? 1 : start.getDate();
  const startMonth = Number.isNaN(start.getTime()) ? 1 : start.getMonth() + 1;
  const startDow = Number.isNaN(start.getTime()) ? 1 : start.getDay();
  const bad = (error) => { const e = new Error(error); e.status = 400; throw e; };

  if (recurrence === 'HOURLY') {
    return {
      interval: clampInt(body?.recurrenceInterval, 1, 24, 1),
      days: null, monthDay: null, month: null,
    };
  }
  if (recurrence === 'DAILY') {
    return {
      interval: clampInt(body?.recurrenceInterval, 1, 30, 1),
      days: null, monthDay: null, month: null,
    };
  }
  if (recurrence === 'WEEKLY') {
    const days = parseDays(body?.recurrenceDays);
    return {
      interval: clampInt(body?.recurrenceInterval, 1, 12, 1),
      days: (days.length ? days : [startDow]).join(','),
      monthDay: null, month: null,
    };
  }
  if (recurrence === 'MONTHLY') {
    const md = clampInt(body?.recurrenceMonthDay, 1, 31, startDay);
    if (body?.recurrenceMonthDay !== undefined && md === null) bad('Tanggal bulan harus 1–31');
    return { interval: null, days: null, monthDay: md, month: null };
  }
  if (recurrence === 'YEARLY') {
    const mo = clampInt(body?.recurrenceMonth, 1, 12, startMonth);
    const md = clampInt(body?.recurrenceMonthDay, 1, 31, startDay);
    if (body?.recurrenceMonth !== undefined && mo === null) bad('Bulan harus 1–12');
    if (body?.recurrenceMonthDay !== undefined && md === null) bad('Tanggal harus 1–31');
    return { interval: null, days: null, monthDay: md, month: mo };
  }
  return { interval: null, days: null, monthDay: null, month: null };
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
  let pattern;
  try {
    pattern = normalizePattern(recurrence || 'NONE', req.body, logDate);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

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
    recurrenceInterval: pattern.interval,
    recurrenceDays: pattern.days || null,
    recurrenceMonthDay: pattern.monthDay,
    recurrenceMonth: pattern.month,
    estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
    source: source || 'WEB',
  };
  const task = await Task.create(base);

  // Ekspansi tugas berulang menjadi baris individual (maks 60)
  let created = [task];
  if (base.recurrence !== 'NONE') {
    const dates = expandRecurrence(logDate, base.recurrence, recurrenceUntil, {
      interval: pattern.interval,
      days: pattern.days,
      monthDay: pattern.monthDay,
      month: pattern.month,
      startTime: base.startTime,
      endTime: base.endTime,
    });
    if (dates.length) {
      const rows = await Task.bulkCreate(
        dates.map((d) => ({
          ...base,
          logDate: new Date(`${d.date}T00:00:00`),
          startTime: d.startTime,
          endTime: d.endTime,
        }))
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
    recurrenceInterval, recurrenceDays, recurrenceMonthDay, recurrenceMonth,
  } = req.body || {};
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Status tidak valid' });
  if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Prioritas tidak valid' });
  if (recurrence && !VALID_RECURRENCE.includes(recurrence)) return res.status(400).json({ error: 'Pengulangan tidak valid' });
  if (source && !VALID_SOURCES.includes(source)) return res.status(400).json({ error: 'Sumber tidak valid' });
  // Validasi ringan pola lanjutan bila dikirim (mis. dari klien lain).
  if (recurrenceInterval !== undefined && recurrenceInterval !== null
    && !Number.isInteger(Number(recurrenceInterval))) {
    return res.status(400).json({ error: 'Interval pengulangan harus bilangan bulat' });
  }
  if (recurrenceDays !== undefined && recurrenceDays !== null && recurrenceDays !== ''
    && !parseDays(recurrenceDays).length) {
    return res.status(400).json({ error: 'Hari pengulangan tidak valid (0–6, pisahkan koma)' });
  }
  if (recurrenceMonthDay !== undefined && recurrenceMonthDay !== null
    && (clampInt(recurrenceMonthDay, 1, 31, null) === null)) {
    return res.status(400).json({ error: 'Tanggal bulan harus 1–31' });
  }
  if (recurrenceMonth !== undefined && recurrenceMonth !== null
    && (clampInt(recurrenceMonth, 1, 12, null) === null)) {
    return res.status(400).json({ error: 'Bulan harus 1–12' });
  }
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
    recurrenceInterval: recurrenceInterval === undefined ? task.recurrenceInterval
      : recurrenceInterval === null || recurrenceInterval === '' ? null : Number(recurrenceInterval),
    recurrenceDays: recurrenceDays === undefined ? task.recurrenceDays
      : recurrenceDays ? parseDays(recurrenceDays).join(',') : null,
    recurrenceMonthDay: recurrenceMonthDay === undefined ? task.recurrenceMonthDay
      : recurrenceMonthDay === null || recurrenceMonthDay === '' ? null : Number(recurrenceMonthDay),
    recurrenceMonth: recurrenceMonth === undefined ? task.recurrenceMonth
      : recurrenceMonth === null || recurrenceMonth === '' ? null : Number(recurrenceMonth),
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
// Diekspor untuk pengujian unit pola pengulangan.
export { expandRecurrence, parseDays };
