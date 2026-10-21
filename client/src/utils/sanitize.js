// Sanitasi HTML ringan (allowlist) untuk output rich-text editor.
// Mencegah XSS: skrip, iframe asing, event-handler, dan URL javascript: dibuang.
// Dibuat setia WYSIWYG: warna, font, ukuran, alignment, tabel, dan video
// yang dihasilkan toolbar Summernote tetap tampil sama di mode lihat.

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL',
  'SUB', 'SUP', 'FONT',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'PRE', 'CODE',
  'UL', 'OL', 'LI',
  'A', 'IMG', 'HR', 'DIV', 'SPAN',
  'TABLE', 'CAPTION', 'COL', 'COLGROUP',
  'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD',
  'FIGURE', 'FIGCAPTION',
  'IFRAME', 'VIDEO', 'SOURCE',
]);

const ALLOWED_STYLE_PROPS = new Set([
  'color', 'background-color',
  'text-align', 'font-size', 'font-family',
  'font-weight', 'font-style', 'text-decoration', 'line-height',
  'width', 'height', 'max-width',
]);

// Hanya properti + nilai yang aman yang dipertahankan agar
// warna/highlight/alignment/ukuran font dari editor tidak hilang,
// tapi tetap tidak bisa disisipi expression() / url(javascript:…).
function cleanStyle(raw) {
  const out = [];
  String(raw || '').split(';').forEach((decl) => {
    const sep = decl.indexOf(':');
    if (sep < 0) return;
    const prop = decl.slice(0, sep).trim().toLowerCase();
    const val = decl.slice(sep + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop) || !val) return;
    if (val.length > 300) return;
    if (/expression|javascript:|vbscript:|behaviour|behavior|binding|url\s*\(/i.test(val)) return;
    if (prop === 'text-align' && !/^(left|center|right|justify|start|end)$/i.test(val)) return;
    if ((prop === 'color' || prop === 'background-color')
      && !/^(#[0-9a-f]{3,8}|rgba?\([^)]{1,80}\)|hsla?\([^)]{1,80}\)|[a-z]+(\s+[a-z]+)?)$/i.test(val)) return;
    if (prop === 'font-size'
      && !/^(\d+(\.\d+)?(px|pt|em|rem|%)|xx?-?small|xx?-?large|medium|smaller|larger)$/i.test(val)) return;
    if (prop === 'font-family' && !/^[\w\s"',\-+]+$/.test(val)) return;
    if (prop === 'line-height' && !/^(normal|\d+(\.\d+)?(px|pt|em|rem|%)?)$/i.test(val)) return;
    if (prop === 'font-weight' && !/^(normal|bold|bolder|lighter|[1-9]00)$/i.test(val)) return;
    if (prop === 'font-style' && !/^(normal|italic|oblique)$/i.test(val)) return;
    if (prop === 'text-decoration' && !/^(none|underline|line-through|overline)/i.test(val)) return;
    if ((prop === 'width' || prop === 'height' || prop === 'max-width')
      && !/^(\d+(\.\d+)?(px|%)|auto|100%)$/i.test(val)) return;
    out.push(`${prop}: ${val}`);
  });
  return out.join('; ');
}

function cleanUrl(url, { allowDataImage = false } = {}) {
  const v = String(url || '').trim();
  if (/^(https?:|mailto:)/i.test(v)) return v;
  if (allowDataImage && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v)) return v;
  return '';
}

// Video embed Summernote berupa iframe — hanya izinkan penyedia tepercaya.
function cleanIframeSrc(url) {
  const v = String(url || '').trim();
  if (/^https:\/\/(www\.)?(youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|youtu\.be\/)/i.test(v)) return v;
  if (/^https:\/\/(player\.)?vimeo\.com\/video\//i.test(v)) return v;
  return '';
}

function cleanAlign(v) {
  const s = String(v || '').trim().toLowerCase();
  return ['left', 'center', 'right', 'justify'].includes(s) ? s : '';
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

  // Gaya inline yang aman (warna, highlight, alignment, font, ukuran).
  const style = cleanStyle(src.getAttribute('style'));
  if (style) el.setAttribute('style', style);
  const align = cleanAlign(src.getAttribute('align'));
  if (align && ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'IMG', 'TABLE', 'TD', 'TH'].includes(tag)) {
    el.setAttribute('align', align);
  }

  if (tag === 'A') {
    const href = cleanUrl(src.getAttribute('href'));
    if (href) {
      el.setAttribute('href', href);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
    const title = String(src.getAttribute('title') || '').slice(0, 200);
    if (title) el.setAttribute('title', title);
  }
  if (tag === 'IMG') {
    const imgSrc = cleanUrl(src.getAttribute('src'), { allowDataImage: true });
    if (!imgSrc) return null;
    el.setAttribute('src', imgSrc);
    el.setAttribute('alt', String(src.getAttribute('alt') || '').slice(0, 120));
    const imgTitle = String(src.getAttribute('title') || '').slice(0, 120);
    if (imgTitle) el.setAttribute('title', imgTitle);
    el.setAttribute('loading', 'lazy');
    // Lebar hasil resize (atribut width angka, dibatasi 80–1000px).
    const w = parseInt(src.getAttribute('width') || '', 10);
    if (Number.isFinite(w)) {
      el.setAttribute('width', String(Math.max(80, Math.min(1000, w))));
    }
    const h = parseInt(src.getAttribute('height') || '', 10);
    if (Number.isFinite(h)) {
      el.setAttribute('height', String(Math.max(20, Math.min(1000, h))));
    }
  }
  if (tag === 'IFRAME') {
    const srcUrl = cleanIframeSrc(src.getAttribute('src'));
    if (!srcUrl) return null;
    el.setAttribute('src', srcUrl);
    el.setAttribute('frameborder', '0');
    el.setAttribute('allowfullscreen', '');
    el.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    el.setAttribute('loading', 'lazy');
    const w = parseInt(src.getAttribute('width') || '560', 10);
    const h = parseInt(src.getAttribute('height') || '315', 10);
    el.setAttribute('width', String(Number.isFinite(w) ? Math.max(200, Math.min(1200, w)) : 560));
    el.setAttribute('height', String(Number.isFinite(h) ? Math.max(150, Math.min(800, h)) : 315));
    el.setAttribute('title', String(src.getAttribute('title') || 'Video').slice(0, 120));
  }
  if (tag === 'VIDEO') {
    const vSrc = cleanUrl(src.getAttribute('src'));
    if (vSrc) el.setAttribute('src', vSrc);
    el.setAttribute('controls', '');
    ['width', 'height'].forEach((k) => {
      const n = parseInt(src.getAttribute(k) || '', 10);
      if (Number.isFinite(n)) el.setAttribute(k, String(Math.max(80, Math.min(1200, n))));
    });
  }
  if (tag === 'SOURCE') {
    const sSrc = cleanUrl(src.getAttribute('src'));
    if (!sSrc) return null;
    el.setAttribute('src', sSrc);
    const type = String(src.getAttribute('type') || '').slice(0, 80);
    if (/^(video|audio|image)\//i.test(type)) el.setAttribute('type', type);
  }
  if (tag === 'FONT') {
    const color = String(src.getAttribute('color') || '').trim().slice(0, 40);
    if (/^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(color)) el.setAttribute('color', color);
    const face = String(src.getAttribute('face') || '').trim().slice(0, 120);
    if (face && /^[\w\s"',\-+]+$/.test(face)) el.setAttribute('face', face);
    const size = String(src.getAttribute('size') || '').trim().slice(0, 8);
    if (/^[1-7]$/.test(size)) el.setAttribute('size', size);
  }
  if (tag === 'TD' || tag === 'TH') {
    const cs = parseInt(src.getAttribute('colspan') || '', 10);
    const rs = parseInt(src.getAttribute('rowspan') || '', 10);
    if (Number.isFinite(cs) && cs > 1 && cs <= 20) el.setAttribute('colspan', String(cs));
    if (Number.isFinite(rs) && rs > 1 && rs <= 20) el.setAttribute('rowspan', String(rs));
  }
  src.childNodes.forEach((c) => {
    const n = cleanNode(c, doc);
    if (n) el.appendChild(n);
  });
  // Jangan simpan tabel kosong tanpa isi.
  if (tag === 'TABLE' && !el.textContent?.trim() && !el.querySelector('img,iframe,video')) {
    return doc.createTextNode('');
  }
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
