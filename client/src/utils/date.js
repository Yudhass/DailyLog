export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function keyOfTask(task) {
  return dateKey(new Date(task.logDate));
}

export function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Senin = 0
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function weekDays(anchor) {
  const offset = (anchor.getDay() + 6) % 7;
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export const STATUS = {
  TODO: { label: 'Akan dilakukan', color: 'var(--stone)', bg: 'var(--stone-soft)' },
  IN_PROGRESS: { label: 'Sedang berjalan', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  DONE: { label: 'Selesai', color: 'var(--green)', bg: 'var(--green-soft)' },
};

export function formatTanggal(d) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function bulanTahun(d) {
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
}

export function tanggalPendek(d) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(d);
}

export function awalBulan(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function akhirBulan(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function tambahBulan(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function jumlahHari(from, to) {
  return Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1);
}

export function formatRentang(from, to) {
  return `${tanggalPendek(new Date(`${from}T00:00:00`))} - ${tanggalPendek(new Date(`${to}T00:00:00`))}`;
}
