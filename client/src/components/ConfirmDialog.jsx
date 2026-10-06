import { useEffect, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

// Dialog konfirmasi/prompt kustom pengganti window.confirm / window.prompt.
// Props:
//   title, message, confirmLabel, cancelLabel, danger (bool),
//   input?: { label, placeholder, defaultValue } -> jadi mode prompt,
//   onConfirm(value?), onCancel()
export default function ConfirmDialog({
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  danger = false,
  input = null,
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState(input?.defaultValue || '');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function submit(e) {
    e.preventDefault();
    onConfirm?.(input ? value.trim() : undefined);
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="modal-backdrop confirm-backdrop"
      onClick={(e) => e.target === e.currentTarget && onCancel?.()}
    >
      <div className="modal-card confirm-card">
        <form onSubmit={submit}>
          <div className="confirm-head">
            <span className={`confirm-ico${danger ? ' danger' : ''}`}>
              <WarningCircle size={22} weight={danger ? 'fill' : 'regular'} />
            </span>
            <h2 className="confirm-title">{title}</h2>
          </div>
          {message && <p className="confirm-msg">{message}</p>}
          {input && (
            <label className="field" style={{ marginTop: 12 }}>
              {input.label && <span>{input.label}</span>}
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={input.placeholder || ''}
              />
            </label>
          )}
          <div className="confirm-actions">
            <button type="button" className="pill-btn" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="submit" className={danger && !input ? 'btn-danger' : 'btn-primary'}>
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
