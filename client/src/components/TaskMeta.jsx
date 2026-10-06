import { Repeat } from '@phosphor-icons/react';
import { PRIORITY, describeRecurrence } from './TaskModal.jsx';
import StatusBadge from './StatusBadge.jsx';

export function PriorityBadge({ priority }) {
  const p = PRIORITY[priority] || PRIORITY.MEDIUM;
  const glyph = priority === 'HIGH' ? '▲' : priority === 'LOW' ? '▽' : '●';
  return (
    <span className={`badge badge-pri-${priority || 'MEDIUM'}`}>
      {glyph} {p.label}
    </span>
  );
}

export function TagList({ tags }) {
  const list = String(tags || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!list.length) return null;
  return (
    <span className="tag-list">
      {list.map((t) => (
        <span key={t} className="tag-chip">#{t}</span>
      ))}
    </span>
  );
}

export function TaskBadges({ task }) {
  return (
    <span className="task-meta">
      <StatusBadge status={task.status} />
      <PriorityBadge priority={task.priority} />
      {task.recurrence && task.recurrence !== 'NONE' && (
        <span className="recur-note" title={`Berulang: ${describeRecurrence(task) || task.recurrence}`}>
          <Repeat size={12} /> {describeRecurrence(task) || 'berulang'}
        </span>
      )}
    </span>
  );
}

const RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function sortByPriority(list) {
  return (list || []).slice().sort((a, b) => {
    const pa = RANK[a.priority] ?? 1;
    const pb = RANK[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return (a.startTime || '99').localeCompare(b.startTime || '99');
  });
}
