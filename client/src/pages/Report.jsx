import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import TopBar from '../components/TopBar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  akhirBulan, awalBulan, dateKey, formatRentang, formatTanggal,
  jumlahHari, keyOfTask, tambahBulan,
} from '../utils/date.js';

const PRESETS = [
  { id: 'thisMonth', label: 'Bulan ini' },
  { id: 'lastMonth', label: 'Bulan lalu' },
  { id: 'last7', label: '7 hari' },
  { id: 'last30', label: '30 hari' },
];

const FILTERS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'DONE', label: 'Selesai' },
  { id: 'IN_PROGRESS', label: 'Berjalan' },
  { id: 'TODO', label: 'Belum' },
];

function rangeOf(preset) {
  const now = new Date();
  if (preset === 'lastMonth') {
    const start = tambahBulan(awalBulan(now), -1);
    return [dateKey(start), dateKey(akhirBulan(start))];
  }
  if (preset === 'last7' || preset === 'last30') {
    const days = preset === 'last7' ? 6 : 29;
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    return [dateKey(start), dateKey(now)];
  }
  return [dateKey(awalBulan(now)), dateKey(akhirBulan(now))];
}

export default function Report() {
  const [preset, setPreset] = useState('thisMonth');
  const [from, setFrom] = useState(rangeOf('thisMonth')[0]);
  const [to, setTo] = useState(rangeOf('thisMonth')[1]);
  const [filter, setFilter] = useState('ALL');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let aktif = true;
    setLoading(true);
    setError('');
    api
      .get('/tasks', { params: { from, to } })
      .then(({ data }) => aktif && setTasks(data))
      .catch(() => aktif && setError('Laporan gagal dimuat. Coba muat ulang.'))
      .finally(() => aktif && setLoading(false));
    return () => { aktif = false; };
  }, [from, to]);

  function applyPreset(id) {
    setPreset(id);
    const [a, b] = rangeOf(id);
    setFrom(a);
    setTo(b);
  }

  const ringkasan = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const jalan = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    return { total, done, jalan, todo, persen: total ? Math.round((done / total) * 100) : 0 };
  }, [tasks]);

  const perHari = useMemo(() => {
    const map = {};
    for (const t of tasks) (map[keyOfTask(t)] ||= []).push(t);
    return Object.keys(map).sort();
  }, [tasks]);

  const harian = useMemo(() => {
    const total = jumlahHari(from, to);
    const map = {};
    tasks.forEach((t) => { map[keyOfTask(t)] = (map[keyOfTask(t)] || 0) + 1; });
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(`${from}T00:00:00`);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      return { key, date: d, count: map[key] || 0 };
    });
  }, [from, to, tasks]);

  const maksHarian = useMemo(() => Math.max(1, ...harian.map((h) => h.count)), [harian]);

  const puncak = useMemo(() => {
    let best = null;
    for (const h of harian) if (!best || h.count > best.count) best = h;
    return best && best.count > 0 ? best : null;
  }, [harian]);

  const daftar = useMemo(() => {
    const list = filter === 'ALL' ? tasks : tasks.filter((t) => t.status === filter);
    const byDate = {};
    for (const t of list) (byDate[keyOfTask(t)] ||= []).push(t);
    return Object.entries(byDate).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [tasks, filter]);

  const onExport = useCallback(() => {
    const header = 'Tanggal,Judul,Status,Mulai,Selesai\n';
    const body = tasks
      .map((t) => [keyOfTask(t), `"${t.title.replace(/"/g, '""')}"`, t.status, t.startTime || '', t.endTime || ''].join(','))
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-dailylog-${from}-sd-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tasks, from, to]);

  return (
    <>
      <TopBar />
      <main className="container page">
        <div className="page-head">
          <div>
            <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '-0.02em' }}>Laporan</h1>
            <p style={{ color: 'var(--muted)' }}>{formatRentang(from, to)}</p>
          </div>
          <button className="btn-primary" onClick={onExport} disabled={!tasks.length}>
            Unduh CSV
          </button>
        </div>

        <section className="panel">
          <div className="report-controls">
            <div className="seg" role="group" aria-label="Rentang cepat">
              {PRESETS.map((p) => (
                <button key={p.id} aria-selected={preset === p.id} onClick={() => applyPreset(p.id)} style={{ flex: 1 }}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="date-range">
              <label className="field">
                <span>Dari</span>
                <input type="date" value={from} max={to} onChange={(e) => { setPreset('custom'); setFrom(e.target.value); }} />
              </label>
              <label className="field">
                <span>Sampai</span>
                <input type="date" value={to} min={from} onChange={(e) => { setPreset('custom'); setTo(e.target.value); }} />
              </label>
            </div>
          </div>
        </section>

        {error && <p role="alert" className="notice-error">{error}</p>}
        {loading && <p className="mono" style={{ color: 'var(--muted)' }}>Memuat…</p>}

        {!loading && (
          <>
            <section className="stat-strip">
              <div className="stat">
                <span className="stat-num mono">{ringkasan.total}</span>
                <span className="stat-label">Total catatan</span>
              </div>
              <div className="stat">
                <span className="stat-num mono" style={{ color: 'var(--green)' }}>{ringkasan.done}</span>
                <span className="stat-label">Selesai</span>
              </div>
              <div className="stat">
                <span className="stat-num mono" style={{ color: 'var(--amber)' }}>{ringkasan.jalan}</span>
                <span className="stat-label">Sedang berjalan</span>
              </div>
              <div className="stat">
                <span className="stat-num mono" style={{ color: 'var(--stone)' }}>{ringkasan.todo}</span>
                <span className="stat-label">Belum dimulai</span>
              </div>
              <div className="stat">
                <span className="stat-num mono">{ringkasan.persen}%</span>
                <span className="stat-label">Tingkat selesai</span>
              </div>
            </section>

            <section className="panel">
              <h2 style={{ fontSize: 17, marginBottom: 4 }}>Catatan per hari</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                {perHari.length
                  ? `Aktif pada ${perHari.length} hari${puncak ? `, terbanyak pada ${formatTanggal(puncak.date)}` : ''}`
                  : 'Belum ada catatan pada rentang ini.'}
              </p>
              <div className="bars" role="img" aria-label="Grafik catatan per hari">
                {harian.map((h) => (
                  <div key={h.key} className="bar-col" title={`${h.key}: ${h.count} catatan`}>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ height: h.count ? `${Math.max(12, (h.count / maksHarian) * 100)}%` : '0%' }}
                      />
                    </div>
                    <span className="bar-label mono">{h.date.getDate()}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2 style={{ fontSize: 17 }}>Rincian catatan</h2>
                <div className="seg" role="group" aria-label="Saring status">
                  {FILTERS.map((f) => (
                    <button key={f.id} aria-selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
                  ))}
                </div>
              </div>

              {daftar.length === 0 ? (
                <p className="empty" style={{ marginTop: 16 }}>
                  {tasks.length ? 'Tidak ada catatan dengan status ini.' : 'Belum ada catatan pada rentang ini. Ubah rentang tanggal atau tambahkan catatan baru.'}
                </p>
              ) : (
                daftar.map(([key, list]) => (
                  <div key={key} className="report-day">
                    <h3 className="report-date">{formatTanggal(new Date(`${key}T00:00:00`))}</h3>
                    <ul className="task-list" style={{ marginTop: 10 }}>
                      {list.map((t) => (
                        <li key={t.id}>
                          <div className="task-card" style={{ cursor: 'default' }}>
                            <span className="task-row">
                              <strong style={{ fontSize: 15 }}>{t.title}</strong>
                              <span className="mono" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                                {t.startTime ? (t.endTime ? `${t.startTime} - ${t.endTime}` : t.startTime) : 'Seharian'}
                              </span>
                            </span>
                            {t.description && <span style={{ color: 'var(--muted)', fontSize: 13 }}>{t.description}</span>}
                            <StatusBadge status={t.status} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}