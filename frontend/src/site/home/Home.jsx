import HeroCarousel from './HeroCarousel';
import WhatIsLTC from './WhatIsLTC';
import WhyWeDoThis from './WhyWeDoThis';
import WhyShouldYouCare from './WhyShouldYouCare';
import CeoVideoSection from './CeoVideoSection';
import EmailCapture from './EmailCapture';
import ScrollReveal from '../../shared/components/feedback/ScrollReveal';

export default function Home() {
  return (
    <>
      <HeroCarousel />

      <WhatIsLTC />
      <WhyWeDoThis />
      <WhyShouldYouCare />
      <CeoVideoSection />

      <section className="home-newsletter-section" style={{ padding: 'clamp(80px, 9vw, 128px) 0', backgroundColor: '#FFFFFF', borderTop: '1px solid var(--color-border)' }}>
        <div className="container">
          <ScrollReveal>
            <EmailCapture />
          </ScrollReveal>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .home-newsletter-section { padding-block: 64px !important; }
        }
        @media (max-width: 520px) {
          .home-newsletter-section { padding-block: 52px !important; }
        }
      `}</style>
    </>
  );
}
