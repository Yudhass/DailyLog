import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, PencilSimple, Trash, DotsSixVertical, Notepad as NotepadIcon, Check,
} from '@phosphor-icons/react';
import { api } from '../api/client.js';
import TopBar from '../components/TopBar.jsx';
import NoteModal from '../components/NoteModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { htmlToText } from '../utils/sanitize.js';

const NONE = '__none__';

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function Notes() {
  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { note?, categoryId? }
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [renameId, setRenameId] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [confirmCat, setConfirmCat] = useState(null); // kolom yang diminta hapus

  // --- drag & drop ---
  const [dragId, setDragId] = useState(null);
  const [ghost, setGhost] = useState(null); // { x, y, w, title }
  const [dropT, setDropT] = useState(null); // { colId, index }
  const dragRef = useRef(null);
  const ptrRef = useRef({ x: 0, y: 0 });
  const boardRef = useRef(null);
  const rafRef = useRef(0);
  const suppressClick = useRef(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notes');
      setCategories(data.categories || []);
      setNotes(data.notes || []);
    } catch {
      toast.error('Gagal memuat papan catatan.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const columns = useMemo(() => {
    const sorted = [...categories].sort((a, b) => a.orderIndex - b.orderIndex);
    return [...sorted, { id: NONE, name: 'Tanpa kategori', locked: true }];
  }, [categories]);

  const grouped = useMemo(() => {
    const map = {};
    columns.forEach((c) => { map[c.id] = []; });
    notes.forEach((n) => {
      const key = n.categoryId && map[n.categoryId] ? n.categoryId : NONE;
      map[key].push(n);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.orderIndex - b.orderIndex));
    return map;
  }, [notes, columns]);

  // ---------- mutations ----------
  async function createCategory(e) {
    e?.preventDefault();
    const name = newCat.trim();
    if (!name) return;
    try {
      await api.post('/notes/categories', { name });
      setNewCat('');
      setAddingCat(false);
      toast.success(`Kategori "${name}" dibuat.`);
      await load();
    } catch {
      toast.error('Gagal membuat kategori.');
    }
  }

  async function renameCategory(id) {
    const name = renameName.trim();
    setRenameId(null);
    if (!name) return;
    try {
      await api.put(`/notes/categories/${id}`, { name });
      toast.success('Nama kategori diperbarui.');
      await load();
    } catch {
      toast.error('Gagal mengubah nama kategori.');
    }
  }

  async function deleteCategory(col) {
    try {
      await api.delete(`/notes/categories/${col.id}`);
      setConfirmCat(null);
      toast.success(`Kategori "${col.name}" dihapus.`);
      await load();
    } catch {
      toast.error('Gagal menghapus kategori.');
    }
  }

  async function saveNote(payload) {
    const isEdit = Boolean(modal?.note);
    try {
      if (isEdit) await api.put(`/notes/${modal.note.id}`, payload);
      else await api.post('/notes', payload);
      setModal(null);
      toast.success(isEdit ? 'Catatan diperbarui.' : 'Catatan baru ditambahkan.');
      await load();
    } catch {
      toast.error('Catatan gagal disimpan.');
    }
  }

  async function deleteNote(id) {
    try {
      await api.delete(`/notes/${id}`);
      setModal(null);
      toast.success('Catatan dihapus.');
      await load();
    } catch {
      toast.error('Catatan gagal dihapus.');
    }
  }

  // ---------- drag & drop (pointer, mouse + sentuh) ----------
  function detectTarget(x, y, noteId) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cardEl = el.closest('[data-note-card]');
    if (cardEl?.dataset.noteCard && cardEl.dataset.noteCard !== noteId) {
      const colEl = cardEl.closest('[data-note-col]');
      const colId = colEl?.dataset.noteCol;
      if (!colId) return null;
      const list = (grouped[colId] || []).filter((n) => n.id !== noteId);
      const idx = list.findIndex((n) => n.id === cardEl.dataset.noteCard);
      if (idx < 0) return { colId, index: list.length };
      const r = cardEl.getBoundingClientRect();
      return { colId, index: y < r.top + r.height / 2 ? idx : idx + 1 };
    }
    const colEl = el.closest('[data-note-col]');
    if (colEl?.dataset.noteCol) {
      const colId = colEl.dataset.noteCol;
      const list = (grouped[colId] || []).filter((n) => n.id !== noteId);
      return { colId, index: list.length };
    }
    return null;
  }

  function autoScrollLoop() {
    const d = dragRef.current;
    if (!d?.started) return;
    const board = boardRef.current;
    if (board) {
      const r = board.getBoundingClientRect();
      const { x, y } = ptrRef.current;
      let dx = 0;
      let dy = 0;
      if (x > r.right - 56) dx = 16;
      else if (x < r.left + 56) dx = -16;
      if (y > window.innerHeight - 80) dy = 16;
      else if (y < 80) dy = -16;
      if (dx) board.scrollLeft += dx;
      if (dy) window.scrollBy(0, dy);
    }
    rafRef.current = requestAnimationFrame(autoScrollLoop);
  }

  function onGripDown(e, note) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const cardEl = e.currentTarget.closest('[data-note-card]');
    dragRef.current = {
      noteId: note.id,
      started: false,
      startX: e.clientX,
      startY: e.clientY,
      w: cardEl?.offsetWidth || 280,
      title: note.title,
    };

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      ptrRef.current = { x: ev.clientX, y: ev.clientY };
      if (!d.started) {
        const dist = Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY);
        if (dist < 7) return;
        d.started = true;
        setDragId(d.noteId);
        setGhost({ x: ev.clientX, y: ev.clientY, w: d.w, title: d.title });
        rafRef.current = requestAnimationFrame(autoScrollLoop);
      } else {
        setGhost((g) => (g ? { ...g, x: ev.clientX, y: ev.clientY } : g));
        setDropT(detectTarget(ev.clientX, ev.clientY, d.noteId));
      }
    };

    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      cancelAnimationFrame(rafRef.current);
      const d = dragRef.current;
      dragRef.current = null;
      if (!d?.started) return;
      suppressClick.current = true;
      setGhost(null);
      setDragId(null);
      const target = detectTarget(ev.clientX, ev.clientY, d.noteId);
      setDropT(null);
      if (target) commitDrop(d.noteId, target);
      setTimeout(() => { suppressClick.current = false; }, 0);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  async function commitDrop(noteId, target) {
    const next = {};
    columns.forEach((c) => {
      next[c.id] = (grouped[c.id] || []).filter((n) => n.id !== noteId);
    });
    const moving = notes.find((n) => n.id === noteId);
    if (!moving) return;
    const arr = next[target.colId] || (next[target.colId] = []);
    arr.splice(Math.max(0, Math.min(target.index, arr.length)), 0, moving);

    const flat = [];
    const items = [];
    columns.forEach((c) => {
      (next[c.id] || []).forEach((n, i) => {
        const catId = c.id === NONE ? null : c.id;
        flat.push({ ...n, categoryId: catId, orderIndex: i });
        items.push({ id: n.id, categoryId: catId, orderIndex: i });
      });
    });
    setNotes(flat);
    try {
      await api.patch('/notes/reorder', { items });
    } catch {
      toast.error('Gagal menyimpan posisi. Memuat ulang…');
      load();
    }
  }

  function openEditor(note, categoryId) {
    if (suppressClick.current) return;
    setModal({ note: note || null, categoryId });
  }

  // ---------- render ----------
  return (
    <>
      <TopBar />
      <main className="container page">
        <div className="page-head">
          <div>
            <p className="page-kicker"><NotepadIcon size={14} /> Workspace bebas tanggal</p>
            <h1 className="page-title" style={{ fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '-0.02em' }}>
              Sticky Notes
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              {notes.length} catatan • {categories.length} kategori • seret kartu untuk memindahkan
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={() => setAddingCat(true)}>+ Kategori baru</button>
          </div>
        </div>

        {loading ? (
          <div className="board" aria-label="Memuat papan">
            {[0, 1, 2].map((i) => (
              <div key={i} className="board-col">
                <div className="skel" style={{ height: 22, width: '55%' }} />
                <div className="skel" style={{ height: 120 }} />
                <div className="skel" style={{ height: 90 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="board" ref={boardRef}>
            {columns.map((col) => {
              const list = grouped[col.id] || [];
              return (
                <section key={col.id} className="board-col" aria-label={col.name}>
                  <div className="board-col-head">
                    {renameId === col.id ? (
                      <form
                        style={{ flex: 1, display: 'flex', gap: 6 }}
                        onSubmit={(e) => { e.preventDefault(); renameCategory(col.id); }}
                      >
                        <input
                          autoFocus
                          value={renameName}
                          onChange={(e) => setRenameName(e.target.value)}
                          onBlur={() => renameCategory(col.id)}
                          maxLength={128}
                          aria-label="Nama kategori"
                          style={{
                            flex: 1, minWidth: 0, border: '1px solid var(--green)',
                            borderRadius: 8, padding: '6px 10px', background: 'var(--paper)', color: 'inherit',
                          }}
                        />
                        <button type="submit" className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Simpan nama">
                          <Check size={15} />
                        </button>
                      </form>
                    ) : (
                      <>
                        <h2 className="board-col-title">{col.name}</h2>
                        <span className="board-count mono">{list.length}</span>
                        {!col.locked && (
                          <span className="board-col-actions">
                            <button
                              className="mini-btn"
                              aria-label={`Ubah nama ${col.name}`}
                              onClick={() => { setRenameId(col.id); setRenameName(col.name); }}
                            >
                              <PencilSimple size={14} />
                            </button>
                            <button
                              className="mini-btn danger"
                              aria-label={`Hapus ${col.name}`}
                              onClick={() => setConfirmCat(col)}
                            >
                              <Trash size={14} />
                            </button>
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="board-list" data-note-col={col.id}>
                    {list.map((n, i) => (
                      <div key={n.id}>
                        {dragId && dropT?.colId === col.id && dropT.index === i && (
                          <div className="drop-line" aria-hidden="true" />
                        )}
                        <article
                          data-note-card={n.id}
                          className={`note-card${dragId === n.id ? ' is-dragging' : ''}`}
                          style={{ background: n.color }}
                          onClick={() => openEditor(n)}
                        >
                          <span
                            className="note-grip"
                            role="button"
                            aria-label={`Seret catatan ${n.title || 'tanpa judul'}`}
                            onPointerDown={(e) => onGripDown(e, n)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DotsSixVertical size={16} weight="bold" />
                          </span>
                          <div className="note-body">
                            <strong className="note-title">{n.title || 'Tanpa judul'}</strong>
                            {n.content && <p className="note-snippet">{htmlToText(n.content, 120)}</p>}
                            <span className="note-date mono">{fmtDate(n.updatedAt)}</span>
                          </div>
                        </article>
                      </div>
                    ))}
                    {dragId && dropT?.colId === col.id && dropT.index === list.length && (
                      <div className="drop-line" aria-hidden="true" />
                    )}
                    {list.length === 0 && !dragId && (
                      <p className="board-empty">Belum ada catatan. Jatuhkan kartu di sini atau tambah baru.</p>
                    )}
                  </div>

                  <button className="board-add" onClick={() => openEditor(null, col.id === NONE ? null : col.id)}>
                    <Plus size={15} weight="bold" /> Tambah note
                  </button>
                </section>
              );
            })}

            {addingCat ? (
              <form className="board-col board-new" onSubmit={createCategory}>
                <h2 className="board-col-title">Kategori baru</h2>
                <input
                  autoFocus
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="cth: Draft Artikel"
                  maxLength={128}
                  aria-label="Nama kategori baru"
                  className="board-new-input"
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>Simpan</button>
                  <button type="button" className="pill-btn" onClick={() => { setAddingCat(false); setNewCat(''); }}>
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <button className="board-col board-new-btn" onClick={() => setAddingCat(true)}>
                <Plus size={18} weight="bold" />
                <span>Tambah kategori</span>
              </button>
            )}
          </div>
        )}
      </main>

      {ghost && (
        <div
          className="drag-ghost"
          aria-hidden="true"
          style={{ left: ghost.x - ghost.w / 2, top: ghost.y - 20, width: ghost.w }}
        >
          {ghost.title || 'Tanpa judul'}
        </div>
      )}

      {modal && (
        <NoteModal
          note={modal.note}
          categories={categories}
          defaultCategoryId={modal.note?.categoryId || modal.categoryId || ''}
          onClose={() => setModal(null)}
          onSave={saveNote}
          onDelete={deleteNote}
        />
      )}

      {confirmCat && (
        <ConfirmDialog
          title={`Hapus kategori "${confirmCat.name}"?`}
          message={(grouped[confirmCat.id] || []).length > 0
            ? `${(grouped[confirmCat.id] || []).length} catatan di dalamnya pindah ke Tanpa kategori.`
            : 'Kategori kosong ini akan dihapus permanen.'}
          confirmLabel="Hapus"
          danger
          onCancel={() => setConfirmCat(null)}
          onConfirm={() => deleteCategory(confirmCat)}
        />
      )}
    </>
  );
}
