/**
 * Compact portrait directory card. Detailed biography and quotes live in TeamModal.
 */
export default function TeamCard({ member, onClick, isLeadership = false }) {
  const imageUrl = typeof member.image === 'string' ? member.image : member.image?.previewUrl;
  const initials = member.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className="team-card"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View profile for ${member.name}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '320 / 410',
        overflow: 'hidden',
        borderRadius: '14px',
        border: '1px solid rgba(29, 29, 49, 0.12)',
        background: '#EEEAE4',
        cursor: 'pointer',
        isolation: 'isolate',
        transition: 'transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
      }}
    >
      <div className="team-card-media" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${member.name}, ${member.role}`}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: member.objectPosition || 'center top',
              filter: 'saturate(0.94) contrast(1.02)',
              transition: 'transform 260ms ease, filter 260ms ease',
            }}
          />
        ) : (
          <div
            aria-label={`${member.name} photo unavailable`}
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              alignContent: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(145deg, #ebe7df, #dcd7cf)',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-primary)',
              fontSize: '3.2rem',
            }}
          >
            <span>{initials}</span>
            <small style={{
              fontFamily: 'var(--font-body)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
            }}>
              Portrait pending
            </small>
          </div>
        )}
      </div>

      <div className="team-card-shade" aria-hidden="true" style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        background: 'linear-gradient(180deg, rgba(5, 18, 33, 0.02) 35%, rgba(5, 18, 33, 0.72) 100%)',
        pointerEvents: 'none',
      }} />

      <div className="team-card-panel" style={{
        position: 'absolute',
        left: '17px',
        right: '17px',
        bottom: '17px',
        zIndex: 2,
        minHeight: '108px',
        padding: '15px 15px 14px',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'start',
        gap: '10px',
        border: '1px solid rgba(255, 255, 255, 0.22)',
        borderRadius: '10px',
        background: 'rgba(29, 29, 49, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: 'none',
        transition: 'background 220ms ease, border-color 220ms ease',
      }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{
            margin: 0,
            color: '#FFFFFF',
            fontFamily: 'var(--team-display-font)',
            fontSize: isLeadership ? '22px' : '20px',
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            {member.name}
          </h3>
          <p style={{
            margin: '7px 0 0',
            color: 'rgba(255, 255, 255, 0.9)',
            fontFamily: 'var(--team-display-font)',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {member.role}
          </p>
          <span style={{
            display: 'block',
            marginTop: '8px',
            color: 'rgba(255, 255, 255, 0.68)',
            fontFamily: 'var(--team-display-font)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            lineHeight: 1,
            textTransform: 'uppercase',
          }}>
            {member.department}
          </span>
        </div>
      </div>

      <style>{`
        .team-card:hover,
        .team-card:focus-visible {
          border-color: rgba(29, 29, 49, 0.34) !important;
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(29, 29, 49, 0.08);
        }
        .team-card:focus-visible {
          outline: 3px solid rgba(29, 29, 49, 0.35);
          outline-offset: 3px;
        }
        .team-card:hover .team-card-media img,
        .team-card:focus-visible .team-card-media img {
          transform: scale(1.018);
          filter: saturate(0.98) contrast(1.03);
        }
        .team-card:hover .team-card-panel,
        .team-card:focus-visible .team-card-panel {
          background: rgba(29, 29, 49, 0.82);
          border-color: rgba(255, 255, 255, 0.34);
        }
        @media (max-width: 430px) {
          .team-card-panel {
            left: 12px !important;
            right: 12px !important;
            bottom: 12px !important;
            min-height: 100px !important;
            padding: 13px !important;
          }
          .team-card-panel h3 { font-size: 19px !important; }
          .team-card-panel p { font-size: 13px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .team-card,
          .team-card-media img,
          .team-card-panel,
        }
      `}</style>
    </article>
  );
}
