import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { Field, PrimaryButton, ErrorText, inputStyle } from '../components/form.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.error || 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Buat akun" subtitle="Mulai catatan harian pribadimu.">
      <form onSubmit={onSubmit}>
        <ErrorText>{error}</ErrorText>
        <Field label="Nama">
          <input style={inputStyle} required value={form.name} onChange={set('name')} autoComplete="name" />
        </Field>
        <Field label="Email">
          <input style={inputStyle} type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <Field label="Password">
          <PasswordInput value={form.password} onChange={set('password')} autoComplete="new-password" minLength={6} />
        </Field>
        <PrimaryButton disabled={loading}>{loading ? 'Memproses…' : 'Daftar'}</PrimaryButton>
        <p style={{ marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
          Sudah punya akun? <Link to="/login" style={{ color: 'var(--green)' }}>Masuk</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
