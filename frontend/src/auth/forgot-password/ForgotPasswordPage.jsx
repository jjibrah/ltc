import { useState } from 'react';
import { Link } from 'react-router-dom';

import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';
import AuthAlert from '../components/AuthAlert';
import AuthField from '../components/AuthField';
import AuthSubmitButton from '../components/AuthSubmitButton';
import AuthLayout from '../layout/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest(endpoints.auth.forgotPassword, { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      setSuccess(true);
    } catch {
      setError('We couldn’t process your request right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth-heading" id="auth-title">Forgot your password?</h1>
      <p className="auth-description">Enter your email address and we’ll send you instructions to reset your password.</p>
      {success ? (
        <div className="auth-success">
          <AuthAlert title="Check your email" tone="success">If an account exists for that email address, we’ve sent password reset instructions.</AuthAlert>
          <Link className="auth-link" to="/login">Back to sign in</Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && <AuthAlert title="Unable to send instructions">{error}</AuthAlert>}
          <AuthField label="Email" name="email" type="email" placeholder="name@example.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <AuthSubmitButton loading={loading} loadingLabel="Sending…">Send reset instructions</AuthSubmitButton>
          <Link className="auth-back-link auth-link" to="/login">Back to sign in</Link>
        </form>
      )}
    </AuthLayout>
  );
}
