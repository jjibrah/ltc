import { useScrollReveal } from '../../hooks/useScrollReveal';

/**
 * ScrollReveal component that wraps children in an element that animates on scroll.
 * @param {string} as - The HTML element type to render (default: 'div').
 * @param {React.ReactNode} children - Children elements.
 * @param {string} delay - Transition delay (e.g. '0.1s').
 * @param {string} duration - Transition duration (e.g. '0.6s').
 * @param {string} className - Additional CSS classes.
 * @param {Object} style - Inline styles.
 */
export default function ScrollReveal({
  as: Component = 'div',
  children,
  delay = '0s',
  duration = '0.6s',
  className = '',
  style = {},
  ...props
}) {
  const [ref, isVisible] = useScrollReveal();

  const combinedStyle = {
    ...style,
    transitionDelay: delay,
    transitionDuration: duration,
  };

  return (
    <Component
      ref={ref}
      className={`reveal-hidden ${isVisible ? 'reveal-visible' : ''} ${className}`}
      style={combinedStyle}
      {...props}
    >
      {children}
    </Component>
  );
}
