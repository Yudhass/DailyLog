import { useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import { STATUS, dateKey } from '../utils/date.js';
import { sanitizeHtml } from '../utils/sanitize.js';
import { inputStyle } from './form.jsx';
import TagInput from './TagInput.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import SummernoteEditor from './SummernoteEditor.jsx';

export const PRIORITY = {
  HIGH: { label: 'Tinggi', color: '#dc2626', bg: '#fee2e2' },
  MEDIUM: { label: 'Sedang', color: '#b45309', bg: '#fef3c7' },
  LOW: { label: 'Rendah', color: '#4d7c0f', bg: '#ecfccb' },
};

export const RECURRENCE = {
  NONE: 'Sekali saja',
  HOURLY: 'Setiap jam',
  DAILY: 'Setiap hari',
  WEEKDAYS: 'Senin–Jumat',
  WEEKLY: 'Mingguan — pilih hari',
  MONTHLY: 'Bulanan — pilih tanggal',
  YEARLY: 'Tahunan — pilih bulan & tanggal',
};

// Urutan tampil Sen..Min; nilai mengikuti getDay() (0=Min..6=Sab).
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function dayOf(dateStr, fallback = 1) {
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d.getDate();
}

function monthOf(dateStr, fallback = 1) {
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d.getMonth() + 1;
}

function dowOf(dateStr, fallback = 1) {
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d.getDay();
}

// Label ringkas pola pengulangan untuk badge (cth. "Sen, Rab" / "Tgl 5 tiap bulan").
export function describeRecurrence(t) {
  if (!t?.recurrence || t.recurrence === 'NONE') return '';
  const iv = Number(t.recurrenceInterval) || 1;
  switch (t.recurrence) {
    case 'HOURLY': return iv > 1 ? `Tiap ${iv} jam` : 'Tiap jam';
    case 'DAILY': return iv > 1 ? `Tiap ${iv} hari` : 'Tiap hari';
    case 'WEEKDAYS': return 'Senin–Jumat';
    case 'WEEKLY': {
      const days = String(t.recurrenceDays || '')
        .split(',').map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
      const names = days.map((d) => HARI_PENDEK[d]).join(', ');
      const tiap = iv > 1 ? ` tiap ${iv} minggu` : '';
      return names ? `${names}${tiap}` : `Mingguan${tiap}`;
    }
    case 'MONTHLY':
      return t.recurrenceMonthDay ? `Tgl ${t.recurrenceMonthDay} tiap bulan` : 'Tiap bulan';
    case 'YEARLY':
      return t.recurrenceMonth && t.recurrenceMonthDay
        ? `${t.recurrenceMonthDay} ${BULAN_PENDEK[t.recurrenceMonth - 1]} tiap tahun`
        : 'Tiap tahun';
    default: return 'Berulang';
  }
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TaskModal({ task, defaultDate, onClose, onSave, onDelete }) {
  const initialDow = task?.recurrenceDays
    ? String(task.recurrenceDays).split(',').map(Number).filter((n) => n >= 0 && n <= 6)
    : [dowOf(task ? dateKey(new Date(task.logDate)) : defaultDate)];
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
    recurrenceInterval: task?.recurrenceInterval ? String(task.recurrenceInterval) : '1',
    recurrenceDays: initialDow,
    recurrenceMonthDay: task?.recurrenceMonthDay ? String(task.recurrenceMonthDay) : '',
    recurrenceMonth: task?.recurrenceMonth ? String(task.recurrenceMonth) : '',
    estimatedMinutes: task?.estimatedMinutes || '',
  });
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function toggleDay(dow) {
    setForm((f) => ({
      ...f,
      recurrenceDays: f.recurrenceDays.includes(dow)
        ? f.recurrenceDays.filter((d) => d !== dow)
        : [...f.recurrenceDays, dow].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)),
    }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Judul wajib diisi');
    const isNew = !task;
    const rec = isNew ? form.recurrence : 'NONE';
    const rawDesc = sanitizeHtml(form.description || '');
    const description = rawDesc.replace(/<[^>]*>/g, '').trim() ? rawDesc : '';
    onSave({
      title: form.title.trim(),
      description,
      logDate: form.logDate,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      status: form.status,
      priority: form.priority,
      tags: form.tags,
      recurrence: rec,
      recurrenceUntil: isNew ? form.recurrenceUntil || null : null,
      recurrenceInterval: isNew && ['HOURLY', 'DAILY', 'WEEKLY'].includes(rec)
        ? Number(form.recurrenceInterval) || null : null,
      recurrenceDays: isNew && rec === 'WEEKLY' && form.recurrenceDays.length
        ? form.recurrenceDays.join(',') : null,
      recurrenceMonthDay: isNew && ['MONTHLY', 'YEARLY'].includes(rec)
        ? Number(form.recurrenceMonthDay) || null : null,
      recurrenceMonth: isNew && rec === 'YEARLY'
        ? Number(form.recurrenceMonth) || null : null,
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null,
    });
  }

  return (
    <div role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()} className="modal-backdrop">
      <form onSubmit={submit} className="modal-card modal-wide task-modal">
        <div style={{ width: 38, height: 4, borderRadius: 8, background: 'var(--line)', margin: '-6px auto 16px' }} className="desktop-only" />
        <h2 style={{ fontSize: 20, marginBottom: 18 }}>{task ? 'Edit catatan' : 'Catatan baru'}</h2>
        {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{error}</p>}
        <label className="field">
          <span>Judul</span>
          <input style={inputStyle} required value={form.title} onChange={set('title')} autoFocus />
        </label>
        <div className="field">
          <span>Deskripsi</span>
          <SummernoteEditor
            editorKey={task?.id ?? 'new'}
            value={form.description}
            onChange={(html) => setForm((f) => ({ ...f, description: html }))}
            height={240}
            placeholder="Tulis deskripsi tugas… (bisa format teks, daftar, tautan, gambar)"
          />
        </div>
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
          <TagInput
            inputStyle={inputStyle}
            value={form.tags}
            onChange={(v) => setForm({ ...form, tags: v })}
            placeholder="Kantor, Belajar"
          />
        </label>
        {!task && (
          <>
            <div className="field-grid-2">
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
            {form.recurrence === 'HOURLY' && (
              <label className="field">
                <span>Tiap berapa jam</span>
                <input style={inputStyle} type="number" min="1" max="24" required
                  value={form.recurrenceInterval} onChange={set('recurrenceInterval')}
                  placeholder="cth: 2 = tiap 2 jam" />
              </label>
            )}
            {form.recurrence === 'DAILY' && (
              <label className="field">
                <span>Tiap berapa hari</span>
                <input style={inputStyle} type="number" min="1" max="30" required
                  value={form.recurrenceInterval} onChange={set('recurrenceInterval')}
                  placeholder="cth: 1 = tiap hari" />
              </label>
            )}
            {form.recurrence === 'WEEKLY' && (
              <>
                <div className="field">
                  <span>Di hari apa <em style={{ fontStyle: 'normal', opacity: 0.75 }}>(boleh pilih lebih dari satu)</em></span>
                  <div className="seg" role="group" aria-label="Pilih hari pengulangan" style={{ flexWrap: 'wrap' }}>
                    {WEEKDAY_ORDER.map((dow) => (
                      <button
                        key={dow}
                        type="button"
                        aria-selected={form.recurrenceDays.includes(dow)}
                        onClick={() => toggleDay(dow)}
                        style={{ flex: 1 }}
                      >
                        {HARI_PENDEK[dow]}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="field">
                  <span>Tiap berapa minggu</span>
                  <input style={inputStyle} type="number" min="1" max="12" required
                    value={form.recurrenceInterval} onChange={set('recurrenceInterval')}
                    placeholder="cth: 1 = tiap minggu" />
                </label>
              </>
            )}
            {form.recurrence === 'MONTHLY' && (
              <label className="field">
                <span>Tanggal tiap bulan (1–31)</span>
                <input style={inputStyle} type="number" min="1" max="31"
                  value={form.recurrenceMonthDay || dayOf(form.logDate)}
                  onChange={set('recurrenceMonthDay')}
                  placeholder={`cth: ${dayOf(form.logDate)}`} />
              </label>
            )}
            {form.recurrence === 'YEARLY' && (
              <div className="field-grid-2">
                <label className="field">
                  <span>Bulan</span>
                  <select style={inputStyle} value={form.recurrenceMonth || monthOf(form.logDate)} onChange={set('recurrenceMonth')}>
                    {BULAN_PANJANG.map((nama, i) => (
                      <option key={i + 1} value={i + 1}>{nama}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Tanggal (1–31)</span>
                  <input style={inputStyle} type="number" min="1" max="31"
                    value={form.recurrenceMonthDay || dayOf(form.logDate)}
                    onChange={set('recurrenceMonthDay')}
                    placeholder={`cth: ${dayOf(form.logDate)}`} />
                </label>
              </div>
            )}
          </>
        )}
        <div className="modal-actions">
          {task ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className="icon-btn danger" aria-label={`Hapus ${task.title}`} title="Hapus">
              <Trash size={17} />
            </button>
          ) : <span />}
          <div className="modal-actions-right">
            <button type="button" onClick={onClose} className="pill-btn">Batal</button>
            <button className="btn-primary" style={{ borderRadius: 8 }}>Simpan</button>
          </div>
        </div>
      </form>
      {confirmDelete && task && (
        <ConfirmDialog
          title="Hapus catatan?"
          message={`"${task.title}" akan dihapus permanen dan tidak bisa dikembalikan.`}
          confirmLabel="Hapus"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { setConfirmDelete(false); onDelete(task.id); }}
        />
      )}
    </div>
  );
}
