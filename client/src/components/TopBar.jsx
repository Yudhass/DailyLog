import { useState } from 'react';
import { Link } from 'react-router-dom';
import { List } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';

export default function TopBar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

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
        <Link to="/profile" className="muted-link desktop-only">{user?.name}</Link>
      </div>
    </header>
    <Sidebar open={open} onClose={() => setOpen(false)} />
    </>
  );
}