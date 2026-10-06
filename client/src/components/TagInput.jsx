import { useEffect, useMemo, useRef, useState } from 'react';
import { Tag } from '@phosphor-icons/react';
import { api } from '../api/client.js';

// Input tag koma-separasi dengan saran dari tag yang pernah dipakai.
// Klik saran atau tekan Tab/Enter untuk memilih; panah atas/bawah navigasi.
export default function TagInput({ value, onChange, placeholder, inputStyle }) {
  const [all, setAll] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let hidup = true;
    api.get('/tasks/tags')
      .then(({ data }) => { if (hidup) setAll(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { hidup = false; };
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, []);

  const parts = useMemo(() => String(value || '').split(','), [value]);
  const frag = parts[parts.length - 1].trim().toLowerCase();
  const used = useMemo(
    () => new Set(parts.map((p) => p.trim().toLowerCase()).filter(Boolean)),
    [parts]
  );

  const suggestions = useMemo(() => {
    const pool = all.filter((t) => !used.has(t.tag.toLowerCase()));
    const hits = frag
      ? pool.filter((t) => t.tag.toLowerCase().includes(frag))
      : pool;
    return hits.slice(0, 7);
  }, [all, used, frag]);

  useEffect(() => { setActive(0); }, [frag]);

  function choose(tag) {
    const head = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean);
    onChange([...head, tag, ''].join(', '));
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) {
      if ((e.key === 'ArrowDown' || e.key === 'Tab') && suggestions.length > 0 && frag) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      choose(suggestions[Math.min(active, suggestions.length - 1)].tag);
    }
  }

  return (
    <div ref={wrapRef} className="tag-input-wrap">
      <input
        ref={inputRef}
        style={inputStyle}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
        aria-label="Tag"
      />
      {open && suggestions.length > 0 && (
        <ul className="tag-suggest" role="listbox" aria-label="Saran tag">
          {suggestions.map((s, i) => (
            <li key={s.tag} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`tag-suggest-item${i === active ? ' active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); choose(s.tag); }}
                onMouseEnter={() => setActive(i)}
              >
                <Tag size={14} />
                <span className="tag-suggest-name">{s.tag}</span>
                <span className="mono tag-suggest-count">×{s.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
