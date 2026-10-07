import { useState } from 'react';
import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

export default function EmailCapture() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && status !== 'loading';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      await apiRequest(endpoints.subscribe, {
        method: 'POST',
        body: JSON.stringify({ name, email, source: 'section' })
      });

      setStatus('success');
      setName('');
      setEmail('');
    } catch (error) {
      setErrorMsg(error.message || 'Unable to connect to the subscription server. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        role="status"
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          padding: 'clamp(3rem, 6vw, 5rem)',
          textAlign: 'center',
          maxWidth: '980px',
          margin: '0 auto',
          borderRadius: '4px',
        }}
      >
        <span style={{ display: 'block', color: 'var(--color-secondary)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '1rem' }}>Subscription confirmed</span>
        <h3 style={{
          fontFamily: 'var(--display-font)',
          fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
          marginBottom: '0.75rem',
          color: 'var(--color-primary)'
        }}>
          You're on the list.
        </h3>
        <p style={{
          fontFamily: 'var(--body-font)',
          fontSize: '16px',
          lineHeight: 1.7,
          color: 'var(--color-text-muted)',
          maxWidth: '450px',
          margin: '0 auto'
        }}>
          Thank you for joining our community of supporters. We will keep you updated on our students' academic progress and the growth of the endowment.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
      className="email-capture-box"
    >
      <div className="newsletter-intro" style={{ padding: 'clamp(2.5rem, 5vw, 4.5rem)', backgroundColor: '#FFFFFF', borderRight: '1px solid var(--color-border)' }}>
        <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--color-secondary)', marginBottom: '1.25rem' }}>
          Stay connected
        </span>
        <h3 style={{ fontFamily: 'var(--display-font)', fontSize: 'clamp(2.4rem, 4vw, 3.8rem)', fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.035em', marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
          Follow our progress.
        </h3>
        <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'var(--color-text-muted)', maxWidth: '440px' }}>
          Get occasional updates on student milestones and the growth of the endowment.
        </p>
        <p style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          No noise. Unsubscribe at any time.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '1.35rem',
        padding: 'clamp(2.5rem, 5vw, 4.5rem)',
      }}>
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'var(--display-font)',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-primary)',
              marginBottom: '0.5rem'
            }} htmlFor="name-input">
              Full Name
            </label>
            <input
              id="name-input"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amara Wanjiku"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'var(--display-font)',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-primary)',
              marginBottom: '0.5rem'
            }} htmlFor="email-input">
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="amara@example.com"
              style={inputStyle}
            />
          </div>
        </div>

        {status === 'error' && (
          <p style={{
            fontSize: '14px',
            color: 'var(--color-accent)',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {errorMsg}
          </p>
        )}

        <button 
          className="btn btn-primary"
          type="submit"
          disabled={!canSubmit}
          style={{
            width: '100%',
            minHeight: '52px',
            padding: '1rem 1.25rem',
            fontFamily: 'var(--display-font)',
            fontSize: '14px',
            letterSpacing: '0.1em',
            fontWeight: '600',
            marginTop: '0.25rem',
            backgroundColor: 'var(--color-primary)',
            color: '#FFFFFF',
            borderRadius: '8px',
            opacity: canSubmit ? 1 : 0.48,
            cursor: canSubmit ? 'pointer' : 'not-allowed'
          }}
        >
          {status === 'loading' ? 'SUBSCRIBING...' : 'JOIN THE MOVEMENT'}
        </button>
        <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          By subscribing, you agree to receive email updates from Living the Charge.
        </p>
      </form>

      <style>{`
        .email-capture-box input:hover {
          border-color: var(--color-border) !important;
        }
        .email-capture-box input:focus {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(31, 58, 110, 0.08);
        }
        @media (max-width: 800px) {
          .email-capture-box {
            grid-template-columns: 1fr !important;
          }
          .newsletter-intro {
            border-right: 0 !important;
            border-bottom: 1px solid var(--color-border);
          }
        }
        @media (max-width: 520px) {
          .newsletter-intro,
          .email-capture-box form { padding: 2rem 1.25rem !important; }
          .newsletter-intro h3 { font-size: clamp(2rem, 10vw, 2.65rem) !important; }
          .email-capture-box { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  minHeight: '52px',
  padding: '0.9rem 1.1rem',
  fontSize: '15px',
  fontFamily: 'var(--body-font)',
  border: '1.5px solid var(--color-border)',
  backgroundColor: '#FAF9F6',
  color: 'var(--color-primary)',
  borderRadius: '8px',
  outline: 'none',
  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
};
