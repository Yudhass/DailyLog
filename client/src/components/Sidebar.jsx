import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { X, CalendarBlank, Sun, ChartLineUp, UserCircle, SignOut, Moon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const ITEMS = [
  { to: '/dashboard', label: 'Kalender', icon: CalendarBlank },
  { to: '/today', label: 'Hari ini', icon: Sun },
  { to: '/report', label: 'Laporan', icon: ChartLineUp },
  { to: '/profile', label: 'Profil', icon: UserCircle },
];

// Konten navigasi dipakai ulang oleh drawer (mobile) dan sidebar statis (desktop).
export function SidebarBody({ onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <>
      <nav className="drawer-nav">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose} className="drawer-item">
            {({ isActive }) => (
              <>
                <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="drawer-foot">
        <p className="drawer-user">{user?.name}</p>
        <p className="drawer-mail">{user?.email}</p>
        <button className="drawer-item" onClick={toggle}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === 'dark' ? 'Tema terang' : 'Tema gelap'}</span>
        </button>
        <button className="drawer-item" onClick={() => { logout(); onClose?.(); navigate('/login'); }}>
          <SignOut size={20} />
          <span>Keluar</span>
        </button>
      </div>
    </>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user: _user } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <div className={`drawer-root ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <button className="drawer-scrim" aria-label="Tutup menu" tabIndex={open ? 0 : -1} onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="drawer-head">
          <strong className="brand">
            DailyLog<span style={{ color: 'var(--green)' }}>.</span>
          </strong>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup menu">
            <X size={17} />
          </button>
        </div>
        <SidebarBody onClose={onClose} />
      </aside>
    </div>
  );
}
