import { useCallback, useEffect, useState } from 'react';
import { Lightning } from '@phosphor-icons/react';
import { api } from '../api/client.js';
import { saveOnlineFirst } from '../offline/queue.js';
import { useToast } from '../context/ToastContext.jsx';
import { STATUS } from '../utils/date.js';
import { PRIORITY } from './TaskModal.jsx';
import { inputStyle } from './form.jsx';
import TagInput from './TagInput.jsx';

// F1 — Quick Add bahasa natural. Shortcut Ctrl/Cmd+K, pratinjau editable, 1 klik simpan.
export default function QuickAdd({ defaultDate, onSaved }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState(null);
  const [engine, setEngine] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const parse = useCallback(async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/ai/parse-task', { text: text.trim() });
      setDraft({ ...data.draft, logDate: data.draft.logDate || defaultDate });
      setEngine(data.engine || '');
    } catch {
      // Fallback FR-1.8: judul terisi teks asli, form manual
      setDraft({
        title: text.trim().slice(0, 140), logDate: defaultDate, startTime: null,
        endTime: null, priority: 'MEDIUM', status: 'TODO', tags: [], estimatedMinutes: null,
      });
      setEngine('offline-fallback');
    } finally {
      setBusy(false);
    }
  }, [text, defaultDate]);

  async function save() {
    if (!draft?.title?.trim()) {
      setError('Judul wajib diisi');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...draft,
        tags: Array.isArray(draft.tags) ? draft.tags.join(',') : draft.tags,
      };
      const { queued } = await saveOnlineFirst({ op: 'create', data: payload });
      setOpen(false);
      setText('');
      setDraft(null);
      if (queued) toast.info('Offline — tersimpan lokal, dikirim saat online.');
      else toast.success('Catatan ditambahkan.');
      onSaved?.(queued);
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal menyimpan.';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  return (
    <>
      <button
        className="pill-btn"
        onClick={() => setOpen(true)}
        title="Catat cepat (Ctrl+K)"
        style={{ border: '1px dashed var(--line)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <Lightning size={15} weight="fill" /> Quick add <span className="mono" style={{ opacity: 0.6 }}>Ctrl+K</span>
      </button>
      {open && (
        <div role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setOpen(false)} className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>Quick add</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
              Ketik bebas, cth: “besok jam 3 meeting klien #kantor prioritas tinggi”
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && parse()}
                placeholder="Tulis catatan…"
                autoFocus
              />
              <button className="btn-primary" style={{ borderRadius: 8 }} onClick={parse} disabled={busy || !text.trim()}>
                {busy ? '…' : 'Parse'}
              </button>
            </div>
            {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginTop: 10 }}>{error}</p>}
            {draft && (
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                <p className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Hasil parsing ({engine === 'llm' ? 'AI' : 'lokal'}) — periksa sebelum simpan:
                </p>
                <label className="field"><span>Judul</span>
                  <input style={inputStyle} value={draft.title || ''} onChange={set('title')} />
                </label>
                <div className="field-grid">
                  <label className="field"><span>Tanggal</span>
                    <input style={inputStyle} type="date" value={draft.logDate || ''} onChange={set('logDate')} />
                  </label>
                  <label className="field"><span>Mulai</span>
                    <input style={inputStyle} type="time" value={draft.startTime || ''} onChange={set('startTime')} />
                  </label>
                  <label className="field"><span>Selesai</span>
                    <input style={inputStyle} type="time" value={draft.endTime || ''} onChange={set('endTime')} />
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field"><span>Prioritas</span>
                    <select style={inputStyle} value={draft.priority || 'MEDIUM'} onChange={set('priority')}>
                      {Object.entries(PRIORITY).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Status</span>
                    <select style={inputStyle} value={draft.status || 'TODO'} onChange={set('status')}>
                      {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Tag (koma)</span>
                    <TagInput
                      inputStyle={inputStyle}
                      value={Array.isArray(draft.tags) ? draft.tags.join(', ') : draft.tags || ''}
                      onChange={(v) => setDraft({ ...draft, tags: v.split(',').map((s) => s.trim()).filter(Boolean) })}
                    />
                  </label>
                </div>
                <div className="modal-actions-right">
                  <button className="pill-btn" onClick={() => setOpen(false)}>Batal</button>
                  <button className="btn-primary" style={{ borderRadius: 8 }} onClick={save} disabled={busy}>
                    Simpan ✓
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
