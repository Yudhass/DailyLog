import crypto from 'node:crypto';
import { taskMinutes, parseTags } from './db.js';

// F2 — Ringkasan deterministik dari data log (tidak mengarang fakta).
// LLM sengaja tidak dipakai agar output 100% bersumber dari log.

export function hashTasks(tasks) {
  const h = crypto.createHash('sha1');
  for (const t of tasks) h.update(`${t.id}|${t.status}|${t.updatedAt || ''};`);
  return h.digest('hex');
}

export function buildSummary({ tasks, from, to, style, ownerName }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'DONE');
  const pending = tasks.filter((t) => t.status !== 'DONE');
  const mins = tasks.reduce((a, t) => a + taskMinutes(t), 0);
  const hours = Math.round((mins / 60) * 10) / 10;
  const tagCount = {};
  for (const t of tasks) for (const tag of parseTags(t.tags)) tagCount[tag] = (tagCount[tag] || 0) + 1;
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const persen = total ? Math.round((done.length / total) * 100) : 0;

  const ach = done.slice(0, 8).map((t) => `- ${t.title}`).join('\n') || '- (belum ada)';
  const pend = pending.slice(0, 8).map((t) => `- [${t.status}] ${t.title}`).join('\n') || '- (tidak ada)';
  const tagLine = topTags.length ? topTags.map(([t, c]) => `#${t} ×${c}`).join(', ') : '-';
  const statLine = `Total ${total} catatan • Selesai ${done.length} (${persen}%) • Waktu ${hours} jam`;

  if (style === 'formal') {
    return [
      `LAPORAN AKTIVITAS${ownerName ? ` — ${ownerName}` : ''}`,
      `Periode: ${from} s/d ${to}`,
      '',
      `Pada periode tersebut tercatat ${total} aktivitas dengan tingkat penyelesaian ${persen}% (${done.length} selesai) dan total waktu tercatat ${hours} jam.`,
      '',
      'Pencapaian utama:',
      ach,
      '',
      'Tugas tertunda / berjalan:',
      pend,
      '',
      `Distribusi tag: ${tagLine}`,
      `Statistik: ${statLine}`,
    ].join('\n');
  }
  if (style === 'refleksi') {
    return [
      `Refleksi ${from} s/d ${to}`,
      '',
      total
        ? `Saya mencatat ${total} hal dengan ${done.length} di antaranya selesai (${persen}%). Total waktu yang tercatat ${hours} jam.`
        : 'Periode ini belum ada catatan. Mungkin saya perlu mulai mencatat hal kecil setiap hari.',
      '',
      'Yang berhasil diselesaikan:',
      ach,
      '',
      'Yang masih menggantung:',
      pend,
      '',
      `Tag paling sering: ${tagLine}`,
    ].join('\n');
  }
  // ringkas
  return [
    `Ringkasan ${from}–${to}: ${statLine}`,
    '',
    'Selesai:',
    ach,
    '',
    'Tertunda:',
    pend,
    '',
    `Tag: ${tagLine}`,
  ].join('\n');
}
