import { useEffect, useMemo, useRef, useState } from 'react';
import {
  TextB, TextItalic, TextUnderline, TextHTwo, ListBullets, ListNumbers,
  Link as LinkIcon, Image as ImageIcon, Eraser, Check, Trash, PencilSimple,
} from '@phosphor-icons/react';
import { sanitizeHtml } from '../utils/sanitize.js';
import ConfirmDialog from './ConfirmDialog.jsx';

export const NOTE_COLORS = ['#fef9c3', '#ffedd5', '#dcfce7', '#e0f2fe', '#fae8ff', '#ffe4e6'];

function exec(cmd, value = null) {
  document.execCommand(cmd, false, value);
}

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
  const [color, setColor] = useState(note?.color || NOTE_COLORS[0]);
  const [categoryId, setCategoryId] = useState(note?.categoryId || defaultCategoryId || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [linkPrompt, setLinkPrompt] = useState(false);
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const initialHtml = useRef(sanitizeHtml(note?.content || ''));

  const viewHtml = useMemo(() => sanitizeHtml(note?.content || ''), [note]);
  const catName = categories.find((c) => c.id === (note?.categoryId || ''))?.name || 'Tanpa kategori';

  // Isi editor setiap kali masuk mode edit (agar batal-edit kembali ke data tersimpan).
  useEffect(() => {
    if (mode === 'edit' && editorRef.current) {
      editorRef.current.innerHTML = sanitizeHtml(note?.content || '');
      editorRef.current.focus();
    }
  }, [mode, note]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirmDelete && !linkPrompt) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, confirmDelete, linkPrompt]);

  function tool(cmd, value) {
    return {
      onMouseDown: (e) => {
        e.preventDefault();
        editorRef.current?.focus();
        exec(cmd, value);
      },
    };
  }

  function applyLink(url) {
    setLinkPrompt(false);
    if (!url) return;
    editorRef.current?.focus();
    exec('createLink', url);
  }

  function insertImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('File harus berupa gambar.');
    if (file.size > 1.5 * 1024 * 1024) return setError('Ukuran gambar maksimal 1,5 MB agar ringan.');
    const reader = new FileReader();
    reader.onload = () => {
      downscale(String(reader.result), (small) => {
        editorRef.current?.focus();
        exec('insertImage', small);
        setError('');
      });
    };
    reader.readAsDataURL(file);
  }

  // Kecilkan gambar ke maks 640px agar ringan & tidak raksasa di kartu.
  function downscale(dataUrl, done) {
    const img = new Image();
    img.onload = () => {
      const MAX = 640;
      if (img.width <= MAX) return done(dataUrl);
      const scale = MAX / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = MAX;
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      done(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => done(dataUrl);
    img.src = dataUrl;
  }

  // Klik gambar di editor -> pilih (beri bingkai) + tampilkan alat resize.
  const [selImg, setSelImg] = useState(null); // { x, y }

  function onEditorClick(e) {
    const t = e.target;
    if (t?.tagName === 'IMG' && editorRef.current?.contains(t)) {
      editorRef.current.querySelectorAll('img.sel-img').forEach((im) => im.classList.remove('sel-img'));
      t.classList.add('sel-img');
      setSelImg({ x: e.clientX, y: e.clientY });
    } else {
      editorRef.current?.querySelectorAll('img.sel-img').forEach((im) => im.classList.remove('sel-img'));
      setSelImg(null);
    }
  }

  function resizeSelected(width) {
    const img = editorRef.current?.querySelector('img.sel-img');
    if (img) {
      if (width) img.setAttribute('width', String(width));
      else img.removeAttribute('width');
    }
    setSelImg(null);
    editorRef.current?.querySelectorAll('img.sel-img').forEach((im) => im.classList.remove('sel-img'));
    editorRef.current?.focus();
  }

  function cancelEdit() {
    if (note) {
      setTitle(note.title || '');
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
    const content = sanitizeHtml(editorRef.current?.innerHTML || '');
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

            <div className="rte-toolbar" role="toolbar" aria-label="Format teks">
              <button type="button" className="rte-btn" title="Tebal" {...tool('bold')}><TextB size={17} /></button>
              <button type="button" className="rte-btn" title="Miring" {...tool('italic')}><TextItalic size={17} /></button>
              <button type="button" className="rte-btn" title="Garis bawah" {...tool('underline')}><TextUnderline size={17} /></button>
              <button type="button" className="rte-btn" title="Judul bagian" {...tool('formatBlock', 'h2')}><TextHTwo size={17} /></button>
              <span className="rte-sep" />
              <button type="button" className="rte-btn" title="Poin-poin" {...tool('insertUnorderedList')}><ListBullets size={17} /></button>
              <button type="button" className="rte-btn" title="Bernomor" {...tool('insertOrderedList')}><ListNumbers size={17} /></button>
              <button type="button" className="rte-btn" title="Sisipkan tautan" onMouseDown={(e) => { e.preventDefault(); setLinkPrompt(true); }}><LinkIcon size={17} /></button>
              <button type="button" className="rte-btn" title="Sisipkan gambar (maks 1,5 MB)" onMouseDown={(e) => { e.preventDefault(); fileRef.current?.click(); }}><ImageIcon size={17} /></button>
              <button type="button" className="rte-btn" title="Hapus format" {...tool('removeFormat')}><Eraser size={17} /></button>
            </div>

            <div
              ref={editorRef}
              className="rte-area"
              contentEditable
              role="textbox"
              aria-multiline="true"
              aria-label="Isi catatan"
              data-placeholder="Tulis ide, referensi, atau draf di sini… (klik gambar untuk mengubah ukurannya)"
              onClick={onEditorClick}
              suppressContentEditableWarning
            />
            {selImg && (
              <div className="img-tools" style={{ left: Math.min(selImg.x, window.innerWidth - 260), top: selImg.y + 12 }} role="toolbar" aria-label="Ukuran gambar">
                <span className="img-tools-label">Ukuran:</span>
                <button type="button" onClick={() => resizeSelected(240)}>Kecil</button>
                <button type="button" onClick={() => resizeSelected(420)}>Sedang</button>
                <button type="button" onClick={() => resizeSelected(null)}>Penuh</button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { insertImage(e.target.files?.[0]); e.target.value = ''; }}
            />

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
      {linkPrompt && (
        <ConfirmDialog
          title="Sisipkan tautan"
          input={{ label: 'URL (https://…)', placeholder: 'https://contoh.com', defaultValue: 'https://' }}
          confirmLabel="Sisipkan"
          onCancel={() => setLinkPrompt(false)}
          onConfirm={applyLink}
        />
      )}
    </div>
  );
}
