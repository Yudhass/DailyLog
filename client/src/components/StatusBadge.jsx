import { STATUS } from '../utils/date.js';

export default function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.TODO;
  return (
    <span
      className="badge"
      style={{
        background: s.bg,
        color: s.color,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {s.label}
    </span>
  );
}
