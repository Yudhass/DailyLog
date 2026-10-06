import { Router } from 'express';
import { Op } from 'sequelize';
import { Task, taskMinutes, parseTags } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function keyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mondayOf(d) {
  const c = new Date(d);
  const off = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - off);
  c.setHours(0, 0, 0, 0);
  return c;
}

async function streakOf(userId) {
  const rows = await Task.findAll({
    where: { userId, status: 'DONE' },
    attributes: ['logDate'],
    order: [['logDate', 'DESC']],
    limit: 2000,
  });
  const days = new Set(rows.map((r) => keyOf(new Date(r.logDate))));
  if (!days.size) return { streak: 0, best: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Mulai dari hari ini; kalau hari ini kosong, mulai dari kemarin (masih dihitung beruntun)
  let cursor = new Date(today);
  if (!days.has(keyOf(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(keyOf(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak };
}

// GET /api/stats/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/overview', async (req, res) => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const from = req.query.from ? new Date(`${req.query.from}T00:00:00`) : firstOfMonth;
  const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : lastOfMonth;

  const tasks = await Task.findAll({
    where: { userId: req.user.id, logDate: { [Op.between]: [from, to] } },
    order: [['logDate', 'ASC']],
  });

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const todo = tasks.filter((t) => t.status === 'TODO').length;

  const perDay = {};
  const minutesPerDay = {};
  const tagCount = {};
  let minutesTotal = 0;
  for (const t of tasks) {
    const k = keyOf(new Date(t.logDate));
    perDay[k] = perDay[k] || { total: 0, done: 0 };
    perDay[k].total += 1;
    if (t.status === 'DONE') perDay[k].done += 1;
    const mins = taskMinutes(t);
    minutesTotal += mins;
    minutesPerDay[k] = (minutesPerDay[k] || 0) + mins;
    for (const tag of parseTags(t.tags)) tagCount[tag] = (tagCount[tag] || 0) + 1;
  }

  // Minggu ini vs minggu lalu (Senin-Minggu)
  const thisMon = mondayOf(now);
  const lastMon = new Date(thisMon);
  lastMon.setDate(thisMon.getDate() - 7);
  const nextMon = new Date(thisMon);
  nextMon.setDate(thisMon.getDate() + 7);
  const [thisWeek, lastWeek] = await Promise.all([
    Task.count({ where: { userId: req.user.id, status: 'DONE', logDate: { [Op.between]: [thisMon, new Date(nextMon.getTime() - 1)] } } }),
    Task.count({ where: { userId: req.user.id, status: 'DONE', logDate: { [Op.between]: [lastMon, new Date(thisMon.getTime() - 1)] } } }),
  ]);

  // 7 hari terakhir untuk grafik
  const last7 = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const k = keyOf(d);
    last7.push({ date: k, total: perDay[k]?.total || 0, done: perDay[k]?.done || 0, minutes: minutesPerDay[k] || 0 });
  }

  const { streak } = await streakOf(req.user.id);
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  res.json({
    range: { from: keyOf(from), to: keyOf(to) },
    total, done, inProgress, todo,
    percent: total ? Math.round((done / total) * 100) : 0,
    minutesTotal,
    hoursTotal: Math.round((minutesTotal / 60) * 10) / 10,
    week: { thisWeek, lastWeek, delta: thisWeek - lastWeek },
    last7,
    streak,
    topTags,
  });
});

// GET /api/stats/streak
router.get('/streak', async (req, res) => {
  res.json(await streakOf(req.user.id));
});

export default router;
