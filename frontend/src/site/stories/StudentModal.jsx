import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function StudentModal({ student, onClose, onPrevious, onNext, hasPrevious, hasNext }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!student) return undefined;
    const previousFocus = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE) || [];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [student, onClose]);

  if (!student) return null;

  return (
    <div className="story-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="story-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-modal-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="story-modal__image">
          <img src={student.image || '/images/nice.JPG'} alt={`${student.name}, Living the Charge student`} />
        </div>
        <div className="story-modal__content">
          <button type="button" className="story-modal__close" onClick={onClose} aria-label="Close story">×</button>
          <p className="story-modal__eyebrow">Student story</p>
          <h2 id="story-modal-title">{student.name}</h2>
          <p className="story-modal__meta">Class of {student.year}</p>
          {student.excerpt && <blockquote>“{student.excerpt}”</blockquote>}
          {student.fullStoryHTML && <div className="story-modal__body" dangerouslySetInnerHTML={{ __html: student.fullStoryHTML }} />}
          {(onPrevious || onNext) && (
            <div className="story-modal__nav">
              <button type="button" onClick={onPrevious} disabled={!hasPrevious} aria-label="Previous story">← Previous story</button>
              <button type="button" onClick={onNext} disabled={!hasNext} aria-label="Next story">Next story →</button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .story-modal-backdrop { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 32px; background: rgba(8,13,24,.58); backdrop-filter: blur(6px); animation: storyFadeIn 220ms ease both; }
        .story-modal { position: relative; width: min(1120px, calc(100vw - 64px)); max-height: min(780px, calc(100dvh - 64px)); overflow: hidden; display: grid; grid-template-columns: 42% 58%; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 30px 90px rgba(8,15,30,.22); animation: storyModalIn 240ms ease both; }
        .story-modal__image { min-height: 100%; background: #e9e7e2; }
        .story-modal__image img { width: 100%; height: 100%; min-height: 540px; display: block; object-fit: cover; object-position: center top; }
        .story-modal__content { position: relative; overflow-y: auto; padding: 64px 64px 40px; color: #1E1F33; }
        .story-modal__close { position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid rgba(29,29,49,.16); border-radius: 50%; background: rgba(250,249,246,.9); color: #1E1F33; font-size: 26px; line-height: 1; cursor: pointer; transition: background 180ms ease, transform 180ms ease; }
        .story-modal__close:hover { background: #fff; transform: scale(1.04); }
        .story-modal__close:focus-visible, .story-modal__nav button:focus-visible { outline: 2px solid #1E1F33; outline-offset: 3px; }
        .story-modal__eyebrow { margin: 0 0 16px; color: var(--color-text-muted); font-family: var(--display-sans); font-size: 12px; font-weight: 650; letter-spacing: .14em; text-transform: uppercase; }
        .story-modal h2 { margin: 0; color: #1E1F33; font-family: var(--display-sans); font-size: clamp(2.4rem, 4vw, 3.5rem); font-weight: 650; line-height: 1; letter-spacing: -.04em; }
        .story-modal__meta { margin: 12px 0 34px; color: var(--color-text-muted); font-family: var(--display-sans); font-size: 13px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; }
        .story-modal blockquote { max-width: 580px; margin: 0 0 34px; padding-left: 22px; border-left: 2px solid var(--color-secondary); color: #1E1F33; font-family: var(--editorial-serif); font-size: clamp(1.2rem, 1.8vw, 1.45rem); font-style: italic; line-height: 1.55; }
        .story-modal__body { max-width: 580px; color: var(--color-text); font-family: var(--body-sans); font-size: 16px; line-height: 1.7; }
        .story-modal__body p { margin: 0 0 18px; }
        .story-modal__nav { display: flex; justify-content: space-between; gap: 16px; margin-top: 42px; padding-top: 20px; border-top: 1px solid var(--color-border); }
        .story-modal__nav button { border: 0; background: transparent; color: #1E1F33; font-family: var(--display-sans); font-size: 13px; font-weight: 650; cursor: pointer; }
        .story-modal__nav button:disabled { color: var(--color-text-muted); cursor: not-allowed; opacity: .5; }
        @keyframes storyFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes storyModalIn { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (max-width: 768px) { .story-modal-backdrop { padding: 0; align-items: stretch; } .story-modal { width: 100%; max-height: 100dvh; min-height: 100dvh; grid-template-columns: 1fr; overflow-y: auto; border: 0; border-radius: 0; } .story-modal__image img { height: min(34dvh, 290px); min-height: 220px; } .story-modal__content { position: static; overflow: visible; padding: 28px 22px 24px; } .story-modal__close { top: 14px; right: 14px; width: 38px; height: 38px; background: rgba(250,249,246,.94); } .story-modal__eyebrow { margin-bottom: 12px; font-size: 11px; } .story-modal h2 { font-size: clamp(2rem, 10vw, 2.8rem); } .story-modal__meta { margin: 10px 0 26px; } .story-modal blockquote { margin-bottom: 28px; padding-left: 16px; font-size: 1.15rem; } .story-modal__body { font-size: 15px; line-height: 1.65; } .story-modal__nav { margin-top: 28px; padding-bottom: 8px; } }
        @media (max-width: 430px) { .story-modal__image img { height: 31dvh; min-height: 200px; } .story-modal__content { padding: 24px 18px 22px; } .story-modal h2 { font-size: clamp(1.9rem, 10vw, 2.4rem); } .story-modal__nav { gap: 10px; } .story-modal__nav button { font-size: 12px; } }
        @media (prefers-reduced-motion: reduce) { .story-modal-backdrop, .story-modal { animation: none; } .story-modal__close { transition: none; } }
      `}</style>
    </div>
  );
}
