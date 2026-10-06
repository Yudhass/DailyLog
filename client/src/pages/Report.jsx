import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame } from '@phosphor-icons/react';
import { api } from '../api/client.js';
import TopBar from '../components/TopBar.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { TaskBadges, TagList } from '../components/TaskMeta.jsx';
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

function downloadBlob(data, filename, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Report() {
  const [preset, setPreset] = useState('thisMonth');
  const [from, setFrom] = useState(rangeOf('thisMonth')[0]);
  const [to, setTo] = useState(rangeOf('thisMonth')[1]);
  const [filter, setFilter] = useState('ALL');
  const [tasks, setTasks] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [shareUrl, setShareUrl] = useState('');
  const [sumStyle, setSumStyle] = useState('ringkas');
  const [summary, setSummary] = useState(null);
  const [sumBusy, setSumBusy] = useState(false);
  const [sumCached, setSumCached] = useState(false);

  useEffect(() => {
    let aktif = true;
    setLoading(true);
    Promise.all([
      api.get('/tasks', { params: { from, to } }),
      api.get('/stats/overview', { params: { from, to } }),
    ])
      .then(([{ data: t }, { data: o }]) => {
        if (!aktif) return;
        setTasks(t);
        setOverview(o);
      })
      .catch(() => aktif && toast.error('Laporan gagal dimuat. Coba muat ulang.'))
      .finally(() => aktif && setLoading(false));
    return () => { aktif = false; };
  }, [from, to, toast]);

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

  const onExportCsv = useCallback(() => {
    const header = 'Tanggal,Judul,Status,Prioritas,Tag,Mulai,Selesai\n';
    const body = tasks
      .map((t) => [keyOfTask(t), `"${t.title.replace(/"/g, '""')}"`, t.status, t.priority || '', `"${(t.tags || '').replace(/"/g, '""')}"`, t.startTime || '', t.endTime || ''].join(','))
      .join('\n');
    downloadBlob(header + body, `laporan-dailylog-${from}-sd-${to}.csv`, 'text/csv;charset=utf-8');
    toast.success('CSV diunduh.');
  }, [tasks, from, to, toast]);

  const onExportPdf = useCallback(async () => {
    try {
      const { data } = await api.get('/export/pdf', { params: { from, to }, responseType: 'blob' });
      downloadBlob(data, `laporan-dailylog-${from}-sd-${to}.pdf`, 'application/pdf');
      toast.success('PDF diunduh.');
    } catch {
      toast.error('Gagal mengunduh PDF.');
    }
  }, [from, to, toast]);

  const onExportExcel = useCallback(async () => {
    try {
      const { data } = await api.get('/export/excel', { params: { from, to }, responseType: 'blob' });
      downloadBlob(data, `laporan-dailylog-${from}-sd-${to}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      toast.success('Excel diunduh.');
    } catch {
      toast.error('Gagal mengunduh Excel.');
    }
  }, [from, to, toast]);

  const onShare = useCallback(async () => {
    try {
      const { data } = await api.post('/share', { scopeType: 'RANGE', dateFrom: from, dateTo: to, expiresInDays: 30 });
      setShareUrl(`${location.origin}/s/${data.token}`);
      toast.success('Link berbagi dibuat.');
    } catch {
      toast.error('Gagal membuat link berbagi.');
    }
  }, [from, to, toast]);

  const onSummary = useCallback(async () => {
    setSumBusy(true);
    try {
      const { data } = await api.post('/summaries', { from, to, style: sumStyle });
      setSummary(data.summary);
      setSumCached(Boolean(data.cached));
      toast.success(data.cached ? 'Ringkasan diambil dari cache.' : 'Ringkasan dibuat.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membuat ringkasan.');
    } finally {
      setSumBusy(false);
    }
  }, [from, to, sumStyle, toast]);

  const onSummaryPdf = useCallback(async () => {
    if (!summary) return;
    try {
      const { data } = await api.get(`/summaries/${summary.id}/pdf`, { responseType: 'blob' });
      downloadBlob(data, `ringkasan-${from}-sd-${to}.pdf`, 'application/pdf');
      toast.success('PDF ringkasan diunduh.');
    } catch {
      toast.error('Gagal mengunduh PDF ringkasan.');
    }
  }, [summary, from, to, toast]);

  return (
    <>
      <TopBar />
      <main className="container page">
        <div className="page-head">
          <div>
            <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '-0.02em' }}>Laporan</h1>
            <p style={{ color: 'var(--muted)' }}>{formatRentang(from, to)}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="pill-btn" onClick={onExportCsv} disabled={!tasks.length}>CSV</button>
            <button className="pill-btn" onClick={onExportPdf} disabled={!tasks.length}>PDF</button>
            <button className="pill-btn" onClick={onExportExcel} disabled={!tasks.length}>Excel</button>
            <button className="btn-primary" onClick={onShare}>Bagikan</button>
          </div>
        </div>

        {shareUrl && (
          <p className="mono" style={{ fontSize: 13 }}>
            Link publik (30 hari): <Link to={shareUrl.replace(location.origin, '')}>{shareUrl}</Link>
          </p>
        )}

        <section className="panel">
          <div className="panel-head">
            <h2 style={{ fontSize: 17 }}>Ringkasan AI</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={sumStyle} onChange={(e) => setSumStyle(e.target.value)} aria-label="Gaya ringkasan">
                <option value="ringkas">Poin singkat</option>
                <option value="formal">Laporan formal</option>
                <option value="refleksi">Refleksi pribadi</option>
              </select>
              <button className="btn-primary" onClick={onSummary} disabled={sumBusy}>
                {sumBusy ? 'Membuat…' : 'Buat ringkasan'}
              </button>
            </div>
          </div>
          {summary ? (
            <>
              <p className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                {summary.rangeStart} s/d {summary.rangeEnd} • {summary.style}{sumCached ? ' • dari cache' : ''}
              </p>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, marginTop: 8 }}>{summary.content}</pre>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="pill-btn" onClick={() => navigator.clipboard?.writeText(summary.content).then(() => toast.success('Ringkasan disalin.')).catch(() => toast.error('Gagal menyalin.'))}>Salin</button>
                <button className="pill-btn" onClick={onSummaryPdf}>Unduh PDF</button>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              Ringkasan disusun murni dari log Anda pada rentang di atas (tanpa karangan). Rentang kosong menampilkan pesan informatif.
            </p>
          )}
        </section>

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

        {loading && (
          <div className="skel-block" aria-label="Memuat laporan">
            <div className="skel" style={{ height: 92 }} />
            <div className="skel" style={{ height: 150 }} />
            <div className="skel" style={{ height: 120 }} />
          </div>
        )}

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
              {overview && (
                <>
                  <div className="stat">
                    <span className="stat-num mono">{overview.hoursTotal}j</span>
                    <span className="stat-label">Waktu tercatat</span>
                  </div>
                  <div className="stat">
                    <span className="stat-num mono"><Flame size={22} weight="fill" style={{ color: 'var(--pri-high)', verticalAlign: '-3px' }} /> {overview.streak}</span>
                    <span className="stat-label">Hari beruntun</span>
                  </div>
                </>
              )}
            </section>

            {overview && (
              <section className="panel">
                <h2 style={{ fontSize: 17, marginBottom: 4 }}>Minggu ini vs minggu lalu</h2>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                  Selesai minggu ini <strong className="mono">{overview.week.thisWeek}</strong>
                  {' '}vs minggu lalu <strong className="mono">{overview.week.lastWeek}</strong>
                  {' '}({overview.week.delta >= 0 ? '+' : ''}{overview.week.delta})
                </p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 12 }}>
                  {[
                    { label: 'Lalu', value: overview.week.lastWeek },
                    { label: 'Ini', value: overview.week.thisWeek },
                  ].map((b) => {
                    const maks = Math.max(1, overview.week.lastWeek, overview.week.thisWeek);
                    return (
                      <div key={b.label} style={{ textAlign: 'center' }}>
                        <div style={{
                          width: 56, height: 90, background: 'var(--line)', borderRadius: 8,
                          display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
                        }}>
                          <div style={{
                            width: '100%', background: 'var(--green)',
                            height: b.value ? `${Math.max(10, (b.value / maks) * 100)}%` : '0%',
                          }} />
                        </div>
                        <div className="mono" style={{ fontWeight: 700 }}>{b.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.label}</div>
                      </div>
                    );
                  })}
                  <div style={{ marginLeft: 8, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>7 hari terakhir</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {overview.last7.map((d) => (
                        <span key={d.date} className="mono" style={{ fontSize: 11, border: '1px solid var(--line)', borderRadius: 8, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          {d.date.slice(5)} • {d.done}✓
                        </span>
                      ))}
                    </div>
                    {overview.topTags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {overview.topTags.map((t) => (
                          <span key={t.tag} className="mono" style={{ fontSize: 12, border: '1px solid var(--line)', borderRadius: 8, padding: '1px 9px' }}>
                            #{t.tag} ×{t.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

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
                            </span>
                            {t.description && <span style={{ color: 'var(--muted)', fontSize: 13 }}>{t.description}</span>}
                            <TaskBadges task={t} />
                            <TagList tags={t.tags} />
                            <span className="task-time mono">
                              {t.startTime ? (t.endTime ? `${t.startTime} - ${t.endTime}` : t.startTime) : 'Seharian'}
                            </span>
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
