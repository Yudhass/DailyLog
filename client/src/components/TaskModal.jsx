import { useState } from 'react';
import { STATUS, dateKey } from '../utils/date.js';
import { inputStyle } from './form.jsx';

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TaskModal({ task, defaultDate, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    logDate: task ? dateKey(new Date(task.logDate)) : defaultDate,
    startTime: task?.startTime || nowTime(),
    endTime: task?.endTime || '',
    status: task?.status || 'TODO',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Judul wajib diisi');
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      logDate: form.logDate,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      status: form.status,
    });
  }

  return (
    <div role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()} className="modal-backdrop">
      <form onSubmit={submit} className="modal-card">
        <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line)', margin: '-6px auto 16px' }} className="desktop-only" />
        <h2 style={{ fontSize: 20, marginBottom: 18 }}>{task ? 'Edit catatan' : 'Catatan baru'}</h2>
        {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{error}</p>}
        <label className="field">
          <span>Judul</span>
          <input style={inputStyle} required value={form.title} onChange={set('title')} autoFocus />
        </label>
        <label className="field">
          <span>Deskripsi</span>
          <textarea style={{ ...inputStyle, minHeight: 76, resize: 'vertical' }} value={form.description} onChange={set('description')} />
        </label>
        <div className="field-grid">
          <label className="field">
            <span>Tanggal</span>
            <input style={inputStyle} type="date" required value={form.logDate} onChange={set('logDate')} />
          </label>
          <label className="field">
            <span>Mulai</span>
            <input style={inputStyle} type="time" value={form.startTime} onChange={set('startTime')} />
          </label>
          <label className="field">
            <span>Selesai</span>
            <input style={inputStyle} type="time" value={form.endTime} onChange={set('endTime')} />
          </label>
        </div>
        <label className="field">
          <span>Status</span>
          <select style={inputStyle} value={form.status} onChange={set('status')}>
            {Object.entries(STATUS).map(([v, s]) => (
              <option key={v} value={v}>{s.label}</option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          {task ? (
            <button type="button" onClick={() => onDelete(task.id)} className="danger-btn">Hapus</button>
          ) : <span />}
          <div className="modal-actions-right">
            <button type="button" onClick={onClose} className="pill-btn">Batal</button>
            <button className="btn-primary" style={{ borderRadius: 999 }}>Simpan</button>
          </div>
        </div>
      </form>
    </div>
  );
}