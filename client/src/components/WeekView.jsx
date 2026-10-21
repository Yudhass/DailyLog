import { STATUS, dateKey, normalizeWeekStart, orderedDowNames, weekDays } from '../utils/date.js';

export default function WeekView({ anchor, tasksByDay, selected, onSelect, onEdit, weekStart = 1 }) {
  const ws = normalizeWeekStart(weekStart);
  const hari = orderedDowNames(ws);
  const days = weekDays(anchor, ws);
  const today = dateKey(new Date());
  return (
    <div className="week-grid">
      {days.map((d, i) => {
        const key = dateKey(d);
        const tasks = tasksByDay[key] || [];
        return (
          <section
            key={key}
            className="week-col"
            data-selected={selected === key}
            data-today={key === today}
          >
            <button onClick={() => onSelect(key)} className="week-head" aria-label={key}>
              <span className="week-dow">{hari[i]}</span>
              <span className="week-num mono">{d.getDate()}</span>
            </button>
            <ul className="week-tasks">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => onEdit(t)}
                    className="week-task"
                    data-pri={t.priority || 'MEDIUM'}
                  >
                    <strong>{t.title}</strong>
                    {t.startTime && <span className="week-time mono">{t.startTime}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
