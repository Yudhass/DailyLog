import { Router } from 'express';
import { parseNatural } from '../nlp.js';
import { VALID_PRIORITIES, VALID_STATUSES } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function keyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Hook LLM opsional (OpenAI-compatible). Gagal/timeout -> null (fallback heuristik).
async function tryLlmParse(text, now) {
  const url = process.env.LLM_API_URL;
  const key = process.env.LLM_API_KEY;
  if (!url || !key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Ekstrak task dari teks pengguna (Indonesia/Inggris). Hari ini ${keyOf(now)} zona ${process.env.TZ || 'Asia/Jakarta'}. Balas HANYA JSON: {"title":string,"logDate":"YYYY-MM-DD","startTime":"HH:MM"|null,"endTime":"HH:MM"|null,"priority":"HIGH"|"MEDIUM"|"LOW","status":"TODO"|"IN_PROGRESS"|"DONE","tags":[string],"estimatedMinutes":number|null}. Jangan karang fakta; field tak terdeteksi pakai default (hari ini/TODO/MEDIUM/null).`,
          },
          { role: 'user', content: text.slice(0, 500) },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content || '';
    const out = JSON.parse(raw);
    if (!out.title || !/^\d{4}-\d{2}-\d{2}$/.test(out.logDate || '')) return null;
    if (!VALID_PRIORITIES.includes(out.priority)) out.priority = 'MEDIUM';
    if (!VALID_STATUSES.includes(out.status)) out.status = 'TODO';
    return {
      title: String(out.title).slice(0, 140),
      logDate: out.logDate,
      startTime: out.startTime || null,
      endTime: out.endTime || null,
      priority: out.priority,
      status: out.status,
      tags: Array.isArray(out.tags) ? out.tags.map(String).slice(0, 10) : [],
      estimatedMinutes: out.estimatedMinutes ? Number(out.estimatedMinutes) : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/ai/parse-task { text } -> { draft, engine }
router.post('/parse-task', async (req, res) => {
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: 'Teks wajib diisi' });
  const now = new Date();
  const llm = await tryLlmParse(String(text), now);
  if (llm) return res.json({ draft: llm, engine: 'llm' });
  const draft = parseNatural(text, now);
  res.json({ draft, engine: 'heuristic' });
});

export default router;
