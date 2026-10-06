// F1 — Parser bahasa natural (heuristik, tanpa LLM).
// Mendukung Indonesia + Inggris. LLM opsional dipakai di route bila dikonfigurasi.

const HARI_ID = {
  minggu: 0, ahad: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6,
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
};

const BULAN = {
  januari: 1, january: 1, jan: 1,
  februari: 2, february: 2, feb: 2,
  maret: 3, march: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, june: 6, jun: 6,
  juli: 7, july: 7, jul: 7,
  agustus: 8, august: 8, agu: 8, aug: 8,
  september: 9, sept: 9, sep: 9,
  oktober: 10, october: 10, okt: 10, oct: 10,
  november: 11, nov: 11,
  desember: 12, december: 12, des: 12, dec: 12,
};

function keyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDays(base, n) {
  const d = new Date(base);
  d.setDate(base.getDate() + n);
  return d;
}

function nextWeekday(base, target, depan) {
  const d = new Date(base);
  let diff = (target - base.getDay() + 7) % 7;
  if (diff === 0) diff = 7; // hari yang sama = minggu berikutnya
  if (depan) diff += 7;
  d.setDate(base.getDate() + diff);
  return d;
}

function normHour(h, minute, meridiem) {
  let hh = h;
  if (meridiem) {
    const m = meridiem.toLowerCase();
    if (/(malam|malem|evening|night|pm)/.test(m) && hh < 12) hh += 12;
    else if (/(sore|afternoon)/.test(m) && hh < 12) hh += 12;
    else if (/(pagi|morning|am)/.test(m) && hh === 12) hh = 0;
    else if (/(siang|midday)/.test(m) && hh < 11) hh += 12;
  }
  if (hh > 23) hh = 23;
  return `${String(hh).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function extractTime(text) {
  const used = [];
  let startTime = null;
  let endTime = null;

  // Rentang "09.00-11.00" / "9:00 - 11:30" / "jam 3-5 sore"
  let m = text.match(/(\d{1,2})[.:](\d{2})\s*(?:-|–|—|s\/d|sd|sampai|to)\s*(\d{1,2})[.:](\d{2})/i);
  if (m) {
    startTime = normHour(Number(m[1]), Number(m[2]));
    endTime = normHour(Number(m[3]), Number(m[4]));
    used.push(m[0]);
    return { startTime, endTime, used };
  }
  m = text.match(/(?:jam|pukul|at)\s+(\d{1,2})(?:[.:](\d{2}))?\s*(?:-|–|—|s\/d|sd|sampai|to)\s*(\d{1,2})(?:[.:](\d{2}))?\s*(pagi|siang|sore|malam|morning|afternoon|evening|night|am|pm)?/i);
  if (m) {
    startTime = normHour(Number(m[1]), Number(m[2] || 0), m[4]);
    endTime = normHour(Number(m[3]), Number(m[4] || 0), m[5]);
    used.push(m[0]);
    return { startTime, endTime, used };
  }
  // Waktu tunggal "jam 3 sore" / "pukul 09.30" / "at 5pm"
  m = text.match(/(?:jam|pukul|at)\s+(\d{1,2})(?:[.:](\d{2}))?\s*(pagi|siang|sore|malam|morning|afternoon|evening|night|am|pm)?/i);
  if (m) {
    startTime = normHour(Number(m[1]), Number(m[2] || 0), m[3]);
    used.push(m[0]);
    return { startTime, endTime, used };
  }
  // "15.30" berdiri sendiri (bukan bagian tanggal)
  m = text.match(/(?<!\d)(\d{1,2})[.:](\d{2})(?!\d)/);
  if (m && Number(m[1]) <= 23 && Number(m[2]) <= 59) {
    startTime = normHour(Number(m[1]), Number(m[2]));
    used.push(m[0]);
  }
  return { startTime, endTime, used };
}

function extractDate(text, now) {
  const low = ` ${text.toLowerCase()} `;
  const used = [];
  let date = null;

  const rel = [
    [/hari\s+ini|today/, 0],
    [/besok|tomorrow/, 1],
    [/lusa|day\s+after\s+tomorrow/, 2],
    [/kemarin|yesterday/, -1],
  ];
  for (const [re, off] of rel) {
    const m = text.match(re);
    if (m) {
      date = shiftDays(now, off);
      used.push(m[0]);
      break;
    }
  }
  if (!date) {
    // "senin depan" / "jumat" / "friday"
    const m = text.match(/(senin|selasa|rabu|kamis|jumat|sabtu|minggu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(\s+depan|\s+next)?/i);
    if (m) {
      const target = HARI_ID[m[1].toLowerCase()];
      date = nextWeekday(now, target, Boolean((m[2] || '').trim()));
      used.push(m[0]);
    }
  }
  if (!date) {
    // "tgl 15" / "tanggal 20" (bulan berjalan atau depan bila lewat)
    const m = text.match(/(?:tgl|tanggal|date)\s+(\d{1,2})/i);
    if (m) {
      const day = Number(m[1]);
      date = new Date(now.getFullYear(), now.getMonth(), day);
      if (date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        date = new Date(now.getFullYear(), now.getMonth() + 1, day);
      }
      used.push(m[0]);
    }
  }
  if (!date) {
    // "15 oktober" / "15 okt 2026"
    const m = text.match(/(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|agu|aug|sep|sept|okt|oct|nov|des|dec)(\s+\d{4})?/i);
    if (m) {
      const day = Number(m[1]);
      const mon = BULAN[m[2].toLowerCase()];
      const year = m[3] ? Number(m[3].trim()) : now.getFullYear();
      date = new Date(year, mon - 1, day);
      used.push(m[0]);
    }
  }
  if (!date) {
    // ISO "2026-10-15" / "15/10/2026"
    const m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
      date = m[1]
        ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        : new Date(Number(m[6]), Number(m[5]) - 1, Number(m[4]));
      used.push(m[0]);
    }
  }
  return { date: date || new Date(now), used, explicit: date !== null, _low: low };
}

export function parseNatural(rawText, now = new Date()) {
  const text = String(rawText || '').trim();
  const tags = [];
  const tagRe = /#([\p{L}\p{N}_-]+)/gu;
  let tm;
  while ((tm = tagRe.exec(text))) tags.push(tm[1].slice(0, 32));

  const { date, used: dateUsed } = extractDate(text, now);
  const { startTime, endTime, used: timeUsed } = extractTime(text);
  const used = [...dateUsed, ...timeUsed];

  const low = text.toLowerCase();
  let priority = 'MEDIUM';
  const priUsed = [];
  let m = low.match(/(prioritas\s+tinggi|penting|mendesak|urgent|darurat|\bp1\b|high\s+priority)/);
  if (m) { priority = 'HIGH'; priUsed.push(m[0]); }
  else if ((m = low.match(/(prioritas\s+rendah|santai|nanti\s+(saja|dulu)|tidak\s+penting|\bp3\b|low\s+priority)/))) {
    priority = 'LOW'; priUsed.push(m[0]);
  }
  used.push(...priUsed);

  let status = 'TODO';
  const stUsed = [];
  if ((m = low.match(/(sudah\s+selesai|selesai|done|beres|✅|completed)/))) { status = 'DONE'; stUsed.push(m[0]); }
  else if ((m = low.match(/(sedang|lagi|tengah)\s+(dikerjakan|berjalan|dikerjain)|in\s+progress|on\s+progress|ongoing/))) {
    status = 'IN_PROGRESS'; stUsed.push(m[0]);
  }
  used.push(...stUsed);

  let estimatedMinutes = null;
  if ((m = low.match(/selama\s+(\d+)\s*(jam|j|menit|mnt|m\b|hour|minute)/))) {
    const n = Number(m[1]);
    estimatedMinutes = /jam|j\b|hour/.test(m[2]) ? n * 60 : n;
    used.push(m[0]);
  }

  // Judul = sisa teks setelah fragmen dikenali dibuang
  let title = text;
  for (const frag of used) title = title.replace(frag, ' ');
  title = title.replace(/#[\p{L}\p{N}_-]+/gu, ' ').replace(/\b(jam|pukul|at)\b/gi, ' ').replace(/\s{2,}/g, ' ').replace(/^[,\-–—:;.]+|[,\-–—:;.]+$/g, '').trim();
  if (!title) title = text.slice(0, 140);

  return {
    title,
    logDate: keyOf(date),
    startTime,
    endTime,
    priority,
    status,
    tags: tags.filter((v, i, a) => a.indexOf(v) === i).slice(0, 10),
    estimatedMinutes,
  };
}
