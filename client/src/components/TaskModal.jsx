import { useState } from 'react';
import { STATUS, dateKey } from '../utils/date.js';
import { inputStyle } from './form.jsx';

export const PRIORITY = {
  HIGH: { label: 'Tinggi', color: '#dc2626', bg: '#fee2e2' },
  MEDIUM: { label: 'Sedang', color: '#b45309', bg: '#fef3c7' },
  LOW: { label: 'Rendah', color: '#4d7c0f', bg: '#ecfccb' },
};

export const RECURRENCE = {
  NONE: 'Tidak berulang',
  DAILY: 'Setiap hari',
  WEEKDAYS: 'Senin–Jumat',
  WEEKLY: 'Setiap minggu',
  MONTHLY: 'Setiap bulan',
};

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
    priority: task?.priority || 'MEDIUM',
    tags: task?.tags || '',
    recurrence: task?.recurrence || 'NONE',
    recurrenceUntil: task?.recurrenceUntil ? String(task.recurrenceUntil).slice(0, 10) : '',
    estimatedMinutes: task?.estimatedMinutes || '',
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
      priority: form.priority,
      tags: form.tags,
      recurrence: task ? 'NONE' : form.recurrence,
      recurrenceUntil: task ? null : form.recurrenceUntil || null,
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null,
    });
  }

  return (
    <div role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()} className="modal-backdrop">
      <form onSubmit={submit} className="modal-card">
        <div style={{ width: 38, height: 4, borderRadius: 8, background: 'var(--line)', margin: '-6px auto 16px' }} className="desktop-only" />
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
        <div className="field-grid">
          <label className="field">
            <span>Status</span>
            <select style={inputStyle} value={form.status} onChange={set('status')}>
              {Object.entries(STATUS).map(([v, s]) => (
                <option key={v} value={v}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Prioritas</span>
            <select style={inputStyle} value={form.priority} onChange={set('priority')}>
              {Object.entries(PRIORITY).map(([v, s]) => (
                <option key={v} value={v}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Estimasi (menit)</span>
            <input style={inputStyle} type="number" min="0" max="1440" placeholder="cth 60" value={form.estimatedMinutes} onChange={set('estimatedMinutes')} />
          </label>
        </div>
        <label className="field">
          <span>Tag (pisahkan koma, cth: Kantor, Belajar)</span>
          <input style={inputStyle} value={form.tags} onChange={set('tags')} placeholder="Kantor, Belajar" />
        </label>
        {!task && (
          <div className="field-grid">
            <label className="field">
              <span>Pengulangan</span>
              <select style={inputStyle} value={form.recurrence} onChange={set('recurrence')}>
                {Object.entries(RECURRENCE).map(([v, s]) => (
                  <option key={v} value={v}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Ulangi sampai (opsional)</span>
              <input style={inputStyle} type="date" value={form.recurrenceUntil} onChange={set('recurrenceUntil')} disabled={form.recurrence === 'NONE'} />
            </label>
          </div>
        )}
        <div className="modal-actions">
          {task ? (
            <button type="button" onClick={() => onDelete(task.id)} className="danger-btn">Hapus</button>
          ) : <span />}
          <div className="modal-actions-right">
            <button type="button" onClick={onClose} className="pill-btn">Batal</button>
            <button className="btn-primary" style={{ borderRadius: 8 }}>Simpan</button>
          </div>
        </div>
      </form>
    </div>
  );
}
