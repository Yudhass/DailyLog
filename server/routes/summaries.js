import { Router } from 'express';
import { Op } from 'sequelize';
import PDFDocument from 'pdfkit';
import { Summary, Task, VALID_SUMMARY_STYLES } from '../db.js';
import { buildSummary, hashTasks } from '../summarize.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function badRange(from, to) {
  if (!from || !to) return true;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || a > b;
}

// POST /api/summaries { from, to, style }
router.post('/', async (req, res) => {
  const { from, to, style = 'ringkas' } = req.body || {};
  if (badRange(from, to)) return res.status(400).json({ error: 'Rentang from & to (YYYY-MM-DD) tidak valid' });
  if (!VALID_SUMMARY_STYLES.includes(style)) return res.status(400).json({ error: 'Gaya tidak valid' });

  const tasks = await Task.findAll({
    where: { userId: req.user.id, logDate: { [Op.between]: [new Date(`${from}T00:00:00`), new Date(`${to}T23:59:59.999`)] } },
    order: [['logDate', 'ASC']],
  });
  if (!tasks.length) {
    return res.json({
      summary: null,
      message: 'Belum ada log pada rentang ini, jadi tidak ada ringkasan yang dibuat.',
    });
  }
  const dataHash = hashTasks(tasks);
  const cached = await Summary.findOne({
    where: { userId: req.user.id, rangeStart: from, rangeEnd: to, style, dataHash },
    order: [['createdAt', 'DESC']],
  });
  if (cached) return res.json({ summary: cached, cached: true });

  const content = buildSummary({ tasks, from, to, style, ownerName: req.user.name });
  const summary = await Summary.create({
    userId: req.user.id, rangeStart: from, rangeEnd: to, style, content, dataHash,
  });
  res.status(201).json({ summary, cached: false });
});

router.get('/', async (req, res) => {
  const rows = await Summary.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    limit: 20,
  });
  res.json(rows);
});

router.get('/:id/pdf', async (req, res) => {
  const s = await Summary.findByPk(req.params.id);
  if (!s || s.userId !== req.user.id) return res.status(404).json({ error: 'Ringkasan tidak ditemukan' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="ringkasan-${s.rangeStart}-sd-${s.rangeEnd}.pdf"`);
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  doc.pipe(res);
  doc.fontSize(18).text('Ringkasan DailyLog');
  doc.fontSize(11).fillColor('#555').text(`${s.rangeStart} s/d ${s.rangeEnd} • gaya ${s.style}`);
  doc.moveDown().fillColor('#000').fontSize(12).text(s.content);
  doc.end();
});

export default router;
