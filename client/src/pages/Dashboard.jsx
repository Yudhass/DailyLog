import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { api } from '../api/client.js';
import MonthCalendar from '../components/MonthCalendar.jsx';
import WeekView from '../components/WeekView.jsx';
import DayAgenda from '../components/DayAgenda.jsx';
import TaskModal from '../components/TaskModal.jsx';
import QuickAdd from '../components/QuickAdd.jsx';
import SyncStatus from '../components/SyncStatus.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { bulanTahun, dateKey, formatTanggal, keyOfTask } from '../utils/date.js';
import { sortByPriority } from '../components/TaskMeta.jsx';

const VIEWS = [
  { id: 'month', label: 'Bulan' },
  { id: 'week', label: 'Minggu' },
];

const FILTERS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'DONE', label: 'Selesai' },
  { id: 'IN_PROGRESS', label: 'Berjalan' },
  { id: 'TODO', label: 'Belum' },
];

export default function Dashboard() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [anchor, setAnchor] = useState(() => new Date());
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [view, setView] = useState('month');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks', { params: { month: cursor.getMonth() + 1, year: cursor.getFullYear() } });
      setTasks(data);
    } catch {
      toast.error('Gagal memuat catatan');
    } finally {
      setLoading(false);
    }
  }, [cursor, toast]);

  useEffect(() => {
    if (!selected) return;
    const y = parseInt(selected.slice(0, 4), 10);
    const m = parseInt(selected.slice(5, 7), 10) - 1;
    if (m !== cursor.getMonth() || y !== cursor.getFullYear()) {
      setCursor(new Date(y, m, 1));
    }
  }, [selected, cursor]);

  useEffect(() => { load(); }, [load]);

  const tasksByDay = useMemo(() => {
    const map = {};
    for (const t of tasks) (map[keyOfTask(t)] ||= []).push(t);
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    const list = filter === 'ALL' ? (tasksByDay[selected] || []) : tasksByDay[selected]?.filter((t) => t.status === filter) || [];
    return sortByPriority(list);
  }, [tasksByDay, selected, filter]);

  function shift(dir) {
    if (view === 'month') {
      // Pindahkan selected & anchor ikut ke bulan baru agar effect sinkron
      // tidak mengembalikan cursor ke bulan lama.
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
      setCursor(next);
      setAnchor(next);
      setSelected(dateKey(next));
    } else {
      const d = new Date(anchor);
      d.setDate(d.getDate() + dir * 7);
      setAnchor(d);
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
      setSelected(dateKey(d));
    }
  }

  async function saveTask(payload) {
    try {
      if (modal.task) {
        await api.put(`/tasks/${modal.task.id}`, payload);
        toast.success('Catatan diperbarui.');
      } else {
        await api.post('/tasks', payload);
        toast.success('Catatan ditambahkan.');
      }
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Catatan gagal disimpan. Coba lagi.');
    }
  }

  async function deleteTask(id) {
    try {
      await api.delete(`/tasks/${id}`);
      setModal(null);
      toast.success('Catatan dihapus.');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Catatan gagal dihapus.');
    }
  }

  const heading = view === 'month' ? bulanTahun(cursor) : `Pekan ${formatTanggal(anchor).split(',')[1]?.trim() || ''}`;

  // Skeleton hanya saat belum ada data sama sekali — kalender lama tetap tampil
  // selama bulan baru dimuat di latar (layout bawah selalu dirender).
  const firstLoad = loading && tasks.length === 0;

  return (
    <>
      <main className="container page">
        <div className="page-head">
          <div>
            <p className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>Ringkasan kalender</p>
            <div className="month-nav">
              <button onClick={() => shift(-1)} aria-label="Sebelumnya" className="arrow-btn">‹</button>
              <h1 className="page-title" style={{ fontSize: 'clamp(20px, 3vw, 30px)', letterSpacing: '-0.02em' }}>{heading}</h1>
              <button onClick={() => shift(1)} aria-label="Berikutnya" className="arrow-btn">›</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <SyncStatus />
            <QuickAdd defaultDate={selected} onSaved={() => load()} />
            <button className="btn-primary" onClick={() => setModal({ task: null })}>
              + Catatan
            </button>
          </div>
        </div>

        <div className="page-head" style={{ marginTop: -8 }}>
          <div className="seg" role="tablist" aria-label="Tampilan kalender">
            {VIEWS.map((v) => <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)} style={{ flex: 1 }}>{v.label}</button>)}
          </div>
          <div className="seg" role="group" aria-label="Filter">
            {FILTERS.map((f) => <button key={f.id} aria-selected={filter === f.id} onClick={() => setFilter(f.id)} style={{ flex: 1 }}>{f.label}</button>)}
          </div>
        </div>

        {firstLoad && (
          <div className="layout" aria-label="Memuat kalender">
            <div className="layout-cal skel-cal">
              {Array.from({ length: 14 }).map((_, i) => <div key={i} className="skel" />)}
            </div>
            <div className="layout-side skel-block">
              <div className="skel" style={{ height: 18, width: '55%' }} />
              <div className="skel" style={{ height: 74 }} />
              <div className="skel" style={{ height: 74 }} />
            </div>
          </div>
        )}
        {view === 'month' && (
          <div className="layout">
            <div className="layout-cal">
              <MonthCalendar cursor={cursor} tasksByDay={tasksByDay} selected={selected} onSelect={setSelected} />
            </div>
            <div className="layout-side">
              <DayAgenda dateStr={selected} tasks={selectedTasks} onAdd={() => setModal({ task: null })} onEdit={(t) => setModal({ task: t })} />
            </div>
          </div>
        )}

        {view === 'week' && <WeekView anchor={anchor} tasksByDay={tasksByDay} selected={selected} onSelect={setSelected} onEdit={(t) => setModal({ task: t })} />}
      </main>

      {modal && <TaskModal task={modal.task} defaultDate={selected} onClose={() => setModal(null)} onSave={saveTask} onDelete={deleteTask} />}

      <button className="fab" onClick={() => setModal({ task: null })} aria-label="Tambah catatan">
        <Plus size={24} weight="bold" />
      </button>
    </>
  );
}
