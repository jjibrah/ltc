import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  { fallback: '/images/CMT00586.JPG', optimized: 'hero-1' },
  { fallback: '/images/CMT00693.JPG', optimized: 'hero-2' },
  { fallback: '/images/DSC_1639.JPG', optimized: 'hero-3' },
  { fallback: '/images/DSC_1999.JPG', optimized: 'hero-4' },
];

const HERO_IMAGE_WIDTHS = [640, 960, 1600, 1920];
const HERO_IMAGE_PATH = '/images/optimized/home-hero';

function responsiveSource(slide, extension) {
  return HERO_IMAGE_WIDTHS
    .map((width) => `${HERO_IMAGE_PATH}/${slide.optimized}-${width}.${extension} ${width}w`)
    .join(', ');
}

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [loadedSlides, setLoadedSlides] = useState(() => new Set());
  const preloadedSlides = useRef(new Set());
  const preloadNodes = useRef([]);

  const revealSlide = (index, image) => {
    const reveal = () => {
      setLoadedSlides((current) => {
        if (current.has(index)) return current;
        const next = new Set(current);
        next.add(index);
        return next;
      });
    };

    if (typeof image.decode === 'function') {
      image.decode().then(reveal).catch(reveal);
      return;
    }
    reveal();
  };

  const preloadSlide = (index) => {
    if (index < 0 || index >= slides.length || preloadedSlides.current.has(index)) return;

    const slide = slides[index];
    const picture = document.createElement('picture');
    const avif = document.createElement('source');
    const webp = document.createElement('source');
    const image = new Image();

    avif.type = 'image/avif';
    avif.sizes = '100vw';
    avif.srcset = responsiveSource(slide, 'avif');
    webp.type = 'image/webp';
    webp.sizes = '100vw';
    webp.srcset = responsiveSource(slide, 'webp');
    image.src = slide.fallback;
    image.srcset = responsiveSource(slide, 'webp');
    image.sizes = '100vw';
    image.loading = 'eager';
    image.decoding = 'async';
    image.fetchPriority = 'low';

    picture.append(avif, webp, image);
    picture.setAttribute('aria-hidden', 'true');
    picture.style.position = 'absolute';
    picture.style.width = '1px';
    picture.style.height = '1px';
    picture.style.overflow = 'hidden';
    picture.style.opacity = '0';
    document.body.appendChild(picture);
    preloadedSlides.current.add(index);
    preloadNodes.current.push(picture);
  };

  useEffect(() => () => {
    preloadNodes.current.forEach((node) => node.remove());
  }, []);

  useEffect(() => {
    if (!loadedSlides.has(0)) return undefined;

    preloadSlide(1);

    let idleId;
    let timeoutId;
    const loadRemainingSlides = () => {
      preloadSlide(2);
      timeoutId = window.setTimeout(() => preloadSlide(3), 1200);
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(loadRemainingSlides, { timeout: 3000 });
    } else {
      idleId = window.setTimeout(loadRemainingSlides, 800);
    }

    return () => {
      if ('cancelIdleCallback' in window && typeof idleId === 'number') window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [loadedSlides]);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <section
      className="home-hero"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: '720px',
        maxHeight: '900px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: 0,
        margin: 0,
        overflow: 'hidden',
        color: '#FFFFFF',
        backgroundColor: '#172b3c'
      }}
    >
      {/* Only the active slide is mounted visibly. Future slides are preloaded progressively. */}
      <div
        className="home-hero__active-image"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          opacity: loadedSlides.has(currentSlide) ? 1 : 0,
          transition: 'opacity 180ms ease',
        }}
      >
        <picture>
          <source type="image/avif" srcSet={responsiveSource(slides[currentSlide], 'avif')} sizes="100vw" />
          <source type="image/webp" srcSet={responsiveSource(slides[currentSlide], 'webp')} sizes="100vw" />
          <img
            src={slides[currentSlide].fallback}
            srcSet={responsiveSource(slides[currentSlide], 'webp')}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            loading={currentSlide === 0 ? 'eager' : 'auto'}
            fetchPriority={currentSlide === 0 ? 'high' : 'low'}
            decoding="async"
            onLoad={(event) => revealSlide(currentSlide, event.currentTarget)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        </picture>
      </div>

      {/* Overlay Layer 1 — base dark tint */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        background: 'rgba(6, 17, 19, 0.16)'
      }} />

      {/* Overlay Layer 2 — directional gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        background: 'linear-gradient(90deg, rgba(6, 17, 19, 0.72) 0%, rgba(6, 17, 19, 0.48) 38%, rgba(6, 17, 19, 0.18) 68%, rgba(6, 17, 19, 0.04) 100%), linear-gradient(0deg, rgba(4, 12, 15, 0.16), transparent 35%)',
        opacity: 0.9
      }} />

      {/* Content Layer — LEFT ALIGNED */}
      <div className="container" style={{
        position: 'relative',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        paddingTop: 'clamp(108px, 15vh, 154px)',
        paddingBottom: 'clamp(72px, 10vh, 108px)',
        maxWidth: '860px',
      }}>
        
        {/* Hero Title */}
        <h1 
          style={{
            color: '#FFFFFF',
            fontFamily: 'var(--editorial-serif)',
            fontSize: 'clamp(4rem, 5.2vw, 5.6rem)',
            fontWeight: 600,
            fontStyle: 'normal',
            lineHeight: 0.94,
            letterSpacing: '-0.025em',
            maxWidth: '780px',
            textShadow: '0 2px 18px rgba(7, 25, 21, 0.14)',
          }}
        >
          Talent is everywhere.<br />Opportunity is not.
        </h1>

        {/* Subtitle */}
        <p 
          style={{
            fontFamily: 'var(--body-font)',
            maxWidth: '620px',
            marginTop: '1.75rem',
            fontSize: 'clamp(1.05rem, 1.25vw, 1.2rem)',
            lineHeight: 1.55,
            color: 'rgba(255, 255, 255, 0.88)',
            fontStyle: 'normal',
          }}
        >
         We are fundraising $100,000 to give talented high school students access to internships and volunteer opportunities without cost becoming a barrier.
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '28px',
          flexWrap: 'wrap',
          marginTop: '2rem',
        }}>
          <Link
            to="/donate"
            className="hero-primary-btn"
            style={{
              minHeight: '52px',
              padding: '0 28px',
              fontFamily: 'var(--display-font)',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#FFFFFF',
              color: '#1A1A2E',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.10)',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Donate
          </Link>
          <Link
            to="/impact"
            className="hero-secondary-btn"
            style={{
              background: 'transparent',
              color: '#FFFFFF',
              border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.58)',
              borderRadius: 0,
              padding: '10px 0',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              fontSize: '14px',
              fontFamily: 'var(--display-font)',
              cursor: 'pointer',
            }}
          >
            SEE OUR IMPACT
          </Link>
        </div>
      </div>

      {/* Dots Indicator */}
      <div style={{
        position: 'absolute',
        bottom: 'clamp(1.5rem, 4vh, 2rem)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 3,
        display: 'flex',
        gap: '0.75rem'
      }}>
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: index === currentSlide ? '#D4A96A' : 'rgba(255,255,255,0.35)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'background-color 0.3s ease'
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <style>{`
        @supports (height: 100dvh) {
          .home-hero {
            height: 100dvh !important;
            min-height: 100dvh !important;
          }
        }
        .hero-secondary-btn:hover .hero-secondary-arrow {
          transform: translateX(4px) !important;
        }
        @media (max-width: 640px) {
          .home-hero { height: auto !important; min-height: max(640px, 100svh) !important; max-height: none !important; }
          .home-hero .container { width: calc(100% - 40px) !important; padding: 96px 0 72px !important; }
          .home-hero h1 { max-width: 100% !important; font-size: clamp(2.65rem, 11vw, 3.65rem) !important; line-height: 0.96 !important; }
          .home-hero .hero-primary-btn { width: 100%; justify-content: center; }
          .home-hero .hero-secondary-btn { width: auto; justify-content: flex-start; }
          .home-hero .container > div { width: 100%; gap: 1rem !important; }
        }
        @media (max-width: 430px) {
          .home-hero .container { width: calc(100% - 32px) !important; padding-top: 92px !important; }
          .home-hero h1 { font-size: clamp(2.45rem, 10.5vw, 3.1rem) !important; }
          .home-hero p { font-size: 1rem !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .home-hero [style*="transition"] { transition: none !important; }
        }
      `}</style>
    </section>
  );
}
