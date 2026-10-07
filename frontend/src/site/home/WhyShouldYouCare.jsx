import { Link } from 'react-router-dom';
import ScrollReveal from '../../shared/components/feedback/ScrollReveal';

export default function WhyShouldYouCare() {
  return (
    <section 
      id="impact"
      className="why-care-section"
      aria-labelledby="why-care-title"
      style={{
        paddingBlock: 'clamp(100px, 11vw, 160px)',
        background: '#FFFFFF',
        color: 'var(--text-primary)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="container why-care-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gridTemplateRows: 'auto auto',
        columnGap: 'clamp(64px, 8vw, 120px)',
        rowGap: '0',
        alignItems: 'center',
      }}>
        {/* Intro */}
        <ScrollReveal style={{ gridColumn: 1 }}>
          <h2 id="why-care-title" style={{
            maxWidth: '700px',
            fontFamily: 'var(--display-font)',
            fontSize: 'clamp(2.4rem, 4.5vw, 4.25rem)',
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: '-0.045em',
            color: '#1E1F33',
            marginBottom: '1.5rem',
          }}>
            The power of your donation.
          </h2>
          <p style={{
            maxWidth: '560px',
            fontFamily: 'var(--body-font)',
            fontSize: '1.05rem',
            lineHeight: 1.65,
            color: 'var(--text-secondary)',
            marginBottom: '0.75rem',
          }}>
            Imagine having all the talent in the world but no avenue to express it! That is the reality that we grew up in while we were in Kenya, and we seek to make a difference for those that come after us.
          </p>
          <p style={{
            maxWidth: '560px',
            fontFamily: 'var(--body-font)',
            fontSize: '1.05rem',
            lineHeight: 1.65,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            Every contribution creates generational and sustainable impact that truly lasts a lifetime.
          </p>

          <div style={{ marginTop: '2.5rem' }}>
            <Link
              to="/stories"
              className="why-care-cta-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'var(--display-font)',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                textDecoration: 'none',
                borderBottom: '1.5px solid var(--color-secondary)',
                paddingBottom: '4px',
                transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              Read the full stories of our students
            </Link>
          </div>
        </ScrollReveal>

        {/* Impact figures */}
        <div className="why-care-figures" style={{
          gridColumn: 2,
          gridRow: '1 / span 2',
          borderTop: '1px solid var(--color-border)',
        }}>
          <ScrollReveal delay="0.15s">
            <article className="why-care-figure" style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(150px, 200px) 1fr',
              gap: '36px',
              alignItems: 'center',
              padding: '2.5rem 0',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'grid', gap: '8px' }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                }}>
                  01 / Immediate impact
                </span>
                <strong style={{
                  fontFamily: 'var(--display-font)',
                  fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                  fontWeight: 700,
                  lineHeight: 0.86,
                  color: '#1E1F33',
                }}>
                  $42
                </strong>
              </div>
              <p style={{
                fontSize: '1rem',
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                margin: 0,
              }}>
                Supports a bright but financially fragile student for a year.
              </p>
            </article>
          </ScrollReveal>

          <ScrollReveal delay="0.3s">
            <article className="why-care-figure" style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(150px, 200px) 1fr',
              gap: '36px',
              alignItems: 'center',
              padding: '2.5rem 0',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'grid', gap: '8px' }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                }}>
                  02 / Lasting impact
                </span>
                <strong style={{
                  fontFamily: 'var(--display-font)',
                  fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                  fontWeight: 700,
                  lineHeight: 0.86,
                  color: '#1E1F33',
                }}>
                  $420
                </strong>
              </div>
              <p style={{
                fontSize: '1rem',
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                margin: 0,
              }}>
                Supports one student annually in perpetuity through the endowment.
              </p>
            </article>
          </ScrollReveal>
        </div>
      </div>

      <style>{`
        .why-care-cta-link:hover {
          color: var(--color-secondary) !important;
        }
        .why-care-cta-link:hover .cta-arrow {
          transform: translateX(4px);
        }
        @media (max-width: 900px) {
          .why-care-section { padding-block: 76px !important; }
          .why-care-grid {
            grid-template-columns: 1fr !important;
            row-gap: 3rem !important;
          }
          .why-care-figures {
            grid-column: 1 !important;
            grid-row: auto !important;
          }
          .why-care-figure {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
        @media (max-width: 520px) {
          .why-care-section { padding-block: 60px !important; }
          .why-care-grid { row-gap: 2.5rem !important; }
          .why-care-cta-btn { width: 100%; justify-content: center; }
          .why-care-figure { padding-block: 1.75rem !important; }
        }
      `}</style>
    </section>
  );
}
