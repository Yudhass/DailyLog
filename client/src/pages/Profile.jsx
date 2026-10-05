import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { Field, PrimaryButton, ErrorText, inputStyle } from '../components/form.jsx';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      const { data } = await api.put('/auth/profile', { name: name !== user.name ? name : undefined, password: password || undefined });
      updateUser(data);
      setPassword('');
      setMsg('Profil diperbarui.');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan.');
    }
  }

  return (
    <>
      <TopBar />
      <main className="container page" style={{ maxWidth: 560 }}>
        <Link to="/dashboard" className="back-link">
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Profil</h1>
          <p style={{ color: 'var(--muted)' }}>{user?.email}</p>
        </div>
        <form onSubmit={onSubmit} className="panel">
          <ErrorText>{error}</ErrorText>
          {msg && <p role="status" style={{ color: 'var(--green)', fontSize: 14, marginBottom: 14 }}>{msg}</p>}
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
      </main>
    </>
  );
}