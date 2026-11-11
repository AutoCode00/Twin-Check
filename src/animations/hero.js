/**
 * Hero section GSAP animations
 * Tic from left, Tac from right, bytecode strips zip, mint ✓ pops, high-five.
 */

const gsap = window.gsap;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Initialise hero entrance animations. Timeline ~2.5s.
 * Elements expected:
 *   .hero-tic, .hero-tac — mascot containers
 *   .hero-bytecode-left, .hero-bytecode-right — hex strip halves
 *   .hero-check — mint ✓ icon
 *   .hero-highfive — high-five flash element
 *   .hero-headline, .hero-sub, .hero-ctas, .hero-note — text blocks
 */
export function initHeroAnimations() {
  if (prefersReducedMotion()) return;
  if (!gsap) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // --- text entrance ---
  tl.fromTo(
    '.hero-headline',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.5 }
  )
    .fromTo(
      '.hero-sub',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4 },
      '-=0.25'
    )
    .fromTo(
      '.hero-ctas',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35 },
      '-=0.15'
    )
    .fromTo(
      '.hero-note',
      { opacity: 0 },
      { opacity: 1, duration: 0.3 },
      '-=0.1'
    );

  // --- Tic slides in from left ---
  tl.fromTo(
    '.hero-tic',
    { opacity: 0, x: -100 },
    { opacity: 1, x: 0, duration: 0.6, ease: 'back.out(1.4)' },
    0.2 // absolute position on timeline
  );

  // --- Tac slides in from right ---
  tl.fromTo(
    '.hero-tac',
    { opacity: 0, x: 100 },
    { opacity: 1, x: 0, duration: 0.6, ease: 'back.out(1.4)' },
    0.3
  );

  // --- bytecode strips zip together ---
  tl.fromTo(
    '.hero-bytecode-left',
    { opacity: 0, x: -60 },
    { opacity: 1, x: 0, duration: 0.5 },
    0.7
  ).fromTo(
    '.hero-bytecode-right',
    { opacity: 0, x: 60 },
    { opacity: 1, x: 0, duration: 0.5 },
    0.7
  );

  // --- mint ✓ pops with scale bounce ---
  tl.fromTo(
    '.hero-check',
    { opacity: 0, scale: 0 },
    {
      opacity: 1,
      scale: 1,
      duration: 0.45,
      ease: 'back.out(2.5)',
    },
    1.4
  );

  // --- high-five flash ---
  tl.fromTo(
    '.hero-highfive',
    { opacity: 0, scale: 0.6 },
    {
      opacity: 1,
      scale: 1,
      duration: 0.35,
      ease: 'back.out(2)',
    },
    1.8
  ).to(
    '.hero-highfive',
    {
      opacity: 0,
      scale: 1.3,
      duration: 0.4,
      ease: 'power2.in',
    },
    2.15
  );

  return tl;
}
