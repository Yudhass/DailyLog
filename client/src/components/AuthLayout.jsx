import { Sun, Moon, CalendarBlank, Sparkle, ChatCircleText } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext.jsx';

function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label={theme === 'dark' ? 'Tema terang' : 'Tema gelap'} title={theme === 'dark' ? 'Tema terang' : 'Tema gelap'} className="icon-btn auth-theme-btn">
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="auth-shell">
      <ThemeButton />
      <div className="container auth-grid">
        <div className="auth-hero">
          <p className="auth-brand">
            DailyLog<span className="auth-brand-dot">.</span>
          </p>
          <h1 className="auth-title">
            Apa yang kamu selesaikan hari ini?
          </h1>
          <p className="auth-desc">
            Catat kegiatan, pantau tugas dari kalender, dan lihat progresmu tersusun rapi seperti buku catatan pribadi.
          </p>
          <ul className="auth-points">
            <li>
              <span className="auth-ico"><CalendarBlank size={17} /></span>
              <span><strong>Kalender hidup</strong>Agenda harian, mingguan, dan bulanan dalam satu tempat.</span>
            </li>
            <li>
              <span className="auth-ico"><Sparkle size={17} /></span>
              <span><strong>Catat secepat chat</strong>Quick add bahasa natural dan ringkasan otomatis.</span>
            </li>
            <li>
              <span className="auth-ico"><ChatCircleText size={17} /></span>
              <span><strong>Selalu terjangkau</strong>Bot Telegram, mode offline, dan pengingat harian.</span>
            </li>
          </ul>
        </div>
        <section className="auth-card">
          <h2 className="auth-card-title">{title}</h2>
          <p className="auth-card-sub">{subtitle}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
