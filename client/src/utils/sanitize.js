// Sanitasi HTML ringan (allowlist) untuk output rich-text editor.
// Mencegah XSS: skrip, iframe, event-handler, dan URL javascript: dibuang.

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'H1', 'H2', 'H3', 'BLOCKQUOTE', 'UL', 'OL', 'LI',
  'A', 'IMG', 'CODE', 'PRE', 'HR', 'DIV', 'SPAN',
]);

function cleanUrl(url, { allowDataImage = false } = {}) {
  const v = String(url || '').trim();
  if (/^(https?:|mailto:)/i.test(v)) return v;
  if (allowDataImage && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v)) return v;
  return '';
}

function cleanNode(src, doc) {
  if (src.nodeType === 3) return doc.createTextNode(src.textContent);
  if (src.nodeType !== 1) return null;
  const tag = src.tagName.toUpperCase();
  if (!ALLOWED_TAGS.has(tag)) {
    // Bungkus isi yang aman (mis. table -> teks/list di dalamnya tetap diambil).
    const frag = doc.createDocumentFragment();
    src.childNodes.forEach((c) => {
      const n = cleanNode(c, doc);
      if (n) frag.appendChild(n);
    });
    return frag;
  }
  const el = doc.createElement(tag.toLowerCase());
  if (tag === 'A') {
    const href = cleanUrl(src.getAttribute('href'));
    if (href) {
      el.setAttribute('href', href);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }
  if (tag === 'IMG') {
    const imgSrc = cleanUrl(src.getAttribute('src'), { allowDataImage: true });
    if (!imgSrc) return null;
    el.setAttribute('src', imgSrc);
    el.setAttribute('alt', String(src.getAttribute('alt') || '').slice(0, 120));
    el.setAttribute('loading', 'lazy');
    // Lebar hasil resize (atribut width angka, dibatasi 80–1000px).
    const w = parseInt(src.getAttribute('width') || '', 10);
    if (Number.isFinite(w)) {
      el.setAttribute('width', String(Math.max(80, Math.min(1000, w))));
    }
  }
  src.childNodes.forEach((c) => {
    const n = cleanNode(c, doc);
    if (n) el.appendChild(n);
  });
  return el;
}

export function sanitizeHtml(dirty) {
  const html = String(dirty || '');
  if (!html.trim()) return '';
  const doc = document.implementation.createHTMLDocument('');
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const frag = doc.createDocumentFragment();
  parsed.body.childNodes.forEach((c) => {
    const n = cleanNode(c, doc);
    if (n) frag.appendChild(n);
  });
  const wrap = doc.createElement('div');
  wrap.appendChild(frag);
  return wrap.innerHTML;
}

// Teks polos untuk cuplikan kartu (tanpa tag).
export function htmlToText(html, max = 140) {
  const tmp = document.createElement('div');
  tmp.innerHTML = sanitizeHtml(html);
  const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
