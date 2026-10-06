import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { List, UserCircle, Moon, Sun, SignOut } from '@phosphor-icons/react';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <>
    <header className="app-header">
      <div className="container header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="icon-btn menu-toggle" onClick={() => setOpen(true)} aria-label="Buka menu" aria-expanded={open}>
            <List size={19} />
          </button>
          <Link to="/dashboard" className="brand header-brand">
            DailyLog<span style={{ color: 'var(--green)' }}>.</span>
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="icon-btn" onClick={toggle} aria-label="Ganti tema" title="Ganti tema">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/profile" className="icon-btn" aria-label="Profil" title="Profil">
            <UserCircle size={20} />
          </Link>
          <button className="icon-btn" onClick={() => { logout(); navigate('/login'); }} aria-label="Keluar" title="Keluar">
            <SignOut size={18} />
          </button>
        </div>
      </div>
    </header>
    <Sidebar open={open} onClose={() => setOpen(false)} />
    </>
  );
}