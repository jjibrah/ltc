import { useEffect, useRef, useState } from 'react';

/**
 * Hook to trigger scroll animations using IntersectionObserver.
 * @param {Object} options - IntersectionObserver configuration.
 * @param {boolean} options.triggerOnce - Whether the animation should trigger only once (default: true).
 * @returns {[React.RefObject, boolean]} A ref to attach to the element, and a boolean indicating if it is visible.
 */
export function useScrollReveal(options = {}) {
  const { triggerOnce = true, threshold = 0.1, rootMargin = '0px 0px -50px 0px' } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        if (triggerOnce) {
          observer.unobserve(currentRef);
        }
      } else if (!triggerOnce) {
        setIsIntersecting(false);
      }
    }, {
      threshold,
      rootMargin
    });

    observer.observe(currentRef);

    return () => {
      if (currentRef && !triggerOnce) {
        observer.unobserve(currentRef);
      }
    };
  }, [triggerOnce, threshold, rootMargin]);

  return [ref, isIntersecting];
}
