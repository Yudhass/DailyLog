import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { Field, PrimaryButton, ErrorText, inputStyle } from '../components/form.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal masuk. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Masuk" subtitle="Selamat datang kembali.">
      <form onSubmit={onSubmit}>
        <ErrorText>{error}</ErrorText>
        <Field label="Email">
          <input style={inputStyle} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <PrimaryButton disabled={loading}>{loading ? 'Memproses…' : 'Masuk'}</PrimaryButton>
        <p style={{ marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
          Belum punya akun? <Link to="/register" style={{ color: 'var(--green)' }}>Daftar</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
