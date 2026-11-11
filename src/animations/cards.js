/**
 * Card hover / press micro-interactions.
 * Uses event delegation for performance.
 */

const gsap = window.gsap;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Initialise card hover (translateY:-4px + shadow) and press (scale:0.97)
 * on all .card elements.
 *
 * Call once after DOM is ready.
 */
export function initCardAnimations() {
  if (prefersReducedMotion()) return;
  if (!gsap) return;

  // Use event delegation on document for cards added dynamically
  document.addEventListener('mouseenter', handleEnter, true);
  document.addEventListener('mouseleave', handleLeave, true);
  document.addEventListener('mousedown', handleDown, true);
  document.addEventListener('mouseup', handleUp, true);
}

function isCard(el) {
  return el && el.closest && el.closest('.card');
}

function handleEnter(e) {
  const card = isCard(e.target);
  if (!card) return;

  gsap.to(card, {
    y: -4,
    duration: 0.25,
    ease: 'power2.out',
    overwrite: 'auto',
  });

  // Add shadow class — CSS handles the actual box-shadow for theme consistency
  card.classList.add('card--hover');
}

function handleLeave(e) {
  const card = isCard(e.target);
  if (!card) return;

  gsap.to(card, {
    y: 0,
    scale: 1,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto',
  });

  card.classList.remove('card--hover');
  card.classList.remove('card--pressed');
}

function handleDown(e) {
  const card = isCard(e.target);
  if (!card) return;

  gsap.to(card, {
    scale: 0.97,
    duration: 0.12,
    ease: 'power2.out',
    overwrite: 'auto',
  });

  card.classList.add('card--pressed');
}

function handleUp(e) {
  const card = isCard(e.target);
  if (!card) return;

  gsap.to(card, {
    scale: 1,
    duration: 0.2,
    ease: 'back.out(1.5)',
    overwrite: 'auto',
  });

  card.classList.remove('card--pressed');
}
