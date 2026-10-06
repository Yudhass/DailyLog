import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle, WarningCircle, Info } from '@phosphor-icons/react';

const ToastContext = createContext(null);

let seq = 0;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((message, type = 'info', ms = 3600) => {
    const id = `t${Date.now()}-${seq += 1}`;
    setItems((list) => [...list.slice(-3), { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), ms);
    return id;
  }, [dismiss]);

  const api = {
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error', 4600),
    info: (message) => push(message, 'info'),
    dismiss,
  };

  const ICONS = {
    success: <CheckCircle size={20} weight="fill" />,
    error: <WarningCircle size={20} weight="fill" />,
    info: <Info size={20} weight="fill" />,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} role="status" className={`toast toast-${t.type}`}>
            <span className="toast-ico">{ICONS[t.type]}</span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-x" onClick={() => dismiss(t.id)} aria-label="Tutup notifikasi">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider');
  return ctx;
}
