import { SidebarBody } from './Sidebar.jsx';

// Sidebar permanen untuk layar besar (≥ 1024px). Di layar yang lebih kecil,
// navigasi kembali ke drawer lewat komponen Sidebar.
export default function SidebarStatic() {
  return (
    <aside className="sidebar-static" aria-label="Navigasi utama">
      <strong className="brand" style={{ padding: '0 4px 6px' }}>
        DailyLog<span style={{ color: 'var(--green)' }}>.</span>
      </strong>
      <SidebarBody />
    </aside>
  );
}
