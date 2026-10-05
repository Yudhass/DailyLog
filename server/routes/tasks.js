import { Router } from 'express';
import { Op } from 'sequelize';
import { Task, VALID_STATUSES } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function dayRange(dateStr) {
  return [new Date(`${dateStr}T00:00:00`), new Date(`${dateStr}T23:59:59.999`)];
}

router.get('/', async (req, res) => {
  const { month, year, date, from, to } = req.query;
  if (date) {
    const [start, end] = dayRange(date);
    const tasks = await Task.findAll({
      where: { userId: req.user.id, logDate: { [Op.between]: [start, end] } },
      order: [['startTime', 'ASC'], ['createdAt', 'ASC']],
    });
    return res.json(tasks);
  }
  if (from && to) {
    const [start, end] = dayRange(to);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const startDate = new Date(`${from}T00:00:00`);
    const tasks = await Task.findAll({
      where: { userId: req.user.id, logDate: { [Op.between]: [startDate, end] } },
      order: [['logDate', 'ASC'], ['startTime', 'ASC']],
    });
    return res.json(tasks);
  }
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    const tasks = await Task.findAll({
      where: { userId: req.user.id, logDate: { [Op.between]: [start, end] } },
      order: [['logDate', 'ASC']],
    });
    return res.json(tasks);
  }
  res.status(400).json({ error: 'Parameter month & year atau date diperlukan' });
});

router.post('/', async (req, res) => {
  const { title, description, logDate, startTime, endTime, status } = req.body || {};
  if (!title || !logDate) return res.status(400).json({ error: 'Judul dan tanggal wajib diisi' });
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Status tidak valid' });
  const task = await Task.create({
    userId: req.user.id,
    title,
    description: description || null,
    logDate: new Date(`${logDate}T00:00:00`),
    startTime: startTime || null,
    endTime: endTime || null,
    status: status || 'TODO',
  });
  res.status(201).json(task);
});

router.put('/:id', async (req, res) => {
  const task = await Task.findByPk(req.params.id);
  if (!task || task.userId !== req.user.id) return res.status(404).json({ error: 'Catatan tidak ditemukan' });
  const { title, description, logDate, startTime, endTime, status } = req.body || {};
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Status tidak valid' });
  await task.update({
    title: title ?? task.title,
    description: description ?? task.description,
    logDate: logDate ? new Date(`${logDate}T00:00:00`) : task.logDate,
    startTime: startTime === undefined ? task.startTime : startTime || null,
    endTime: endTime === undefined ? task.endTime : endTime || null,
    status: status ?? task.status,
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
