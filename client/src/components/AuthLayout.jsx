import { Sun, Moon } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext.jsx';

function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label={theme === 'dark' ? 'Tema terang' : 'Tema gelap'} title={theme === 'dark' ? 'Tema terang' : 'Tema gelap'} className="icon-btn" style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', right: 14, zIndex: 10 }}>
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', position: 'relative' }}>
      <ThemeButton />
      <div className="container auth-grid">
        <div>
          <p style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
            DailyLog<span style={{ color: 'var(--green)' }}>.</span>
          </p>
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', marginTop: 18 }}>
            Apa yang kamu selesaikan hari ini?
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 14, maxWidth: '44ch' }}>
            Catat kegiatan, pantau tugas dari kalender, dan lihat progresmu tersusun rapi seperti buku catatan pribadi.
          </p>
        </div>
        <section className="auth-card">
          <h2 style={{ fontSize: 24 }}>{title}</h2>
          <p style={{ color: 'var(--muted)', marginTop: 6, marginBottom: 24 }}>{subtitle}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
