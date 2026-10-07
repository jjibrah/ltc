export default function AuthField({ label, name, error, id = name, ...props }) {
  const errorId = `${id}-error`;

  return (
    <div className="auth-field">
      {label && <label className="auth-field__label" htmlFor={id}>{label}</label>}
      <input
        id={id}
        name={name}
        className={`auth-field__input${error ? ' auth-field__input--error' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && <p className="auth-field__error" id={errorId}>{error}</p>}
    </div>
  );
}
