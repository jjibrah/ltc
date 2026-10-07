import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../app/providers/AuthProvider';
import AuthAlert from '../components/AuthAlert';
import AuthField from '../components/AuthField';
import AuthSubmitButton from '../components/AuthSubmitButton';
import PasswordField from '../components/PasswordField';
import AuthLayout from '../layout/AuthLayout';
function getLoginError(error) {
  if (error?.status === 401 || error?.status === 403) return 'Incorrect email or password.';
  return 'We couldn’t connect to the server. Please try again.';
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inviteRedirecting, setInviteRedirecting] = useState(false);

  // Supabase invitation links may be configured to return to /login and place
  // the one-time session in the URL hash. Hand the hash to the single password
  // setup flow instead of treating the invite as a normal login attempt.
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hashParams.get('error_code') === 'otp_expired') {
      setInviteError('This invitation link has expired or has already been used. Ask a super admin to resend the invitation.');
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }
    if (hashParams.get('type') !== 'invite' || !hashParams.get('access_token')) return;

    setInviteRedirecting(true);
    navigate({ pathname: '/set-password', hash: window.location.hash }, { replace: true });
  }, [navigate]);

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    const createdMeta = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    meta.content = 'noindex, nofollow';
    return () => {
      if (createdMeta) meta.remove();
      else meta.content = 'index, follow';
    };
  }, []);

  const validate = () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'Enter your email address.';
    else if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Enter your password.';
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      const from = location.state?.from;
      const requested = from ? `${from.pathname || ''}${from.search || ''}${from.hash || ''}` : '';
      const destination = requested.startsWith('/admin/') && requested !== '/admin/login' ? requested : '/admin/dashboard';
      navigate(destination || '/admin/dashboard', { replace: true });
    } catch (requestError) {
      setError(getLoginError(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {inviteRedirecting ? (
        <>
          <h1 className="auth-heading" id="auth-title">Open your invitation</h1>
          <p className="auth-description">Taking you to secure password setup…</p>
        </>
      ) : (
        <>
      <h1 className="auth-heading" id="auth-title">Admin Portal</h1>
      <p className="auth-description">Sign in to manage the Living the Charge platform.</p>
      {inviteError && <AuthAlert title="Invitation link expired">{inviteError}</AuthAlert>}
      {error && <AuthAlert title="Unable to sign in">{error}</AuthAlert>}
      <form className="auth-form" onSubmit={handleLogin} noValidate>
        <AuthField label="Email" name="email" type="email" placeholder="name@example.com" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); }} error={fieldErrors.email} required />
        <div className="auth-password-block">
          <div className="auth-field-header">
            <label className="auth-field__label" htmlFor="login-password">Password</label>
            <Link className="auth-link" to="/forgot-password">Forgot password?</Link>
          </div>
          <PasswordField label={null} id="login-password" name="password" aria-label="Password" value={password} onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: undefined })); }} error={fieldErrors.password} />
        </div>
        <AuthSubmitButton loading={loading} loadingLabel="Signing in…">Sign in</AuthSubmitButton>
      </form>
        </>
      )}
    </AuthLayout>
  );
}
