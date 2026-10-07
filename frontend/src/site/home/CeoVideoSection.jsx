import ScrollReveal from '../../shared/components/feedback/ScrollReveal';

export default function CeoVideoSection() {
  return (
    <section 
      aria-labelledby="team-video-title"
      className="ceo-video-section"
      style={{
        paddingBlock: 'clamp(88px, 10vw, 140px)',
        background: 'var(--color-bg)',
      }}
    >
      <div className="container" style={{ maxWidth: '850px', textAlign: 'center', marginBottom: '3.5rem' }}>
        <ScrollReveal>
          <span style={{
            display: 'block',
            fontFamily: 'var(--display-font)',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: 'var(--color-text-muted)',
            marginBottom: '1rem',
          }}>
            A message from the team
          </span>
          <h2 id="team-video-title" style={{
            fontFamily: 'var(--display-font)',
            fontSize: 'clamp(2.4rem, 4.5vw, 4.25rem)',
            fontWeight: 'bold',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Why we chose to build Living the Charge.
          </h2>
        </ScrollReveal>
      </div>

      <ScrollReveal delay="0.15s">
        <div style={{
          width: 'min(calc(100% - 48px), 1100px)',
          aspectRatio: '16 / 9',
          marginInline: 'auto',
          overflow: 'hidden',
          borderRadius: '4px',
          border: '1px solid var(--color-border)',
          background: '#222222',
        }}>
          <iframe 
            src="https://www.youtube.com/embed/8FRgRVrM26Y?start=82&rel=0"
            title="Why we chose to build Living the Charge" 
            loading="lazy" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            referrerPolicy="strict-origin-when-cross-origin" 
            allowFullScreen 
            style={{
              width: '100%',
              height: '100%',
              border: 0,
            }}
          />
        </div>
      </ScrollReveal>
      <style>{`
        @media (max-width: 768px) {
          .ceo-video-section { padding-block: 72px !important; }
          .ceo-video-section > .container { margin-bottom: 2.5rem !important; }
        }
        @media (max-width: 520px) {
          .ceo-video-section { padding-block: 60px !important; }
          .ceo-video-section > .container { margin-bottom: 2rem !important; }
          .ceo-video-section iframe { min-height: 0; }
        }
      `}</style>
    </section>
  );
}
