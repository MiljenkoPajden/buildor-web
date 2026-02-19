import { useEffect, useRef } from 'react';

const OPTIONS: IntersectionObserverInit = {
  threshold: 0.06,
  rootMargin: '0px 0px -30px 0px',
};

export function useReveal<T extends HTMLElement = HTMLElement>(): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('vis');
          observer.unobserve(e.target);
        }
      });
    }, OPTIONS);

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
