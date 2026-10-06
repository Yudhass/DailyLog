import { NavLink } from 'react-router-dom';
import { CalendarBlank, Sun, ChartLineUp } from '@phosphor-icons/react';

const ITEMS = [
  { to: '/dashboard', label: 'Kalender', icon: CalendarBlank },
  { to: '/today', label: 'Hari ini', icon: Sun },
  { to: '/report', label: 'Laporan', icon: ChartLineUp },
];

// Navigasi bawah khusus layar kecil (dirender hanya bila login, lihat App.jsx).
export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Navigasi utama">
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="tabbar-item">
          {({ isActive }) => (
            <>
              <Icon size={21} weight={isActive ? 'fill' : 'regular'} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
