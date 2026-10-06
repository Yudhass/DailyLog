import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { formatTanggal } from '../utils/date.js';
import { TaskBadges, TagList } from '../components/TaskMeta.jsx';

export default function SharedView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`/api/public/share/${token}`)
      .then(({ data }) => setData(data))
      .catch((e) => setError(e.response?.data?.error || 'Link tidak dapat dibuka.'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="container page">
      <div className="page-head">
        <Link to="/" className="brand">DailyLog<span style={{ color: 'var(--green)' }}>.</span></Link>
      </div>
      {loading && (
        <div className="skel-block" aria-label="Memuat">
          <div className="skel" style={{ height: 18, width: '45%' }} />
          <div className="skel" style={{ height: 74 }} />
          <div className="skel" style={{ height: 74 }} />
        </div>
      )}
      {error && <p role="alert" className="notice-error">{error}</p>}
      {data && (
        <>
          <h1 className="page-title" style={{ fontSize: 'clamp(20px, 3vw, 28px)' }}>
            Logbook {data.owner}
          </h1>
          <p style={{ color: 'var(--muted)' }}>
            {data.dateFrom === data.dateTo
              ? formatTanggal(new Date(`${data.dateFrom}T00:00:00`))
              : `${data.dateFrom} s/d ${data.dateTo}`}
            {' '}• {data.tasks.length} catatan (hanya baca)
          </p>
          <ul className="task-list" style={{ marginTop: 16 }}>
            {data.tasks.map((t, i) => (
              <li key={i}>
                <div className="task-card" style={{ cursor: 'default' }}>
                  <span className="task-row">
                    <strong style={{ fontSize: 15 }}>{t.title}</strong>
                    <span className="mono" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {t.startTime ? (t.endTime ? `${t.startTime} - ${t.endTime}` : t.startTime) : 'Seharian'}
                    </span>
                  </span>
                  {t.description && <span style={{ color: 'var(--muted)', fontSize: 13 }}>{t.description}</span>}
                  <TaskBadges task={t} />
                  <TagList tags={t.tags} />
                </div>
              </li>
            ))}
          </ul>
          {data.tasks.length === 0 && <p className="empty">Tidak ada catatan pada rentang ini.</p>}
        </>
      )}
    </main>
  );
}
