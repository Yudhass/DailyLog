import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Sun, PencilSimple, Trash, Plus } from '@phosphor-icons/react';
import { api } from '../api/client.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import TaskModal from '../components/TaskModal.jsx';
import QuickAdd from '../components/QuickAdd.jsx';
import SyncStatus from '../components/SyncStatus.jsx';
import { TaskBadges, TagList, sortByPriority } from '../components/TaskMeta.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dateKey, formatTanggal } from '../utils/date.js';

const FILTERS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'TODO', label: 'Belum' },
  { id: 'IN_PROGRESS', label: 'Berjalan' },
  { id: 'DONE', label: 'Selesai' },
];

const todayKey = () => dateKey(new Date());

function shiftKey(key, dir) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + dir);
  return dateKey(d);
}

function minutesOf(t) {
  if (t.startTime && t.endTime) {
    const [sh, sm] = t.startTime.split(':').map(Number);
    const [eh, em] = t.endTime.split(':').map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff > 0) return diff;
  }
  return Number(t.estimatedMinutes) > 0 ? Number(t.estimatedMinutes) : 0;
}

export default function Today() {
  const [date, setDate] = useState(todayKey);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [modal, setModal] = useState(null);
  const [streak, setStreak] = useState(0);
  const [reminder, setReminder] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const toast = useToast();

  const isToday = date === todayKey();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks', { params: { date } });
      setTasks(data);
    } catch {
      toast.error('Gagal memuat catatan hari ini');
    } finally {
      setLoading(false);
    }
  }, [date, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/stats/streak').then(({ data }) => setStreak(data.streak || 0)).catch(() => {});
    api.get('/reminders/today').then(({ data }) => setReminder(data)).catch(() => {});
  }, []);

  const ringkasan = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const jalan = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const mins = tasks.reduce((a, t) => a + minutesOf(t), 0);
    return {
      total, done, jalan, todo,
      persen: total ? Math.round((done / total) * 100) : 0,
      jam: Math.round((mins / 60) * 10) / 10,
    };
  }, [tasks]);

  const daftar = useMemo(() => {
    const list = filter === 'ALL' ? tasks : tasks.filter((t) => t.status === filter);
    return sortByPriority(list);
  }, [tasks, filter]);

  // Skeleton hanya saat data benar-benar kosong — saat pindah tanggal / kembali
  // ke halaman ini, daftar lama tetap tampil selama muat ulang di latar.
  const firstLoad = loading && tasks.length === 0;

  async function saveTask(payload) {
    try {
      const res = await (modal?.task
        ? api.put(`/tasks/${modal.task.id}`, payload)
        : api.post('/tasks', { ...payload, logDate: date }));
      setModal(null);
      // Tugas berulang mengembalikan array
      toast.success(modal?.task ? 'Catatan diperbarui.' : Array.isArray(res.data) ? 'Catatan berulang dibuat.' : 'Catatan ditambahkan.');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Catatan gagal disimpan. Coba lagi.');
    }
  }

  async function deleteTask(id) {
    try {
      await api.delete(`/tasks/${id}`);
      setModal(null);
      setPendingDelete(null);
      toast.success('Catatan dihapus.');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Catatan gagal dihapus.');
    }
  }

  async function toggleDone(task) {
    try {
      await api.put(`/tasks/${task.id}`, { status: task.status === 'DONE' ? 'TODO' : 'DONE' });
      toast.success(task.status === 'DONE' ? 'Ditandai belum selesai.' : 'Ditandai selesai ✓');
      await load();
    } catch {
      toast.error('Gagal mengubah status.');
    }
  }

  async function bagikanHariIni() {
    try {
      const { data } = await api.post('/share', { scopeType: 'DAY', date });
      setShareUrl(`${location.origin}/s/${data.token}`);
      toast.success('Link berbagi dibuat.');
    } catch {
      toast.error('Gagal membuat link berbagi.');
    }
  }

  return (
    <>
      <main className="container page">
        <div className="page-head">
          <div>
            <p className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>
              {isToday ? 'Fokus hari ini' : 'Arsip harian'}
              {streak > 0 && (
                <span className="page-kicker" style={{ marginLeft: 8 }}>
                  <Flame size={14} weight="fill" style={{ color: 'var(--pri-high)' }} /> {streak} hari beruntun
                </span>
              )}
            </p>
            <h1 className="page-title" style={{ fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '-0.02em' }}>
              {isToday ? 'Hari ini' : formatTanggal(new Date(`${date}T00:00:00`))}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              {formatTanggal(new Date(`${date}T00:00:00`))} • {ringkasan.jam} jam tercatat
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <SyncStatus />
            <button className="pill-btn" onClick={bagikanHariIni}>Bagikan</button>
            <QuickAdd defaultDate={date} onSaved={() => load()} />
            <button className="btn-primary" onClick={() => setModal({ task: null })}>
              + Catatan hari ini
            </button>
          </div>
        </div>

        {shareUrl && (
          <p className="mono" style={{ fontSize: 13 }}>
            Link publik: <Link to={shareUrl.replace(location.origin, '')}>{shareUrl}</Link>
          </p>
        )}

        {isToday && reminder && (reminder.overdueCount > 0 || reminder.todoTodayCount > 0) && (
          <section className="panel" style={{ borderLeft: '3px solid var(--amber)' }}>
            <strong>Pengingat</strong>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: '4px 0 0' }}>
              {reminder.overdueCount > 0 && `${reminder.overdueCount} tugas tertunda belum selesai. `}
              {reminder.todoTodayCount > 0 && `${reminder.todoTodayCount} tugas hari ini menunggu.`}
            </p>
          </section>
        )}

        <div className="month-nav" style={{ marginBottom: 16 }}>
          <button onClick={() => setDate((d) => shiftKey(d, -1))} aria-label="Hari sebelumnya" className="arrow-btn">‹</button>
          <input
            type="date"
            value={date}
            max="9999-12-31"
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Pilih tanggal"
          />
          <button onClick={() => setDate((d) => shiftKey(d, 1))} aria-label="Hari berikutnya" className="arrow-btn">›</button>
          {!isToday && (
            <button className="pill-btn" onClick={() => setDate(todayKey())}>
              Kembali ke hari ini
            </button>
          )}
        </div>

        <section className="stat-strip">
          <div className="stat">
            <span className="stat-num mono">{ringkasan.total}</span>
            <span className="stat-label">Total hari ini</span>
          </div>
          <div className="stat">
            <span className="stat-num mono" style={{ color: 'var(--green)' }}>{ringkasan.done}</span>
            <span className="stat-label">Selesai</span>
          </div>
          <div className="stat">
            <span className="stat-num mono" style={{ color: 'var(--amber)' }}>{ringkasan.jalan}</span>
            <span className="stat-label">Berjalan</span>
          </div>
          <div className="stat">
            <span className="stat-num mono" style={{ color: 'var(--stone)' }}>{ringkasan.todo}</span>
            <span className="stat-label">Belum</span>
          </div>
          <div className="stat">
            <span className="stat-num mono">{ringkasan.persen}%</span>
            <span className="stat-label">Progres</span>
          </div>
          <div className="stat">
            <span className="stat-num mono">{ringkasan.jam}j</span>
            <span className="stat-label">Waktu</span>
          </div>
        </section>

        <div className="seg" role="group" aria-label="Filter status" style={{ marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <button key={f.id} aria-selected={filter === f.id} onClick={() => setFilter(f.id)} style={{ flex: 1 }}>
              {f.label}
            </button>
          ))}
        </div>

        {firstLoad ? (
          <div className="skel-block" aria-label="Memuat catatan">
            <div className="skel" style={{ height: 18, width: '40%' }} />
            <div className="skel" style={{ height: 74 }} />
            <div className="skel" style={{ height: 74 }} />
            <div className="skel" style={{ height: 74 }} />
          </div>
        ) : (
          <section className="panel">
            <div className="panel-head">
              <h2 style={{ fontSize: 17 }}>Agenda {isToday ? 'hari ini' : 'tanggal ini'}</h2>
              <span className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>
                {daftar.length} catatan
              </span>
            </div>
            {daftar.length === 0 ? (
              <p className="empty">
                <span className="empty-ico"><Sun size={18} /></span>
                {tasks.length
                  ? 'Tidak ada catatan dengan status ini.'
                  : 'Belum ada catatan. Mulai hari dengan tombol "+ Catatan hari ini".'}
              </p>
            ) : (
              <ul className="task-list">
                {daftar.map((t) => (
                  <li key={t.id}>
                    <div className="task-card" style={{ cursor: 'default' }}>
                      <span className="task-row">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={t.status === 'DONE'}
                            onChange={() => toggleDone(t)}
                            aria-label={`Tandai selesai: ${t.title}`}
                          />
                          <strong style={{
                            fontSize: 15,
                            textDecoration: t.status === 'DONE' ? 'line-through' : 'none',
                            color: t.status === 'DONE' ? 'var(--muted)' : 'inherit',
                          }}>
                            {t.title}
                          </strong>
                        </label>
                      </span>
                      {t.description && <span style={{ color: 'var(--muted)', fontSize: 13 }}>{t.description}</span>}
                      <TaskBadges task={t} />
                      <TagList tags={t.tags} />
                      <span style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                        <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setModal({ task: t })} aria-label={`Edit ${t.title}`} title="Edit">
                          <PencilSimple size={16} />
                        </button>
                        <button className="icon-btn danger" style={{ width: 34, height: 34 }} onClick={() => setPendingDelete(t)} aria-label={`Hapus ${t.title}`} title="Hapus">
                          <Trash size={16} />
                        </button>
                      </span>
                      <span className="task-time mono">
                        {t.startTime ? (t.endTime ? `${t.startTime} - ${t.endTime}` : t.startTime) : 'Seharian'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {modal && (
        <TaskModal
          task={modal.task}
          defaultDate={date}
          onClose={() => setModal(null)}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}

      <button className="fab" onClick={() => setModal({ task: null })} aria-label="Tambah catatan">
        <Plus size={24} weight="bold" />
      </button>

      {pendingDelete && (
        <ConfirmDialog
          title="Hapus catatan?"
          message={`"${pendingDelete.title}" akan dihapus permanen dan tidak bisa dikembalikan.`}
          confirmLabel="Hapus"
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteTask(pendingDelete.id)}
        />
      )}
    </>
  );
}
