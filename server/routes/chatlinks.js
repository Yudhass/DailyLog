import { Router } from 'express';
import { ChatLink, LinkCode } from '../db.js';
import { randomCode } from '../telegram.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

// POST /api/chat-links/code — kode sekali pakai 10 menit
router.post('/code', async (req, res) => {
  const code = randomCode();
  await LinkCode.create({
    code,
    userId: req.user.id,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const bot = process.env.TELEGRAM_BOT_USERNAME ? `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}` : null;
  res.status(201).json({ code, expiresInSec: 600, botUrl: bot });
});

router.get('/', async (req, res) => {
  const rows = await ChatLink.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
  });
  res.json(rows);
});

router.delete('/:id', async (req, res) => {
  const link = await ChatLink.findByPk(req.params.id);
  if (!link || link.userId !== req.user.id) return res.status(404).json({ error: 'Tautan tidak ditemukan' });
  await link.destroy();
  res.json({ ok: true });
});

export default router;
