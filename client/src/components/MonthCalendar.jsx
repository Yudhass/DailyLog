import { STATUS, dateKey, monthMatrix, normalizeWeekStart, orderedDowNames } from '../utils/date.js';

export default function MonthCalendar({ cursor, tasksByDay, selected, onSelect, weekStart = 1 }) {
  const ws = normalizeWeekStart(weekStart);
  const hari = orderedDowNames(ws);
  const cells = monthMatrix(cursor.getFullYear(), cursor.getMonth(), ws);
  const today = dateKey(new Date());

  return (
    <div className="cal-shell">
      <div className="cal-dow-row">
        {hari.map((h) => (
          <div key={h} className="cal-dow">{h}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((d) => {
          const key = dateKey(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const dayTasks = tasksByDay[key] || [];
          const done = dayTasks.filter((t) => t.status === 'DONE').length;
          return (
            <button
              key={key}
              className="cal-cell"
              data-outside={!inMonth}
              data-today={key === today}
              onClick={() => onSelect(key)}
              aria-label={key}
              aria-pressed={selected === key}
            >
              <span className="mono cal-num">{d.getDate()}</span>
              <span className="cal-dots">
                {dayTasks.slice(0, 3).map((t) => (
                  <span key={t.id} style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS[t.status]?.color || 'var(--stone)' }} />
                ))}
                {dayTasks.length > 3 && <span className="mono" style={{ color: 'var(--muted)' }}>+{dayTasks.length - 3}</span>}
              </span>
              {done > 0 && inMonth && <span className="mono cal-done">{done} selesai</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}