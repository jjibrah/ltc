import { useEffect, useRef } from 'react';

export default function TeamModal({ member, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!member) return undefined;

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [member, onClose]);

  if (!member) return null;

  const imageUrl = typeof member.image === 'string' ? member.image : member.image?.previewUrl;

  const initials = member.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return (
    <div
      className="team-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1rem, 4vw, 2rem)',
        background: 'rgba(8, 15, 25, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'teamModalFadeIn 240ms ease-out both',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="team-modal-container"
        style={{
          position: 'relative',
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 38%) minmax(0, 62%)',
          width: 'min(1080px, calc(100vw - 96px))',
          maxWidth: '1080px',
          maxHeight: 'min(700px, calc(100dvh - 72px))',
          overflow: 'hidden',
          border: '1px solid rgba(20, 30, 50, 0.08)',
          borderRadius: '24px',
          background: '#FAF9F6',
          boxShadow: '0 30px 90px rgba(7, 16, 31, 0.24)',
          animation: 'teamModalRise 260ms ease-out both',
        }}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 3,
            width: '44px',
            height: '44px',
            display: 'grid',
            placeItems: 'center',
            border: '1px solid rgba(23, 59, 112, 0.12)',
            borderRadius: '50%',
            background: 'rgba(250, 249, 246, 0.9)',
            color: 'var(--color-primary)',
            fontSize: '1.5rem',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'background 180ms ease, transform 180ms ease',
          }}
        >
          ×
        </button>

        <div className="team-modal-image-column" style={{
          minHeight: '580px',
          overflow: 'hidden',
          background: '#EEEAE4',
        }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${member.name}, ${member.role}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', filter: 'saturate(0.94) contrast(1.02)' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              alignContent: 'center',
              gap: '0.75rem',
              background: 'linear-gradient(145deg, #ebe7df, #dcd7cf)',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-primary)',
              fontSize: '4.5rem',
            }}>
              <span>{initials}</span>
              <small style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Portrait pending</small>
            </div>
          )}
        </div>

        <div className="team-modal-content-panel" style={{ minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: 'clamp(2.5rem, 5vw, 3.5rem) clamp(2rem, 5vw, 4rem) 3rem' }}>
          <span style={{ display: 'block', marginBottom: '18px', color: 'var(--color-secondary)', fontFamily: 'var(--team-display-font)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {member.department}
          </span>
          <h2 id="team-modal-title" style={{ margin: 0, maxWidth: '600px', color: 'var(--color-primary)', fontFamily: 'var(--team-display-font)', fontSize: 'clamp(2.5rem, 4vw, 3.3rem)', fontWeight: 600, lineHeight: 1, letterSpacing: '-0.035em' }}>
            {member.name}
          </h2>
          <p style={{ margin: '14px 0 0', color: 'var(--color-text)', fontFamily: 'var(--team-display-font)', fontSize: '17px', fontWeight: 500, lineHeight: 1.4 }}>
            {member.role}
          </p>
          {member.quote && (
            <blockquote style={{ margin: '36px 0', maxWidth: '600px', borderLeft: '2px solid var(--color-secondary)', paddingLeft: '22px', color: 'var(--color-primary)', fontFamily: 'var(--editorial-serif)', fontSize: 'clamp(1.15rem, 1.5vw, 1.3rem)', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.55 }}>
              “{member.quote}”
            </blockquote>
          )}

          {member.bio && (
            <div style={{ maxWidth: '610px' }}>
              <h3 style={{ margin: '0 0 0.7rem', color: 'var(--color-primary)', fontFamily: 'var(--team-display-font)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                About
              </h3>
              <p style={{ margin: 0, color: '#55585C', fontFamily: 'var(--font-body)', fontSize: '16px', lineHeight: 1.7, maxWidth: '610px' }}>
                {member.bio}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes teamModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes teamModalRise { from { opacity: 0; transform: translateY(8px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .team-modal-container > button:hover,
        .team-modal-container > button:focus-visible {
          background: #FFFFFF !important;
          transform: scale(1.04);
          outline: 2px solid rgba(23, 59, 112, 0.22);
          outline-offset: 2px;
        }
        @media (max-width: 768px) {
          .team-modal-container { display: flex !important; flex-direction: column !important; width: calc(100vw - 20px) !important; max-height: calc(100dvh - 20px) !important; overflow: hidden !important; }
          .team-modal-image-column { min-height: 280px !important; height: min(340px, 40vh) !important; max-height: 40vh; flex: 0 0 auto; }
          .team-modal-content-panel { min-height: 0 !important; max-height: calc(100dvh - 320px) !important; flex: 1 1 auto; overflow-y: auto !important; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 2.5rem 1.5rem 2rem !important; }
        }
        @media (max-width: 430px) {
          .team-modal-image-column { min-height: 240px !important; height: 32vh !important; }
          .team-modal-content-panel { max-height: calc(100dvh - 280px) !important; padding: 2rem 1.25rem 1.75rem !important; }
          .team-modal-content-panel h2 { font-size: clamp(2rem, 10vw, 2.65rem) !important; }
          .team-modal-content-panel blockquote { margin-block: 28px !important; padding-left: 16px !important; }
        }
        @media (min-width: 769px) and (max-width: 1000px) {
          .team-modal-container { grid-template-columns: minmax(300px, 40%) minmax(0, 60%) !important; width: calc(100vw - 48px) !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .team-modal-backdrop, .team-modal-container { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
