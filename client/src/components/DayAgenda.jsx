import { CalendarPlus } from '@phosphor-icons/react';
import { formatTanggal } from '../utils/date.js';
import { htmlToText } from '../utils/sanitize.js';
import { TaskBadges, TagList } from './TaskMeta.jsx';

export default function DayAgenda({ dateStr, tasks, onAdd, onEdit }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 style={{ fontSize: 17 }}>{formatTanggal(new Date(`${dateStr}T00:00:00`))}</h2>
        <button onClick={onAdd} className="btn-primary desktop-only">
          + Catatan
        </button>
      </div>
      <ul className="task-list">
        {tasks.length === 0 && (
          <li className="empty">
            <span className="empty-ico"><CalendarPlus size={18} /></span>
            Belum ada catatan. Tap tombol tambah untuk mengisi hari ini.
          </li>
        )}
        {tasks.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => onEdit(t)}
              className="task-card"
              data-pri={t.priority || 'MEDIUM'}
            >
              <span className="task-row">
                <strong style={{ fontSize: 15 }}>{t.title}</strong>
              </span>
              {t.description && <span className="task-desc">{htmlToText(t.description, 140)}</span>}
              <TaskBadges task={t} />
              <TagList tags={t.tags} />
              <span className="task-time mono">
                {t.startTime ? (t.endTime ? `${t.startTime} - ${t.endTime}` : t.startTime) : 'Seharian'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
