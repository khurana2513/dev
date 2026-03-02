import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook to manage scroll restoration behavior based on page type
 * 
 * Course pages (abacus, vedic-maths, handwriting, stem): Restore scroll position on refresh
 * Other pages: Always scroll to top on refresh/navigation
 */
export function useScrollRestoration() {
  const [location] = useLocation();
  const isInitialMount = useRef(true);

  // Course pages that should restore scroll position on refresh
  // All other pages will scroll to top on refresh/navigation
  const coursePages = [
    '/courses/abacus',
    '/courses/vedic-maths',
    '/courses/handwriting',
    '/courses/stem'
  ];

  const isCoursePage = coursePages.some(path => location.startsWith(path));

  useEffect(() => {
    // Handle initial page load or refresh
    if (isInitialMount.current) {
      isInitialMount.current = false;

      if (isCoursePage) {
        // Restore scroll position for course pages on refresh
        const savedScroll = sessionStorage.getItem(`scroll_${location}`);
        if (savedScroll) {
          const scrollY = parseInt(savedScroll, 10);
          // Use setTimeout to ensure DOM is ready
          setTimeout(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
          }, 0);
        } else {
          // No saved position, scroll to top
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      } else {
        // All other pages (including NotFound and any unlisted pages) scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    } else {
      // Route change (not refresh)
      if (isCoursePage) {
        // For course pages on navigation, restore position if available
        const savedScroll = sessionStorage.getItem(`scroll_${location}`);
        if (savedScroll) {
          const scrollY = parseInt(savedScroll, 10);
          setTimeout(() => {
            window.scrollTo({ top: scrollY, behavior: 'smooth' });
          }, 100);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        // All other pages scroll to top on navigation
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [location, isCoursePage]);

  // Save scroll position for course pages
  useEffect(() => {
    if (!isCoursePage) return;

    const handleScroll = () => {
      sessionStorage.setItem(`scroll_${location}`, window.scrollY.toString());
    };

    // Throttle scroll events for better performance
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });

    // Also save on page unload (refresh/close)
    const handleBeforeUnload = () => {
      sessionStorage.setItem(`scroll_${location}`, window.scrollY.toString());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location, isCoursePage]);
}
