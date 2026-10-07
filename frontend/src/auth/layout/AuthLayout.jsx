import AuthCard from '../components/AuthCard';
import '../auth.css';
import { useEffect, useRef } from 'react';

export default function AuthLayout({ children, footer = 'Living the Charge · Internal Administration' }) {
  const pageRef = useRef(null);

  useEffect(() => {
    const page = pageRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!page || reduceMotion.matches) return undefined;

    const current = { x: 50, y: 42 };
    const target = { x: 50, y: 42 };
    let frame = 0;

    const setPosition = () => {
      page.style.setProperty('--auth-mouse-x', `${current.x}%`);
      page.style.setProperty('--auth-mouse-y', `${current.y}%`);
    };

    const animate = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      setPosition();

      if (Math.abs(target.x - current.x) > 0.01 || Math.abs(target.y - current.y) > 0.01) {
        frame = window.requestAnimationFrame(animate);
      } else {
        frame = 0;
      }
    };

    const moveTo = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const bounds = page.getBoundingClientRect();
      target.x = ((event.clientX - bounds.left) / bounds.width) * 100;
      target.y = ((event.clientY - bounds.top) / bounds.height) * 100;
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const returnToRest = () => {
      target.x = 50;
      target.y = 42;
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    page.addEventListener('pointermove', moveTo, { passive: true });
    page.addEventListener('pointerleave', returnToRest, { passive: true });

    return () => {
      page.removeEventListener('pointermove', moveTo);
      page.removeEventListener('pointerleave', returnToRest);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={pageRef} className="auth-page grain-overlay">
      <AuthCard footer={footer}>
        <div className="auth-brand">
          <img className="auth-brand__logo" src="/images/nobglogo.png" alt="Living the Charge" />
        </div>
        {children}
      </AuthCard>
    </div>
  );
}
