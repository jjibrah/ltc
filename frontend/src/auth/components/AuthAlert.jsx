export default function AuthAlert({ title, children, tone = 'error' }) {
  return (
    <div className={`auth-alert auth-alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {title && <strong>{title}</strong>}
      <span>{children}</span>
    </div>
  );
}
