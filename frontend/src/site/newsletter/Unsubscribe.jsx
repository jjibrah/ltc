import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

export default function Unsubscribe() {
  const { token } = useParams();
  const [status, setStatus] = useState(() => token ? 'loading' : 'error'); // 'loading' | 'success' | 'already' | 'error'

  useEffect(() => {
    if (!token) return;
    apiRequest(endpoints.unsubscribe(token))
      .then((data) => setStatus(data.message?.includes('already') ? 'already' : 'success'))
      .catch(() => setStatus('error'));
  }, [token]);

  const cfg = {
    loading: { icon: '⏳', title: 'Processing…', body: 'Please wait a moment.', color: '#94a3b8' },
    success: { icon: '✅', title: "You've been unsubscribed", body: "You won't receive any more newsletters from Living the Charge. We're sorry to see you go.", color: '#D4A96A' },
    already:  { icon: '👍', title: 'Already unsubscribed', body: "You're already off our mailing list. No further action needed.", color: '#D4A96A' },
    error:   { icon: '⚠️', title: 'Invalid link', body: 'This unsubscribe link is not valid or has already been used. If you need help, contact us directly.', color: '#E8593C' },
  }[status];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', padding: '2rem' }}>
      <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
        {/* Logo */}
        <img
          src="https://res.cloudinary.com/dteql91nj/image/upload/v1784011541/logo_v52jvx.webp"
          alt="Living the Charge"
          style={{ width: '72px', height: '72px', objectFit: 'contain', marginBottom: '2rem', display: 'block', margin: '0 auto 2rem' }}
        />

        {/* Card */}
        <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{cfg.icon}</div>
          <h2 style={{ fontFamily: 'var(--font-primary)', fontStyle: 'italic', color: cfg.color, margin: '0 0 1rem', fontSize: '1.6rem' }}>
            {cfg.title}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
            {cfg.body}
          </p>
        </div>

        <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '1.5rem' }}>
          © 2026 Living the Charge
        </p>
      </div>
    </div>
  );
}
