import { useEffect, useMemo, useState } from 'react';
import { Check, Trash, PencilSimple } from '@phosphor-icons/react';
import { sanitizeHtml } from '../utils/sanitize.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import SummernoteEditor from './SummernoteEditor.jsx';

export const NOTE_COLORS = ['#fef9c3', '#ffedd5', '#dcfce7', '#e0f2fe', '#fae8ff', '#ffe4e6'];

function fmtDateTime(iso) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

// Modal catatan: mode 'lihat' (read-only) untuk note yang sudah ada,
// mode 'edit' untuk menulis/mengubah. Note baru langsung masuk mode edit.
export default function NoteModal({ note, categories, defaultCategoryId, onClose, onSave, onDelete }) {
  const [mode, setMode] = useState(note ? 'view' : 'edit');
  const [title, setTitle] = useState(note?.title || '');
  const [descHtml, setDescHtml] = useState(() => sanitizeHtml(note?.content || ''));
  const [color, setColor] = useState(note?.color || NOTE_COLORS[0]);
  const [categoryId, setCategoryId] = useState(note?.categoryId || defaultCategoryId || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const viewHtml = useMemo(() => sanitizeHtml(note?.content || ''), [note]);
  const catName = categories.find((c) => c.id === (note?.categoryId || ''))?.name || 'Tanpa kategori';

  // Reset isi form setiap kali masuk mode edit (agar batal-edit kembali ke data tersimpan).
  useEffect(() => {
    if (mode === 'edit') {
      setTitle(note?.title || '');
      setDescHtml(sanitizeHtml(note?.content || ''));
      setColor(note?.color || NOTE_COLORS[0]);
      setCategoryId(note?.categoryId || defaultCategoryId || '');
      setError('');
    }
  }, [mode, note, defaultCategoryId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirmDelete) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, confirmDelete]);

  function cancelEdit() {
    if (note) {
      setTitle(note.title || '');
      setDescHtml(sanitizeHtml(note.content || ''));
      setColor(note.color || NOTE_COLORS[0]);
      setCategoryId(note.categoryId || '');
      setError('');
      setMode('view');
    } else {
      onClose();
    }
  }

  async function submit(e) {
    e.preventDefault();
    const content = sanitizeHtml(descHtml || '');
    if (!title.trim() && !content.replace(/<[^>]*>/g, '').trim()) {
      return setError('Isi judul atau catatan terlebih dahulu.');
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        content,
        color,
        categoryId: categoryId || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={note ? 'Lihat catatan' : 'Catatan baru'} className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-card modal-xl${mode === 'view' ? ' note-sheet' : ''}`} style={{ background: mode === 'view' ? (note?.color || '#fef9c3') : undefined }}>
        {mode === 'view' && note ? (
          <div className="note-view">
            <div className="panel-head" style={{ marginBottom: 6 }}>
              <p className="mono" style={{ fontSize: 12, color: 'rgb(35 37 31 / 0.6)' }}>
                {catName} • {fmtDateTime(note.updatedAt)}
              </p>
              <button type="button" className="icon-btn note-view-close" onClick={onClose} aria-label="Tutup">✕</button>
            </div>
            <h2 className="note-view-title">{note.title || 'Tanpa judul'}</h2>
            {viewHtml ? (
              <div className="note-view-body" dangerouslySetInnerHTML={{ __html: viewHtml }} />
            ) : (
              <p className="note-view-empty">Tidak ada isi.</p>
            )}
            <div className="modal-actions">
              {onDelete && (
                <button type="button" className="danger-btn" onClick={() => setConfirmDelete(true)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Trash size={15} /> Hapus
                  </span>
                </button>
              )}
              <div className="modal-actions-right">
                <button type="button" className="pill-btn note-view-btn" onClick={onClose}>Tutup</button>
                <button type="button" className="btn-primary" onClick={() => setMode('edit')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <PencilSimple size={15} /> Edit
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="panel-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 19 }}>{note ? 'Edit catatan' : 'Catatan baru'}</h2>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup editor">✕</button>
            </div>

            <label className="field">
              <span>Judul</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul catatan…" maxLength={255} />
            </label>

            <div className="field">
              <span>Isi catatan</span>
              <SummernoteEditor
                editorKey={note?.id ?? 'new'}
                value={descHtml}
                onChange={setDescHtml}
                height={320}
                placeholder="Tulis ide, referensi, atau draf di sini…"
              />
            </div>

            <div className="note-opt-row">
              <label className="field" style={{ marginBottom: 0, flex: '1 1 200px' }}>
                <span>Kategori</span>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Tanpa kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <div style={{ flex: '1 1 200px' }}>
                <span className="field"><span>Warna kertas</span></span>
                <div className="swatches">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`swatch${color === c ? ' active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                      aria-label={`Warna ${c}`}
                      aria-pressed={color === c}
                    >
                      {color === c && <Check size={14} weight="bold" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p role="alert" className="notice-error" style={{ marginTop: 12 }}>{error}</p>}

            <div className="modal-actions">
              {note && onDelete ? (
                <button type="button" className="danger-btn" onClick={() => setConfirmDelete(true)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Trash size={15} /> Hapus
                  </span>
                </button>
              ) : <span />}
              <div className="modal-actions-right">
                <button type="button" className="pill-btn" onClick={cancelEdit}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Hapus catatan?"
          message={`"${note?.title || 'Tanpa judul'}" akan dihapus permanen dan tidak bisa dikembalikan.`}
          confirmLabel="Hapus"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { setConfirmDelete(false); onDelete(note.id); }}
        />
      )}
    </div>
  );
}
