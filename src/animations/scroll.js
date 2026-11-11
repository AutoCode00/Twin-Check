/**
 * Scroll-triggered GSAP animations for all website sections.
 */

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Initialise scroll-triggered animations.
 *
 * Expects:
 *   .section-headline   — each section's heading
 *   .section-mockup     — mockup containers (delayed 0.2s)
 *   .feature-card       — 12 feature grid cards
 *   .faq-item           — FAQ accordion items
 */
export function initScrollAnimations() {
  if (prefersReducedMotion()) return;
  if (!gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  // --- section headlines: y 40→0, fade in ---
  const headlines = document.querySelectorAll('.section-headline');
  headlines.forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // --- section sub-headings ---
  const subs = document.querySelectorAll('.section-sub');
  subs.forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // --- mockups: delayed 0.2s after trigger ---
  const mockups = document.querySelectorAll('.section-mockup');
  mockups.forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        delay: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // --- feature grid: 12 cards staggered 0.08s ---
  const featureCards = document.querySelectorAll('.feature-card');
  if (featureCards.length) {
    gsap.fromTo(
      featureCards,
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: featureCards[0].parentElement,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      }
    );
  }

  // --- FAQ items: fade in staggered ---
  const faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length) {
    gsap.fromTo(
      faqItems,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: faqItems[0].parentElement,
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
      }
    );
  }

  // --- CTA sections ---
  const ctaSections = document.querySelectorAll('.section-cta');
  ctaSections.forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // --- stat counters in footer ---
  const stats = document.querySelectorAll('.footer-stat');
  if (stats.length) {
    gsap.fromTo(
      stats,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: stats[0].parentElement,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      }
    );
  }
}
