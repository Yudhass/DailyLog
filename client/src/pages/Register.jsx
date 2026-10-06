import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { Field, PrimaryButton, ErrorText, inputStyle } from '../components/form.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      toast.success('Akun dibuat. Silakan masuk.');
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const msg = err.response?.data?.error || 'Pendaftaran gagal. Coba lagi.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Buat akun" subtitle="Mulai catatan harian pribadimu.">
      <form onSubmit={onSubmit}>
        <ErrorText>{error}</ErrorText>
        <Field label="Nama">
          <input style={inputStyle} required value={form.name} onChange={set('name')} autoComplete="name" placeholder="Nama lengkap" />
        </Field>
        <Field label="Email">
          <input style={inputStyle} type="email" required value={form.email} onChange={set('email')} autoComplete="email" placeholder="nama@email.com" />
        </Field>
        <Field label="Password">
          <PasswordInput value={form.password} onChange={set('password')} autoComplete="new-password" minLength={6} placeholder="Minimal 6 karakter" />
        </Field>
        <PrimaryButton disabled={loading}>{loading ? 'Memproses…' : 'Daftar'}</PrimaryButton>
        <p className="auth-switch">
          Sudah punya akun? <Link to="/login">Masuk</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
