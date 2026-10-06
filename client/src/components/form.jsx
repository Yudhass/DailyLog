export function Field({ label, children }) {
  return (
    <label className="field" style={{ display: 'block', marginBottom: 16, minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

export const inputStyle = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '10px 12px',
  background: 'var(--paper)',
  fontSize: 16,
};

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        width: '100%',
        minHeight: 44,
        background: 'var(--green)',
        color: 'var(--on-green)',
        border: 'none',
        borderRadius: 8,
        padding: '11px 16px',
        fontWeight: 600,
        fontSize: 15,
        opacity: props.disabled ? 0.6 : 1,
        ...(props.style || {}),
      }}
    >
      {children}
    </button>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <p role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 14 }}>{children}</p>;
}
