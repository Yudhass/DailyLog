import { useEffect, useState } from 'react';
import { flushOutbox, isOnline, pendingCount, watchOnline } from '../offline/queue.js';

// F4 — Indikator status sinkronisasi offline.
export default function SyncStatus() {
  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(pendingCount());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const unwatch = watchOnline(setOnline);
    const onOutbox = (e) => setPending(e.detail?.pending ?? pendingCount());
    window.addEventListener('dailylog:outbox', onOutbox);
    // Sinkron otomatis saat kembali online
    const onBack = async () => {
      if (isOnline() && pendingCount() > 0) {
        try {
          await flushOutbox();
          setPending(pendingCount());
        } catch { /* tetap antre */ }
      }
    };
    window.addEventListener('online', onBack);
    return () => {
      unwatch();
      window.removeEventListener('dailylog:outbox', onOutbox);
      window.removeEventListener('online', onBack);
    };
  }, []);

  async function syncNow() {
    setBusy(true);
    setMsg('');
    try {
      const r = await flushOutbox();
      setPending(pendingCount());
      setMsg(r.conflicts?.length ? `${r.conflicts.length} konflik (server lebih baru, ditahan)` : 'Tersinkron ✓');
      window.location.reload();
    } catch {
      setMsg('Masih offline, tetap tersimpan lokal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="mono" style={{ fontSize: 12, color: online ? 'var(--muted)' : 'var(--amber)', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span title={online ? 'Online' : 'Offline'}>{online ? '●' : '○'} {online ? 'Online' : 'Offline'}</span>
      {pending > 0 && (
        <button className="pill-btn" onClick={syncNow} disabled={busy} title="Kirim antrean offline">
          {busy ? '…' : `Menunggu ${pending} — sinkronkan`}
        </button>
      )}
      {pending === 0 && online && <span>Tersinkron</span>}
      {msg && <span>{msg}</span>}
    </span>
  );
}
