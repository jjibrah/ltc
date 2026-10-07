import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';

import AuthField from './AuthField';

export default function PasswordField({ label = 'Password', name = 'password', error, autoComplete, ...props }) {
  const generatedId = useId();
  const id = props.id || `${name}-${generatedId}`;
  const accessibleLabel = label || 'password';
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-password-field">
      <AuthField
        {...props}
        id={id}
        label={label}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete || (name === 'password' ? 'current-password' : 'new-password')}
        error={error}
      />
      <button
        className="auth-password-field__toggle"
        type="button"
        aria-label={visible ? `Hide ${accessibleLabel.toLowerCase()}` : `Show ${accessibleLabel.toLowerCase()}`}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
