import StatusBadge from './StatusBadge.jsx';
import { formatTanggal } from '../utils/date.js';

export default function DayAgenda({ dateStr, tasks, onAdd, onEdit }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 style={{ fontSize: 17 }}>{formatTanggal(new Date(`${dateStr}T00:00:00`))}</h2>
        <button onClick={onAdd} className="pill-btn desktop-only" style={{ border: 'none', background: 'var(--green)', color: 'var(--on-green)', fontWeight: 600 }}>
          + Catatan
        </button>
      </div>
      <ul className="task-list">
        {tasks.length === 0 && (
          <li className="empty">Belum ada catatan. Tap tombol tambah untuk mengisi hari ini.</li>
        )}
        {tasks.map((t) => (
          <li key={t.id}>
            <button onClick={() => onEdit(t)} className="task-card">
              <span className="task-row">
                <strong style={{ fontSize: 15 }}>{t.title}</strong>
                <span className="mono" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {t.startTime ? (t.endTime ? `${t.startTime} - ${t.endTime}` : t.startTime) : 'Seharian'}
                </span>
              </span>
              {t.description && <span style={{ color: 'var(--muted)', fontSize: 13 }}>{t.description}</span>}
              <StatusBadge status={t.status} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}