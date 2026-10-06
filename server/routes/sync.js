import { Router } from 'express';
import { Task, VALID_PRIORITIES, VALID_STATUSES, formatTags } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

// POST /api/sync { since?: ISO, changes: [{ clientId?, op, id?, data?, updatedAt? }] }
// last-write-wins berdasarkan updatedAt. Mengembalikan { applied, conflicts, serverChanges }.
router.post('/', async (req, res) => {
  const { since, changes = [] } = req.body || {};
  const applied = [];
  const conflicts = [];

  for (const ch of changes.slice(0, 100)) {
    try {
      if (ch.op === 'create') {
        const d = ch.data || {};
        if (!d.title || !d.logDate) throw new Error('judul/tanggal wajib');
        const row = await Task.create({
          userId: req.user.id,
          title: d.title,
          description: d.description || null,
          logDate: new Date(`${d.logDate}T00:00:00`),
          startTime: d.startTime || null,
          endTime: d.endTime || null,
          status: VALID_STATUSES.includes(d.status) ? d.status : 'TODO',
          priority: VALID_PRIORITIES.includes(d.priority) ? d.priority : 'MEDIUM',
          tags: formatTags(d.tags),
          recurrence: 'NONE',
          estimatedMinutes: d.estimatedMinutes ? Number(d.estimatedMinutes) : null,
          source: 'PWA',
        });
        applied.push({ clientId: ch.clientId || null, id: row.id });
      } else if (ch.op === 'update') {
        const row = await Task.findByPk(ch.id);
        if (!row || row.userId !== req.user.id) throw new Error('tidak ditemukan');
        const remote = new Date(row.updatedAt).getTime();
        const local = ch.updatedAt ? new Date(ch.updatedAt).getTime() : 0;
        if (local && remote > local) {
          conflicts.push({ id: row.id, server: row, reason: 'server lebih baru' });
          continue;
        }
        const d = ch.data || {};
        await row.update({
          title: d.title ?? row.title,
          description: d.description ?? row.description,
          logDate: d.logDate ? new Date(`${d.logDate}T00:00:00`) : row.logDate,
          startTime: d.startTime === undefined ? row.startTime : d.startTime || null,
          endTime: d.endTime === undefined ? row.endTime : d.endTime || null,
          status: d.status ?? row.status,
          priority: d.priority ?? row.priority,
          tags: d.tags === undefined ? row.tags : formatTags(d.tags),
          estimatedMinutes: d.estimatedMinutes === undefined ? row.estimatedMinutes : d.estimatedMinutes || null,
          source: 'PWA',
        });
        applied.push({ id: row.id });
      } else if (ch.op === 'delete') {
        const row = await Task.findByPk(ch.id);
        if (!row || row.userId !== req.user.id) throw new Error('tidak ditemukan');
        await row.destroy();
        applied.push({ id: ch.id, deleted: true });
      }
    } catch (err) {
      conflicts.push({ clientId: ch.clientId || null, id: ch.id || null, reason: err.message });
    }
  }

  let serverChanges = [];
  if (since) {
    const { Op } = await import('sequelize');
    serverChanges = await Task.findAll({
      where: { userId: req.user.id, updatedAt: { [Op.gte]: new Date(since) } },
      order: [['updatedAt', 'ASC']],
      limit: 200,
    });
  }
  res.json({ applied, conflicts, serverChanges, now: new Date().toISOString() });
});

export default router;
