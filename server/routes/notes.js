import { Router } from 'express';
import { NoteCategory, StickyNote, sequelize } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

const NOTE_COLORS = ['#fef9c3', '#ffedd5', '#dcfce7', '#e0f2fe', '#fae8ff', '#ffe4e6'];

function plainCategory(c) {
  return { id: c.id, name: c.name, orderIndex: c.orderIndex };
}

function plainNote(n) {
  return {
    id: n.id,
    categoryId: n.categoryId || null,
    title: n.title || '',
    content: n.content || '',
    color: n.color || '#fef9c3',
    orderIndex: n.orderIndex,
    updatedAt: n.updatedAt,
  };
}

// ---------- Categories ----------
router.get('/categories', async (req, res) => {
  const rows = await NoteCategory.findAll({
    where: { userId: req.user.id },
    order: [['orderIndex', 'ASC'], ['createdAt', 'ASC']],
  });
  res.json(rows.map(plainCategory));
});

router.post('/categories', async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 128);
  if (!name) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  const max = await NoteCategory.max('orderIndex', { where: { userId: req.user.id } });
  const cat = await NoteCategory.create({
    userId: req.user.id,
    name,
    orderIndex: Number.isFinite(max) ? max + 1 : 0,
  });
  res.status(201).json(plainCategory(cat));
});

router.put('/categories/:id', async (req, res) => {
  const cat = await NoteCategory.findByPk(req.params.id);
  if (!cat || cat.userId !== req.user.id) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  const name = String(req.body?.name || '').trim().slice(0, 128);
  if (!name) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  await cat.update({ name });
  res.json(plainCategory(cat));
});

router.delete('/categories/:id', async (req, res) => {
  const cat = await NoteCategory.findByPk(req.params.id);
  if (!cat || cat.userId !== req.user.id) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  // Catatan di dalamnya tidak ikut terhapus — pindah ke "Tanpa kategori".
  await StickyNote.update({ categoryId: null }, { where: { userId: req.user.id, categoryId: cat.id } });
  await cat.destroy();
  res.json({ ok: true });
});

// ---------- Sticky notes ----------
router.get('/', async (req, res) => {
  const [cats, notes] = await Promise.all([
    NoteCategory.findAll({
      where: { userId: req.user.id },
      order: [['orderIndex', 'ASC'], ['createdAt', 'ASC']],
    }),
    StickyNote.findAll({
      where: { userId: req.user.id },
      order: [['orderIndex', 'ASC'], ['createdAt', 'ASC']],
    }),
  ]);
  res.json({ categories: cats.map(plainCategory), notes: notes.map(plainNote) });
});

router.post('/', async (req, res) => {
  const { categoryId, title, content, color } = req.body || {};
  let catId = null;
  if (categoryId) {
    const cat = await NoteCategory.findByPk(categoryId);
    if (!cat || cat.userId !== req.user.id) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    catId = cat.id;
  }
  const max = await StickyNote.max('orderIndex', { where: { userId: req.user.id, categoryId: catId } });
  const note = await StickyNote.create({
    userId: req.user.id,
    categoryId: catId,
    title: String(title || '').slice(0, 255),
    content: String(content || ''),
    color: NOTE_COLORS.includes(color) ? color : NOTE_COLORS[0],
    orderIndex: Number.isFinite(max) ? max + 1 : 0,
  });
  res.status(201).json(plainNote(note));
});

router.put('/:id', async (req, res) => {
  const note = await StickyNote.findByPk(req.params.id);
  if (!note || note.userId !== req.user.id) return res.status(404).json({ error: 'Catatan tidak ditemukan' });
  const { title, content, color, categoryId } = req.body || {};
  let catId = note.categoryId;
  if (categoryId !== undefined) {
    if (categoryId) {
      const cat = await NoteCategory.findByPk(categoryId);
      if (!cat || cat.userId !== req.user.id) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
      catId = cat.id;
    } else {
      catId = null;
    }
  }
  await note.update({
    title: title === undefined ? note.title : String(title).slice(0, 255),
    content: content === undefined ? note.content : String(content),
    color: color === undefined ? note.color : (NOTE_COLORS.includes(color) ? color : note.color),
    categoryId: catId,
  });
  res.json(plainNote(note));
});

router.delete('/:id', async (req, res) => {
  const note = await StickyNote.findByPk(req.params.id);
  if (!note || note.userId !== req.user.id) return res.status(404).json({ error: 'Catatan tidak ditemukan' });
  await note.destroy();
  res.json({ ok: true });
});

// ---------- Drag & drop: simpan urutan + kategori baru ----------
router.patch('/reorder', async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Payload items harus array' });
  const ids = items.map((i) => i?.id).filter(Boolean);
  if (!ids.length) return res.json({ ok: true });
  const owned = await StickyNote.findAll({ where: { userId: req.user.id, id: ids } });
  const ownedIds = new Set(owned.map((n) => n.id));
  const catIds = [...new Set(items.map((i) => i?.categoryId).filter(Boolean))];
  let validCatIds = new Set();
  if (catIds.length) {
    const cats = await NoteCategory.findAll({ where: { userId: req.user.id, id: catIds } });
    validCatIds = new Set(cats.map((c) => c.id));
  }
  const t = await sequelize.transaction();
  try {
    for (const item of items) {
      if (!item?.id || !ownedIds.has(item.id)) continue;
      const catId = item.categoryId && validCatIds.has(item.categoryId) ? item.categoryId : null;
      await StickyNote.update(
        { categoryId: catId, orderIndex: Number(item.orderIndex) || 0 },
        { where: { id: item.id }, transaction: t }
      );
    }
    await t.commit();
    res.json({ ok: true });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: 'Gagal menyimpan urutan' });
  }
});

export default router;
export { NOTE_COLORS };
