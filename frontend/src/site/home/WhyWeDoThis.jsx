import { Link } from 'react-router-dom';
import ScrollReveal from '../../shared/components/feedback/ScrollReveal';

export default function WhyWeDoThis() {
  return (
    <section className="why-we-do-this" aria-labelledby="why-do-this-title">
      <div className="container why-we-do-this__inner">
        <ScrollReveal>
          <div className="why-we-do-this__grid">
            <div className="why-we-do-this__copy">
              <span className="why-we-do-this__eyebrow">Why we do this</span>
              <h2 id="why-do-this-title">To whom much is given, much is required.</h2>
              <p className="why-we-do-this__lead">We are beneficiaries of the goodwill of those who invested in us before they knew what we would become.</p>
              <p>Living the Charge exists to close the gap between brilliance and access, creating an avenue for us to give others the opportunity we once needed ourselves.</p>
              <Link to="/mission" className="why-do-this-cta">Learn more about our mission</Link>
            </div>
            <figure className="why-we-do-this__photo">
              <img src="/images/DSC_2193.JPG" alt="Living the Charge team members gathered together" loading="lazy" />
              <figcaption>The people Living the Charge</figcaption>
            </figure>
          </div>
        </ScrollReveal>
      </div>
      <style>{`
        .why-we-do-this { padding: clamp(76px, 9vw, 124px) 0; background: #f4f5f6; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
        .why-we-do-this__inner { max-width: 1180px; }
        .why-we-do-this__grid { display: grid; grid-template-columns: minmax(0, .9fr) minmax(360px, 1.1fr); gap: clamp(48px, 8vw, 112px); align-items: center; }
        .why-we-do-this__copy { max-width: 570px; }
        .why-we-do-this__eyebrow { display: block; margin-bottom: 20px; color: var(--color-secondary); font-family: var(--display-font); font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
        .why-we-do-this h2 { max-width: 570px; margin: 0 0 24px; color: var(--text-primary); font-family: var(--display-font); font-size: clamp(2rem, 3.2vw, 3.4rem); font-weight: 700; line-height: 1; letter-spacing: -.03em; }
        .why-we-do-this p { max-width: 530px; margin: 0 0 16px; color: var(--text-primary); font-family: var(--body-font); font-size: 1.12rem; line-height: 1.55; }
        .why-we-do-this p.why-we-do-this__lead { color: var(--text-primary); font-size: 1.12rem; line-height: 1.55; }
        .why-do-this-cta { display: inline-flex; align-items: center; gap: 9px; margin-top: 20px; padding-bottom: 5px; border-bottom: 1.5px solid var(--color-secondary); color: var(--text-primary); font-family: var(--display-font); font-size: 14px; font-weight: 650; text-decoration: none; transition: color .2s ease, border-color .2s ease; }
        .why-do-this-cta:hover { color: var(--color-secondary); }
        .why-do-this-cta .cta-arrow { transition: transform .2s ease; }
        .why-do-this-cta:hover .cta-arrow { transform: translateX(4px); }
        .why-we-do-this__photo { position: relative; min-height: 520px; margin: 0; overflow: hidden; border-radius: 4px; background: #d9dce0; }
        .why-we-do-this__photo::after { content: ''; position: absolute; inset: 0; background: linear-gradient(0deg, rgba(29,29,49,.62), transparent 42%); pointer-events: none; }
        .why-we-do-this__photo img { display: block; width: 100%; height: 100%; min-height: 520px; object-fit: cover; object-position: center; }
        .why-we-do-this__photo figcaption { position: absolute; z-index: 1; right: 24px; bottom: 20px; left: 24px; color: #fff; font-family: var(--editorial-serif); font-size: clamp(1.25rem, 2.2vw, 1.8rem); line-height: 1.05; }
        @media (max-width: 820px) { .why-we-do-this__grid { grid-template-columns: 1fr; gap: 42px; } .why-we-do-this__copy { max-width: 680px; } .why-we-do-this__photo, .why-we-do-this__photo img { min-height: 420px; } }
        @media (max-width: 520px) { .why-we-do-this { padding-block: 64px; } .why-we-do-this__grid { gap: 34px; } .why-we-do-this h2 { font-size: clamp(2rem, 9vw, 2.7rem); } .why-we-do-this p { font-size: 1.02rem; } .why-we-do-this__photo, .why-we-do-this__photo img { min-height: 300px; } .why-we-do-this__photo figcaption { right: 16px; bottom: 16px; left: 16px; font-size: 1.25rem; } }
      `}</style>
    </section>
  );
}
