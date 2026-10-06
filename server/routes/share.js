import { Router } from 'express';
import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { ShareLink, Task, User } from '../db.js';
import { authRequired } from '../middleware/auth.js';

export const shareRouter = Router();
shareRouter.use(authRequired);

// POST /api/share { scopeType: 'DAY'|'RANGE', date / dateFrom+dateTo, expiresInDays? }
shareRouter.post('/', async (req, res) => {
  const { scopeType, date, dateFrom, dateTo, expiresInDays } = req.body || {};
  let from = dateFrom;
  let to = dateTo;
  if (scopeType === 'DAY' || date) {
    from = date || dateFrom;
    to = date || dateTo;
  }
  if (!from || !to) return res.status(400).json({ error: 'Tanggal (date / dateFrom+dateTo) wajib diisi' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'Format tanggal harus YYYY-MM-DD' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  const link = await ShareLink.create({
    userId: req.user.id,
    token,
    scopeType: scopeType === 'RANGE' ? 'RANGE' : 'DAY',
    dateFrom: from,
    dateTo: to,
    expiresAt: expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 86400000) : null,
  });
  res.status(201).json({ token: link.token, url: `/s/${link.token}`, dateFrom: from, dateTo: to });
});

shareRouter.get('/', async (req, res) => {
  const links = await ShareLink.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    limit: 50,
  });
  res.json(links);
});

shareRouter.delete('/:id', async (req, res) => {
  const link = await ShareLink.findByPk(req.params.id);
  if (!link || link.userId !== req.user.id) return res.status(404).json({ error: 'Link tidak ditemukan' });
  await link.destroy();
  res.json({ ok: true });
});

// Publik tanpa login
export const publicShareRouter = Router();
publicShareRouter.get('/:token', async (req, res) => {
  const link = await ShareLink.findOne({ where: { token: req.params.token } });
  if (!link) return res.status(404).json({ error: 'Link tidak valid' });
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Link sudah kedaluwarsa' });
  }
  const owner = await User.findByPk(link.userId);
  const tasks = await Task.findAll({
    where: {
      userId: link.userId,
      logDate: { [Op.between]: [new Date(`${link.dateFrom}T00:00:00`), new Date(`${link.dateTo}T23:59:59.999`)] },
    },
    order: [['logDate', 'ASC'], ['startTime', 'ASC']],
    attributes: ['title', 'description', 'logDate', 'startTime', 'endTime', 'status', 'priority', 'tags'],
  });
  res.json({
    owner: owner ? owner.name : 'Pengguna DailyLog',
    dateFrom: link.dateFrom,
    dateTo: link.dateTo,
    tasks,
  });
});
