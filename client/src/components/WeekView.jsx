import { STATUS, dateKey, weekDays } from '../utils/date.js';

const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function WeekView({ anchor, tasksByDay, selected, onSelect, onEdit }) {
  const days = weekDays(anchor);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(140px, 1fr))', gap: 10, overflowX: 'auto' }}>
      {days.map((d, i) => {
        const key = dateKey(d);
        const tasks = tasksByDay[key] || [];
        return (
          <section key={key} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', background: selected === key ? 'var(--green-soft)' : 'var(--surface)', padding: 12, minHeight: 200 }}>
            <button onClick={() => onSelect(key)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', width: '100%' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{HARI[i]}</span>
              <span className="mono" style={{ display: 'block', fontSize: 18, fontWeight: 700 }}>{d.getDate()}</span>
            </button>
            <ul style={{ listStyle: 'none', marginTop: 10, display: 'grid', gap: 8 }}>
              {tasks.map((t) => (
                <li key={t.id}>
                  <button onClick={() => onEdit(t)} style={{ width: '100%', textAlign: 'left', border: '1px solid var(--line)', borderLeft: `3px solid ${STATUS[t.status]?.color || 'var(--stone)'}`, borderRadius: 8, background: 'var(--paper)', padding: '8px 10px', fontSize: 13 }}>
                    <strong>{t.title}</strong>
                    {t.startTime && <span className="mono" style={{ display: 'block', color: 'var(--muted)', fontSize: 11 }}>{t.startTime}</span>}
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
