import { Router } from 'express';
import { Op } from 'sequelize';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Task, taskMinutes } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

async function fetchRange(userId, from, to) {
  if (!from || !to) return null;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const tasks = await Task.findAll({
    where: { userId, logDate: { [Op.between]: [start, end] } },
    order: [['logDate', 'ASC'], ['startTime', 'ASC']],
  });
  return tasks;
}

function fileName(prefix, from, to, ext) {
  const safe = (s) => String(s).replace(/[^0-9A-Za-z-]/g, '');
  return `${prefix}-${safe(from)}-sd-${safe(to)}.${ext}`;
}

router.get('/pdf', async (req, res) => {
  const { from, to } = req.query;
  const tasks = await fetchRange(req.user.id, from, to);
  if (!tasks) return res.status(400).json({ error: 'Parameter from & to (YYYY-MM-DD) diperlukan' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName('laporan-dailylog', from, to, 'pdf')}"`);

  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  doc.pipe(res);
  doc.fontSize(20).text('Laporan DailyLog', { continued: false });
  doc.fontSize(11).fillColor('#555').text(`Periode ${from} s/d ${to} — ${req.user.name || req.user.email}`);
  doc.moveDown();

  const done = tasks.filter((t) => t.status === 'DONE').length;
  const mins = tasks.reduce((a, t) => a + taskMinutes(t), 0);
  doc.fillColor('#000').fontSize(12).text(`Total ${tasks.length} catatan • Selesai ${done} • Waktu ${(mins / 60).toFixed(1)} jam`);
  doc.moveDown();

  let lastDay = '';
  for (const t of tasks) {
    const day = new Date(t.logDate).toISOString().slice(0, 10);
    if (day !== lastDay) {
      lastDay = day;
      doc.moveDown(0.5).fontSize(13).fillColor('#111').text(day, { underline: true });
    }
    const time = t.startTime ? (t.endTime ? `${t.startTime}-${t.endTime}` : t.startTime) : 'Seharian';
    doc.fontSize(11).fillColor('#000').text(`• [${t.status}/${t.priority}] ${t.title} (${time})`);
    if (t.description) doc.fontSize(10).fillColor('#444').text(`   ${String(t.description).slice(0, 300)}`);
    if (t.tags) doc.fontSize(10).fillColor('#666').text(`   #${String(t.tags).split(',').join(' #')}`);
  }
  if (!tasks.length) doc.fontSize(12).text('Belum ada catatan pada rentang ini.');
  doc.end();
});

router.get('/excel', async (req, res) => {
  const { from, to } = req.query;
  const tasks = await fetchRange(req.user.id, from, to);
  if (!tasks) return res.status(400).json({ error: 'Parameter from & to (YYYY-MM-DD) diperlukan' });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'DailyLog';
  const ws = wb.addWorksheet('Laporan');
  ws.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 12 },
    { header: 'Judul', key: 'judul', width: 36 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Prioritas', key: 'prioritas', width: 12 },
    { header: 'Tag', key: 'tag', width: 24 },
    { header: 'Mulai', key: 'mulai', width: 8 },
    { header: 'Selesai', key: 'selesai', width: 8 },
    { header: 'Durasi (mnt)', key: 'durasi', width: 13 },
    { header: 'Deskripsi', key: 'deskripsi', width: 50 },
  ];
  for (const t of tasks) {
    ws.addRow({
      tanggal: new Date(t.logDate).toISOString().slice(0, 10),
      judul: t.title,
      status: t.status,
      prioritas: t.priority,
      tag: t.tags || '',
      mulai: t.startTime || '',
      selesai: t.endTime || '',
      durasi: taskMinutes(t),
      deskripsi: t.description || '',
    });
  }
  ws.getRow(1).font = { bold: true };
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName('laporan-dailylog', from, to, 'xlsx')}"`);
  await wb.xlsx.write(res);
  res.end();
});

export default router;
