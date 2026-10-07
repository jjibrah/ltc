/** A photo-led, keyboard-accessible story preview. */
export default function StudentCard({ student, onClick }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className="student-card"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Read the story of ${student.name}`}
    >
      <div className="student-card__image-wrap">
        <img
          className="student-card__image"
          src={student.image || '/images/nice.JPG'}
          alt={`${student.name}, Living the Charge student`}
          loading="lazy"
        />
      </div>
      <div className="student-card__content">
        <div className="student-card__meta">Class of {student.year} · Student story</div>
        <h3>{student.name}</h3>
        {student.excerpt && <p className="student-card__quote">“{student.excerpt}”</p>}
        <span className="student-card__link">
          Read {student.name.split(' ')[0]}'s story
        </span>
      </div>
      <style>{`
        .student-card { min-width: 0; cursor: pointer; outline: none; }
        .student-card__image-wrap { aspect-ratio: 4 / 5; overflow: hidden; background: #e9e7e2; }
        .student-card__image { width: 100%; height: 100%; display: block; object-fit: cover; object-position: center top; filter: saturate(.95) contrast(1.02); transition: transform 260ms ease, filter 260ms ease; }
        .student-card__content { padding: 20px 0 0; border-bottom: 1px solid var(--color-border); }
        .student-card__meta { margin-bottom: 9px; color: var(--color-text-muted); font-family: var(--display-sans); font-size: .72rem; font-weight: 650; letter-spacing: .1em; text-transform: uppercase; }
        .student-card h3 { margin: 0; color: #1E1F33; font-family: var(--display-sans); font-size: clamp(1.35rem, 2vw, 1.7rem); font-weight: 650; line-height: 1.15; letter-spacing: -.025em; }
        .student-card__quote { min-height: 50px; margin: 14px 0 18px; padding-left: 14px; border-left: 2px solid var(--color-secondary); color: var(--color-text); font-family: var(--editorial-serif); font-size: 1rem; font-style: italic; line-height: 1.5; }
        .student-card__link { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 20px; color: #1E1F33; font-family: var(--display-sans); font-size: .84rem; font-weight: 650; text-decoration: underline; text-underline-offset: 4px; }
        .student-card__link span { transition: transform 180ms ease; }
        .student-card:hover .student-card__image, .student-card:focus-visible .student-card__image { transform: scale(1.02); filter: saturate(1) contrast(1.04); }
        .student-card:hover .student-card__link span, .student-card:focus-visible .student-card__link span { transform: translateX(4px); }
        .student-card:focus-visible .student-card__content { outline: 2px solid rgba(29,29,49,.42); outline-offset: 4px; }
        @media (prefers-reduced-motion: reduce) { .student-card__image, .student-card__link span { transition: none; } }
      `}</style>
    </article>
  );
}
