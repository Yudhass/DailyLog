import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import TopBar from '../components/TopBar.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import WeekView from '../components/WeekView.jsx';
import DayAgenda from '../components/DayAgenda.jsx';
import TaskModal from '../components/TaskModal.jsx';
import { STATUS, dateKey, formatTanggal, keyOfTask } from '../utils/date.js';

const VIEWS = [
  { id: 'month', label: 'Bulan' },
  { id: 'week', label: 'Minggu' },
  { id: 'day', label: 'Hari' },
];

const FILTERS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'DONE', label: 'Selesai' },
  { id: 'IN_PROGRESS', label: 'Berjalan' },
  { id: 'TODO', label: 'Belum' },
];

export default function Dashboard({ initialView = 'month', todayOnly = false }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [anchor, setAnchor] = useState(() => new Date());
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [view, setView] = useState(initialView);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks', { params: { month: cursor.getMonth() + 1, year: cursor.getFullYear() } });
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    if (!selected) return;
    const selectedMonth = new Date(selected.slice(0, 4), parseInt(selected.slice(5, 7)) - 1, selected.slice(8, 10));
    const month = cursor.getMonth();
    if (selectedMonth.getMonth() !== month) {
      setCursor(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1));
    }
    api.get('/tasks', { params: { month: cursor.getMonth() + 1, year: cursor.getFullYear() } })
      .then(({ data }) => setTasks(data))
      .catch(() => setError('Gagal memuat catatan'))
      .finally(() => setLoading(false));
  }, [selected, cursor]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { load(); }, [selected]);

  // When todayOnly, force cursor to current month and selected to today
  useEffect(() => {
    if (todayOnly) {
      const now = new Date();
      setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
      setSelected(dateKey(now));
    }
  }, [todayOnly, selected]);

  const tasksByDay = useMemo(() => {
    const map = {};
    for (const t of tasks) (map[keyOfTask(t)] ||= []).push(t);
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    const list = filter === 'ALL' ? (tasksByDay[selected] || []) : tasksByDay[selected]?.filter((t) => t.status === filter) || [];
    return list.slice().sort((a, b) => (a.startTime || '99').localeCompare(b.startTime || '99'));
  }, [tasksByDay, selected, filter]);

  function shift(dir) {
    if (view === 'month') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
      const d = new Date(cursor); d.setMonth(d.getMonth() + dir); setAnchor(d);
    } else if (view === 'week') {
      const d = new Date(anchor); d.setDate(d.getDate() + dir * 7); setAnchor(d); setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      const d = new Date(anchor); d.setDate(d.getDate() + dir); setAnchor(d); setSelected(dateKey(d)); setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }

  async function saveTask(payload) {
    setSaveError('');
    try {
      if (modal.task) await api.put(`/tasks/${modal.task.id}`, payload);
      else await api.post('/tasks', payload);
      setModal(null);
      await load();
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Catatan gagal disimpan. Coba lagi.');
    }
  }

  async function deleteTask(id) {
    setSaveError('');
    try {
      await api.delete(`/tasks/${id}`);
      setModal(null);
      await load();
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Catatan gagal dihapus.');
    }
  }

  const heading = view === 'month' ? bulanTahun(cursor) : view === 'week' ? `Pekan ${formatTanggal(anchor).split(',')[1]?.trim() || ''}` : formatTanggal(anchor);

  return (
    <>
      <TopBar />
      <main className="container page">
        <div className="page-head">
          <div className="month-nav">
            <button onClick={() => shift(-1)} aria-label="Sebelumnya" className="arrow-btn">‹</button>
            <h1 className="page-title" style={{ fontSize: 'clamp(20px, 3vw, 30px)', letterSpacing: '-0.02em' }}>{heading}</h1>
            <button onClick={() => shift(1)} aria-label="Berikutnya" className="arrow-btn">›</button>
          </div>
          <div className="seg" role="tablist" aria-label="Tampilan">
            {VIEWS.map((v) => <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)} style={{ flex: 1 }}>{v.label}</button>)}
          </div>
          <div className="seg" role="group" aria-label="Filter">
            {FILTERS.map((f) => <button key={f.id} aria-selected={filter === f.id} onClick={() => setFilter(f.id)} style={{ flex: 1 }}>{f.label}</button>)}
          </div>
        </div>

        {loading && <p className="mono" style={{ color: 'var(--muted)' }}>Memuat…</p>}
        {saveError && <p role="alert" className="notice-error">{saveError}</p>}

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

        {view === 'day' && <DayAgenda dateStr={selected} tasks={selectedTasks} onAdd={() => setModal({ task: null })} onEdit={(t) => setModal({ task: t })} />}
      </main>

      {modal && <TaskModal task={modal.task} defaultDate={selected} onClose={() => setModal(null)} onSave={saveTask} onDelete={deleteTask} />}
    </>
  );
}