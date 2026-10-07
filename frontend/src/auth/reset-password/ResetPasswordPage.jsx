import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';
import AuthAlert from '../components/AuthAlert';
import AuthField from '../components/AuthField';
import AuthSubmitButton from '../components/AuthSubmitButton';
import PasswordField from '../components/PasswordField';
import AuthLayout from '../layout/AuthLayout';

export default function ResetPasswordPage() {
  const { token: routeToken } = useParams();
  const [accessToken] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('access_token') || routeToken || '');
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ password: '', confirmPassword: '', firstName: '', lastName: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ loading: false, error: null, success: false });

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!formData.firstName.trim()) nextErrors.firstName = 'Enter your first name.';
    if (!formData.lastName.trim()) nextErrors.lastName = 'Enter your last name.';
    if (!formData.password) nextErrors.password = 'Enter a new password.';
    if (!formData.confirmPassword) nextErrors.confirmPassword = 'Confirm your new password.';
    else if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus({ loading: true, error: null, success: false });
    try {
      if (!accessToken) throw new Error('Missing invitation token');
      await apiRequest(endpoints.auth.setPassword, {
        method: 'POST',
        body: JSON.stringify({ access_token: accessToken, password: formData.password, first_name: formData.firstName.trim(), last_name: formData.lastName.trim() }),
      });
      setStatus({ loading: false, error: null, success: true });
      window.setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch {
      setStatus({ loading: false, error: 'This reset link may be invalid or expired. Please request a new one.', success: false });
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth-heading" id="auth-title">Create a new password</h1>
      <p className="auth-description">Complete your profile to activate your Living the Charge account.</p>
      {status.success ? (
        <div className="auth-success">
          <AuthAlert title="Password updated" tone="success">Your password has been changed successfully.</AuthAlert>
          <p className="auth-section-note">Returning you to sign in…</p>
          <Link className="auth-link" to="/login">Return to sign in</Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {status.error && <AuthAlert title="Unable to update password">{status.error}</AuthAlert>}
          <div className="auth-form auth-form--name-grid">
            <AuthField label="First name" name="firstName" type="text" autoComplete="given-name" value={formData.firstName} onChange={handleChange} error={fieldErrors.firstName} required />
            <AuthField label="Last name" name="lastName" type="text" autoComplete="family-name" value={formData.lastName} onChange={handleChange} error={fieldErrors.lastName} required />
          </div>
          <PasswordField label="New password" name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} error={fieldErrors.password} required />
          <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} error={fieldErrors.confirmPassword} required />
          <AuthSubmitButton loading={status.loading} loadingLabel="Saving…">Reset password</AuthSubmitButton>
          <Link className="auth-back-link auth-link" to="/login">Back to sign in</Link>
        </form>
      )}
    </AuthLayout>
  );
}
