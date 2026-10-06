// F4 — Antrean offline (localStorage). Dibuat/diubah/dihapus saat offline
// masuk outbox lalu dikirim batch ke POST /api/sync saat online kembali.

import { api } from '../api/client.js';

const OUTBOX_KEY = 'dailylog_outbox_v1';
const LAST_SYNC_KEY = 'dailylog_last_sync';

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function readOutbox() {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeOutbox(items) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(0, 200)));
  window.dispatchEvent(new CustomEvent('dailylog:outbox', { detail: { pending: items.length } }));
}

export function pendingCount() {
  return readOutbox().length;
}

export function enqueue(change) {
  const items = readOutbox();
  items.push({ ...change, queuedAt: new Date().toISOString(), clientId: `c${Date.now()}${items.length}` });
  writeOutbox(items);
  return items.length;
}

export async function flushOutbox() {
  const items = readOutbox();
  if (!items.length) return { applied: [], conflicts: [] };
  if (!isOnline()) return { applied: [], conflicts: [], offline: true };
  const { data } = await api.post('/sync', {
    since: localStorage.getItem(LAST_SYNC_KEY) || null,
    changes: items,
  });
  // Hapus yang berhasil applied (cocok clientId); sisakan yang konflik/gagal
  const appliedIds = new Set((data.applied || []).map((a) => a.clientId).filter(Boolean));
  const rest = items.filter((it) => !appliedIds.has(it.clientId));
  writeOutbox(rest);
  localStorage.setItem(LAST_SYNC_KEY, data.now || new Date().toISOString());
  return data;
}

// Bungkus mutasi: coba online dulu, gagal jaringan -> antrekan
export async function saveOnlineFirst({ op, id, data }) {
  if (isOnline()) {
    try {
      if (op === 'create') {
        const res = await api.post('/tasks', { ...data, source: 'PWA' });
        return { res, queued: false };
      }
      if (op === 'update') {
        const res = await api.put(`/tasks/${id}`, data);
        return { res, queued: false };
      }
      if (op === 'delete') {
        const res = await api.delete(`/tasks/${id}`);
        return { res, queued: false };
      }
    } catch (err) {
      if (err.response) throw err; // error server (validasi) -> jangan antrekan
    }
  }
  enqueue({ op, id, data });
  return { res: null, queued: true };
}

export function watchOnline(onChange) {
  const h = () => onChange(isOnline());
  window.addEventListener('online', h);
  window.addEventListener('offline', h);
  return () => {
    window.removeEventListener('online', h);
    window.removeEventListener('offline', h);
  };
}
