import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="grain-overlay site-footer"
      style={{
        backgroundColor: 'var(--color-bg-deep)',
        color: 'rgba(250, 248, 245, 0.8)',
        borderTop: '1px solid rgba(226, 217, 208, 0.1)',
        padding: '5rem 0 3rem',
        marginTop: 0,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div className="container" style={{ position: 'relative', zIndex: 3 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr',
          gap: '4rem',
          marginBottom: '4rem'
        }} className="footer-grid">
          
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <img 
                src="/images/nobglogo.png" 
                alt="Living the Charge Logo" 
                style={{ width: '100px', height: '100px', objectFit: 'contain' }} 
              />
              <span style={{
                fontFamily: 'var(--display-sans)',
                fontSize: '18px',
                fontWeight: 'bold',
                letterSpacing: '-0.01em',
                color: '#FFFFFF'
              }}>
                LIVING THE CHARGE
              </span>
            </div>
            <p style={{ 
              fontSize: '15px', 
              lineHeight: '1.6', 
              color: 'rgba(250, 248, 245, 0.65)', 
              maxWidth: '320px',
              marginBottom: '1.5rem'
            }}>
              We are fundraising $100,000 to give talented high school students access to internships and volunteer opportunities without cost becoming a barrier.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 style={{
              fontFamily: 'var(--display-sans)',
              fontSize: '18px',
              color: '#FFFFFF',
              marginBottom: '1.25rem',
              fontWeight: '600'
            }}>
              Navigation
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link to="/" style={linkStyle}>Home</Link></li>
              <li><Link to="/stories" style={linkStyle}>Student Stories</Link></li>
              <li><Link to="/team" style={linkStyle}>Our Team</Link></li>
              <li><Link to="/donate" style={linkStyle}>Donate</Link></li>
              <li><Link to="/login" style={{...linkStyle, opacity: 0.5}}>LTC</Link></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 style={{
              fontFamily: 'var(--display-sans)',
              fontSize: '18px',
              color: '#FFFFFF',
              marginBottom: '1.25rem',
              fontWeight: '600'
            }}>
              Contact
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '15px', color: 'rgba(250, 248, 245, 0.65)' }}>
              <li>
                <a href="mailto:hello@livingthecharge.org" style={linkStyle}>
                  hello@livingthecharge.org
                </a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 style={{
              fontFamily: 'var(--display-sans)',
              fontSize: '18px',
              color: '#FFFFFF',
              marginBottom: '1.25rem',
              fontWeight: '600'
            }}>
              Follow
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>
                <a href="https://linkedin.com/company/livingthecharge" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  LinkedIn ↗
                </a>
              </li>
              <li>
                <a href="https://instagram.com/livingthecharge" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  Instagram ↗
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/watch?v=8FRgRVrM26Y" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  YouTube ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright area */}
        <div style={{
          borderTop: '1px solid rgba(226, 217, 208, 0.1)',
          paddingTop: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          color: 'rgba(250, 248, 245, 0.5)'
        }} className="footer-bottom">
          <span>&copy; {currentYear} Living the Charge. All rights reserved.</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1.5fr 1fr 1fr 1fr !important;
            gap: 2rem !important;
          }
        }
        @media (max-width: 768px) {
          .site-footer { padding: 4rem 0 2rem !important; }
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 2.25rem !important;
            margin-bottom: 3rem !important;
          }
          .footer-bottom {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }
        @media (max-width: 430px) {
          .site-footer { padding: 3.25rem 0 1.5rem !important; }
          .footer-grid { gap: 2rem !important; margin-bottom: 2.5rem !important; }
        }
      `}</style>
    </footer>
  );
}

const linkStyle = {
  color: 'rgba(250, 248, 245, 0.75)',
  textDecoration: 'none',
  fontSize: '15px',
  transition: 'color var(--transition-fast)',
  borderBottom: '1px solid transparent',
  paddingBottom: '2px'
};

// Inject hover styling using CSS classes if necessary, or just inline.
// Since inline styles cannot do :hover, we can use simple standard selectors.
// We'll hook into a custom stylesheet or the global system:
// Adding class="editorial-link-footer" and using standard styling:
// We can define it in the global CSS or inline-styles. In our globals.css we support a.editorial-link.
// For footer links, they are light on dark.
// Let's use simple CSS hover rule inject:
if (typeof document !== 'undefined') {
  const styleId = 'footer-links-hover-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .footer-grid a:hover {
        color: var(--color-secondary) !important;
        border-bottom-color: var(--color-secondary) !important;
      }
    `;
    document.head.appendChild(style);
  }
}
