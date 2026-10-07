export default function AuthCard({ children, footer }) {
  return (
    <section className="auth-card" aria-labelledby="auth-title">
      {children}
      {footer && <p className="auth-card__footer">{footer}</p>}
    </section>
  );
}
