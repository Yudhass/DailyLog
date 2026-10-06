import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Field, PrimaryButton, inputStyle } from '../components/form.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [chatLinks, setChatLinks] = useState([]);
  const [pendingUnlink, setPendingUnlink] = useState(null);
  const toast = useToast();

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.put('/auth/profile', { name: name !== user.name ? name : undefined, password: password || undefined });
      updateUser(data);
      setPassword('');
      toast.success('Profil diperbarui.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan.');
    }
  }

  return (
    <>
      <TopBar />
      <main className="container page">
        <Link to="/dashboard" className="back-link">
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Profil</h1>
          <p style={{ color: 'var(--muted)' }}>{user?.email}</p>
        </div>
        <form onSubmit={onSubmit} className="panel">
          <Field label="Nama">
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Password baru (kosongkan jika tidak diubah)">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} />
          </Field>
          <PrimaryButton>Simpan perubahan</PrimaryButton>
        </form>
        <button onClick={() => { logout(); navigate('/login'); }} className="pill-btn" style={{ width: '100%' }}>
          Keluar dari akun
        </button>

        <section className="panel" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 17 }}>Bot Telegram</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Buat kode sekali pakai (10 menit), lalu kirim ke bot untuk menautkan akun.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="pill-btn" onClick={async () => {
              try {
                const { data } = await api.post('/chat-links/code');
                setLinkCode(data.code);
                const list = await api.get('/chat-links');
                setChatLinks(list.data);
                toast.success('Kode tautan dibuat.');
              } catch (err) { toast.error(err.response?.data?.error || 'Gagal membuat kode.'); }
            }}>
              Buat kode tautan
            </button>
            <button className="pill-btn" onClick={async () => {
              try {
                const { data } = await api.get('/chat-links');
                setChatLinks(data);
                toast.success('Daftar tautan dimuat.');
              } catch { toast.error('Gagal memuat tautan.'); }
            }}>
              Muat ulang tautan
            </button>
          </div>
          {linkCode && <p className="mono" style={{ fontSize: 20, letterSpacing: '0.2em', marginTop: 8 }}>{linkCode}</p>}
          {chatLinks.length > 0 && (
            <ul className="task-list" style={{ marginTop: 8 }}>
              {chatLinks.map((l) => (
                <li key={l.id} className="task-row">
                  <span className="mono" style={{ fontSize: 13 }}>{l.provider} • {l.label || l.externalId}</span>
                  <button className="danger-btn" onClick={() => setPendingUnlink(l)}>
                    Putuskan
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 17 }}>Notifikasi push</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Aktifkan push untuk pengingat. Catatan iOS: pasang aplikasi ke layar utama dulu agar push berfungsi.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="pill-btn" onClick={async () => {
              try {
                if (!('Notification' in window) || !('serviceWorker' in navigator)) {
                  toast.error('Browser tidak mendukung push.');
                  return;
                }
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') { toast.error('Izin notifikasi ditolak.'); return; }
                const { data } = await api.get('/push/public-key');
                if (!data.publicKey) { toast.error('Server belum punya VAPID key.'); return; }
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: data.publicKey,
                });
                await api.post('/push/subscribe', { subscription: sub.toJSON(), kinds: 'reminder,summary' });
                toast.success('Push aktif ✓');
              } catch (err) { toast.error(err.response?.data?.error || 'Gagal mengaktifkan push.'); }
            }}>
              Aktifkan push
            </button>
            <button className="pill-btn" onClick={async () => {
              try { const { data } = await api.post('/push/test'); toast.success(`Uji terkirim ke ${data.sent} perangkat.`); }
              catch (err) { toast.error(err.response?.data?.error || 'Uji push gagal.'); }
            }}>
              Kirim uji
            </button>
          </div>
        </section>
      </main>

      {pendingUnlink && (
        <ConfirmDialog
          title="Putuskan tautan?"
          message={`Tautan ${pendingUnlink.provider} • ${pendingUnlink.label || pendingUnlink.externalId} akan diputus. Bot tidak lagi bisa mencatat atas nama akun ini.`}
          confirmLabel="Putuskan"
          danger
          onCancel={() => setPendingUnlink(null)}
          onConfirm={async () => {
            const id = pendingUnlink.id;
            setPendingUnlink(null);
            try {
              await api.delete(`/chat-links/${id}`);
              setChatLinks((list) => list.filter((x) => x.id !== id));
              toast.success('Tautan diputuskan.');
            } catch { toast.error('Gagal memutuskan tautan.'); }
          }}
        />
      )}
    </>
  );
}