import ScrollReveal from '../../shared/components/feedback/ScrollReveal';

export default function WhatIsLTC() {
  return (
    <section className="what-is-ltc" style={{
      paddingBlock: 'clamp(88px, 10vw, 140px)',
      background: 'var(--color-bg)',
    }}>
      <div className="container what-is-ltc__grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)',
        gridTemplateRows: 'auto auto',
        gap: '56px clamp(48px, 6vw, 90px)',
        alignItems: 'stretch',
      }}>

        {/* Intro — left column, top row */}
        <div style={{ alignSelf: 'end' }}>
          <ScrollReveal>
            <span style={{
              fontFamily: 'var(--display-font)',
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'var(--color-secondary)',
              marginBottom: '1.5rem',
            }}>What we do</span>
            <h2 style={{
              fontFamily: 'var(--display-font)',
              maxWidth: '650px',
              fontSize: 'clamp(2rem, 3.5vw, 3.5rem)',
              fontWeight: 700,
              lineHeight: 0.98,
              letterSpacing: '-0.035em',
              color: '#000000',
            }}>
              Bridging the gap between<br />talent and opportunity.
            </h2>
            <p style={{
              maxWidth: '600px',
              marginTop: '24px',
              fontFamily: 'var(--body-font)',
              fontSize: '1.1rem',
              lineHeight: 1.65,
              color: 'var(--color-text-muted)',
            }}>
              Living the Charge is a US-registered 501(c)(3) nonprofit working to bridge the gap between talent and opportunity. We believe every talented Kenyan student deserves the chance to pursue experiences that can shape their future, regardless of their financial circumstances.
            </p>
            <p style={{
              maxWidth: '600px',
              marginTop: '16px',
              fontFamily: 'var(--body-font)',
              fontSize: '1.1rem',
              lineHeight: 1.65,
              color: 'var(--color-text-muted)',
            }}>
              Through our <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>$100,000 endowment</strong>, we seek to support <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>250 high school students</strong> annually in pursuing meaningful internships and volunteer opportunities turning potential into possibility and opportunity into lasting impact.
            </p>
          </ScrollReveal>
        </div>

        {/* Images — right column (2 photos stacked vertically in a column) */}
        <ScrollReveal delay="0.15s" style={{
          gridColumn: 2,
          gridRow: '1 / span 2',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '10px',
          height: 'auto',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: '0 0 auto',
            minHeight: 0,
          }}>
            <div className="what-is-ltc__image" style={{
              flex: 1,
              minHeight: '260px',
              maxHeight: '340px',
              overflow: 'hidden',
              borderRadius: '4px',
            }}>
              <img
                src="/images/DSC_1530.JPG"
                alt="Students participating in program"
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  transition: 'transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
            </div>

            <div className="what-is-ltc__image" style={{
              flex: 1,
              minHeight: '260px',
              maxHeight: '340px',
              overflow: 'hidden',
              borderRadius: '4px',
            }}>
              <img  
                src="/DSC_1830.JPG"
                alt="Living the Charge students"
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  transition: 'transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
            </div>
          </div>

          <div className="what-is-ltc__caption" style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            marginTop: 0,
            paddingTop: '10px',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.78rem',
            letterSpacing: '0.04em',
            color: 'var(--color-text-muted)',
          }}>
            <span>Cost should never be a barrier to opportunity.</span>
            <span style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Kenya / 2026</span>
          </div>
        </ScrollReveal>

        {/* Endowment Model — left column, bottom row */}
        <ScrollReveal delay="0.2s" style={{ gridColumn: 1, alignSelf: 'start' }}>
          <div className="what-is-ltc__metric" style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '24px',
            margin: '8px 0 36px',
          }}>
            <span style={{ alignSelf: 'center', width: '28px', height: '2px', marginRight: '4px', background: 'var(--color-secondary)' }} />
            <strong style={{
              fontFamily: 'var(--display-font)',
              fontSize: 'clamp(3.5rem, 5vw, 5.5rem)',
              fontWeight: 700,
              lineHeight: 0.9,
              color: '#1E1F33',
            }}>$100K+</strong>
            <span style={{
              maxWidth: '92px',
              fontSize: '0.72rem',
              fontWeight: 700,
              lineHeight: 1.35,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
            }}>Endowment target</span>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="endowment-steps" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              margin: 0,
              padding: 0,
            }}>
              {[
                { num: '01', title: 'Build the fund', desc: 'Contributions grow the permanent endowment.' },
                { num: '02', title: 'Generate returns', desc: 'Long-term investment supports 250 students annually.' },
                { num: '03', title: 'Fund opportunities', desc: 'Proceeds cater for food, transport and liability insurance expenses.' },
              ].map((step, i) => (
                <div key={step.num} style={{
                  display: 'grid',
                  gridTemplateRows: 'auto auto 1fr',
                  gap: '12px',
                  padding: `22px ${i < 2 ? '28px' : '0'} 0 ${i > 0 ? '28px' : '0'}`,
                  borderLeft: i > 0 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--color-secondary)',
                  }}>{step.num}</span>
                  <strong style={{
                    display: 'block',
                    fontFamily: 'var(--display-font)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}>{step.title}</strong>
                  <p style={{
                    marginTop: '8px',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    color: 'var(--color-text-muted)',
                  }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .what-is-ltc { padding-block: 76px !important; }
          .what-is-ltc__grid {
            grid-template-columns: 1fr !important;
            gap: 44px !important;
          }
          .what-is-ltc__grid > *:nth-child(2) {
            grid-column: 1 !important;
            grid-row: auto !important;
          }
          .endowment-steps {
            grid-template-columns: 1fr !important;
          }
          .endowment-steps > div {
            padding: 18px 0 !important;
            border-left: 0 !important;
            border-bottom: 1px solid var(--color-border);
          }
        }
        @media (max-width: 520px) {
          .what-is-ltc { padding-block: 60px !important; }
          .what-is-ltc__grid { gap: 34px !important; }
          .what-is-ltc__image { min-height: 210px !important; max-height: 250px !important; }
          .what-is-ltc__caption { display: grid !important; gap: 6px !important; }
          .what-is-ltc__metric { align-items: center !important; gap: 14px !important; margin-bottom: 24px !important; }
          .what-is-ltc__metric > span:first-child { display: none; }
          .what-is-ltc__metric strong { font-size: 3rem !important; }
        }
      `}</style>
    </section>
  );
}
