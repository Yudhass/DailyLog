import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { Field, PrimaryButton, ErrorText, inputStyle } from '../components/form.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user);
      toast.success(`Selamat datang kembali, ${data.user?.name || ''}!`.trim());
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal masuk. Coba lagi.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Masuk" subtitle="Selamat datang kembali.">
      <form onSubmit={onSubmit}>
        <ErrorText>{error}</ErrorText>
        <Field label="Email">
          <input style={inputStyle} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="nama@email.com" />
        </Field>
        <Field label="Password">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <PrimaryButton disabled={loading}>{loading ? 'Memproses…' : 'Masuk'}</PrimaryButton>
        <p className="auth-switch">
          Belum punya akun? <Link to="/register">Daftar</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
