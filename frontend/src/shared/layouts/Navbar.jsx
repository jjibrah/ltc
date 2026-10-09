import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setIsMobileOpen(false); }, [location]);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMobileOpen]);

  // Color dynamics based on scroll state
  const hasLightNav = isScrolled || isMobileOpen;
  const logoTextColor = hasLightNav ? '#1D1D31' : '#FFFFFF';
  const navLinkColor = (isActive) => {
    if (isScrolled) return isActive ? '#E8593C' : '#1C1C1C';
    return isActive ? '#D4A96A' : '#FFFFFF';
  };
  const donateBg = isScrolled ? '#1F3A6E' : '#FFFFFF';
  const donateColor = isScrolled ? '#FFFFFF' : '#1A1A2E';

  return (
    <>
      <header style={{
        position: 'fixed',
        top: isScrolled ? '8px' : '14px',
        left: 0,
        width: '100%',
        zIndex: 999,
        transition: 'top 0.3s cubic-bezier(0.2, 0.7, 0.2, 1)',
        pointerEvents: 'none',
      }}>
        <nav className="container navbar-surface" style={{
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingInline: '14px',
          borderRadius: '4px',
          background: hasLightNav
            ? 'rgba(250, 249, 246, 0.84)'
            : 'transparent',
          border: hasLightNav
            ? '1px solid rgba(255, 255, 255, 0.52)'
            : '1px solid transparent',
          boxShadow: hasLightNav
            ? '0 12px 38px rgba(12, 18, 30, 0.10)'
            : 'none',
          backdropFilter: hasLightNav ? 'blur(24px) saturate(150%)' : 'none',
          WebkitBackdropFilter: hasLightNav ? 'blur(24px) saturate(150%)' : 'none',
          transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease, backdrop-filter 0.35s ease',
          pointerEvents: 'auto',
        }} aria-label="Primary navigation">

          {/* Logo */}
          <Link to="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }} aria-label="Living the Charge Home">
            <img 
              src={hasLightNav ? '/brand/ltc-logo-navy.svg' : '/brand/ltc-logo-white.svg'}
              alt="" 
              style={{ width: '42px', height: '42px', objectFit: 'contain' }} 
            />
            <span style={{
              fontSize: '0.72rem',
              lineHeight: 1.05,
              textTransform: 'uppercase',
              maxWidth: '78px',
              color: logoTextColor,
              fontWeight: 700,
              transition: 'color 0.35s ease',
            }}>
              Living the Charge
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="desktop-only" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}>
            {[['/', 'Home', true], ['/stories', 'Stories'], ['/mission', 'Mission'], ['/impact', 'Impact'], ['/team', 'Team'], ['/mentor', 'Mentor']].map(([path, label, isEnd]) => (
              <NavLink 
                key={path} 
                to={path} 
                end={isEnd} 
                className="compact-nav-link" 
                style={({ isActive }) => ({
                  fontSize: '0.86rem',
                  fontWeight: isActive ? 700 : 600,
                  color: navLinkColor(isActive),
                  textDecoration: 'none',
                  transition: 'color 0.35s ease',
                })}
              >
                {label}
              </NavLink>
            ))}

            <Link
              to="/donate"
              style={{
                display: 'inline-flex',
                minHeight: '36px',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 16px',
                color: donateColor,
                background: donateBg,
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.84rem',
                textDecoration: 'none',
                transition: 'transform 0.2s, background-color 0.35s ease, color 0.35s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                if (isScrolled) {
                  e.currentTarget.style.backgroundColor = '#E8593C';
                } else {
                  e.currentTarget.style.backgroundColor = '#f7f5ef';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.backgroundColor = donateBg;
              }}
            >
              Donate
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsMobileOpen((open) => !open)}
            className="mobile-toggle-btn"
            style={{
              display: 'none',
              width: '42px',
              height: '42px',
              background: hasLightNav ? 'rgba(29, 29, 49, 0.05)' : 'rgba(255, 255, 255, 0.08)',
              border: hasLightNav ? '1px solid rgba(29, 29, 49, 0.14)' : '1px solid rgba(255, 255, 255, 0.26)',
              borderRadius: '4px',
              cursor: 'pointer',
              color: hasLightNav ? '#1D1D31' : '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.35s ease, background 0.35s ease',
            }}
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </nav>
      </header>

      {isMobileOpen && (
        <div className="mobile-menu-layer" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsMobileOpen(false);
        }}>
          <nav id="mobile-navigation" className="mobile-menu-dropdown" aria-label="Mobile navigation">
            <div className="mobile-menu-links">
              {[['/', 'Home'], ['/stories', 'Stories'], ['/mission', 'Mission'], ['/impact', 'Impact'], ['/team', 'Team'], ['/mentor', 'Mentorship']].map(([path, label]) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) => `mobile-menu-link${isActive ? ' is-active' : ''}`}
                >
                  {label}
                </NavLink>
              ))}
            </div>
            <Link to="/donate" className="mobile-menu-donate" onClick={() => setIsMobileOpen(false)}>
              Donate
            </Link>
          </nav>
        </div>
      )}
      <style>{`
        .compact-nav-link:hover {
          opacity: 1 !important;
          color: #E8593C !important;
        }
        .mobile-menu-layer {
          position: fixed;
          inset: 0;
          z-index: 998;
          padding: 90px max(12px, calc((100vw - 1200px) / 2)) 20px;
          background:
            radial-gradient(circle at 78% 10%, rgba(255,255,255,.16), transparent 34%),
            rgba(8, 15, 25, .34);
          backdrop-filter: blur(12px) saturate(115%);
          -webkit-backdrop-filter: blur(12px) saturate(115%);
          animation: mobileMenuBackdropIn .18s ease both;
        }
        .mobile-menu-dropdown {
          width: 100%;
          max-height: calc(100dvh - 110px);
          overflow-y: auto;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.64);
          border-radius: 4px;
          background: linear-gradient(145deg, rgba(255,255,255,.92), rgba(246,244,239,.80));
          box-shadow: 0 24px 70px rgba(7,16,31,.22), inset 0 1px 0 rgba(255,255,255,.72);
          backdrop-filter: blur(30px) saturate(165%);
          -webkit-backdrop-filter: blur(30px) saturate(165%);
          animation: mobileMenuDropIn .22s cubic-bezier(.2,.75,.25,1) both;
        }
        .mobile-menu-links {
          display: grid;
        }
        .mobile-menu-link {
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 16px;
          padding: 0 12px;
          border-bottom: 1px solid rgba(29,29,49,.10);
          color: #555765;
          font-family: var(--display-sans);
          font-size: 1rem;
          font-weight: 500;
          text-decoration: none;
          transition: color .18s ease, background .18s ease;
        }
        .mobile-menu-link:hover,
        .mobile-menu-link:focus-visible,
        .mobile-menu-link.is-active {
          background: rgba(29,29,49,.045);
          color: #1D1D31;
          outline: none;
        }
        .mobile-menu-link:focus-visible {
          box-shadow: inset 0 0 0 2px rgba(29,29,49,.32);
        }
        .mobile-menu-link.is-active {
          font-weight: 650;
        }
        .mobile-menu-donate {
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
          padding: 0 16px;
          border-radius: 4px;
          background: #1D1D31;
          color: #fff;
          font-family: var(--display-sans);
          font-size: .92rem;
          font-weight: 600;
          text-decoration: none;
          transition: background .18s ease;
        }
        .mobile-menu-donate:hover,
        .mobile-menu-donate:focus-visible {
          background: #29283D;
          outline: 2px solid rgba(255,255,255,.72);
          outline-offset: -4px;
        }
        @keyframes mobileMenuBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mobileMenuDropIn {
          from { opacity: 0; transform: translateY(-10px) scale(.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 768px) {
          .navbar-surface { width: calc(100% - 24px) !important; }
          .mobile-toggle-btn { display: inline-flex !important; }
        }
        @media (max-width: 420px) {
          .mobile-menu-layer { padding-top: 86px; }
          .mobile-menu-dropdown { padding: 10px; }
          .mobile-menu-link { min-height: 49px; font-size: .95rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mobile-menu-layer,
          .mobile-menu-dropdown { animation: none; }
          .mobile-menu-link { transition: none; }
        }
      `}</style>
    </>
  );
}
