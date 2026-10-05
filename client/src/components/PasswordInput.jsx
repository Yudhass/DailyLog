import { useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { inputStyle } from './form.jsx';

export default function PasswordInput({ value, onChange, autoComplete = 'current-password', minLength, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <input
        style={{ ...inputStyle, paddingRight: 44 }}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Sembunyikan password' : 'Lihat password'}
        title={visible ? 'Sembunyikan password' : 'Lihat password'}
        style={{
          position: 'absolute',
          top: '50%',
          right: 6,
          transform: 'translateY(-50%)',
          border: 'none',
          background: 'transparent',
          color: 'var(--muted)',
          width: 34,
          height: 34,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 8,
        }}
      >
        {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}