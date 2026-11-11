/**
 * Report / checklist animations for the app comparison flow.
 */

const gsap = window.gsap;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Spring check-off animation for a checklist item.
 * @param {HTMLElement} el — the check-item row element
 */
export function animateCheckItem(el) {
  if (prefersReducedMotion() || !gsap || !el) return;

  gsap.fromTo(
    el,
    { opacity: 0, x: -18 },
    {
      opacity: 1,
      x: 0,
      duration: 0.45,
      ease: 'back.out(1.6)',
    }
  );
}

/**
 * Scale-pop the checkmark icon.
 * @param {HTMLElement} el — the ✓ icon element
 */
export function animateCheckMark(el) {
  if (prefersReducedMotion() || !gsap || !el) return;

  gsap.fromTo(
    el,
    { scale: 0, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      duration: 0.35,
      ease: 'back.out(3)',
    }
  );
}

/**
 * Glow-pulse on byte-diff highlight ranges.
 * Uses butter (#FFE38A) for immutable diffs, coral (#FF9B85) for code diffs.
 * @param {NodeList|HTMLElement[]} ranges — the diff-highlight span elements
 */
export function animateByteDiff(ranges) {
  if (prefersReducedMotion() || !gsap) return;
  if (!ranges || !ranges.length) return;

  const rangeArr = Array.from(ranges);

  rangeArr.forEach((el, i) => {
    const isCoral = el.classList.contains('diff-code');
    const glowColor = isCoral
      ? 'rgba(255,155,133,0.45)'
      : 'rgba(255,227,138,0.45)';

    // Initial fade-in stagger
    gsap.fromTo(
      el,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.25,
        delay: i * 0.04,
        ease: 'power2.out',
      }
    );

    // Pulsing glow via boxShadow (transform+opacity only for position,
    // boxShadow is lightweight repaint, acceptable for emphasis)
    gsap.fromTo(
      el,
      { opacity: 0.7 },
      {
        opacity: 1,
        duration: 0.8,
        delay: i * 0.04 + 0.3,
        repeat: 2,
        yoyo: true,
        ease: 'sine.inOut',
      }
    );
  });
}

/**
 * Stagger fade-in for view-values table rows.
 * @param {NodeList|HTMLElement[]} rows — the table row elements
 */
export function animateValuesTable(rows) {
  if (prefersReducedMotion() || !gsap) return;
  if (!rows || !rows.length) return;

  gsap.fromTo(
    Array.from(rows),
    { opacity: 0, y: 12 },
    {
      opacity: 1,
      y: 0,
      duration: 0.35,
      stagger: 0.06,
      ease: 'power2.out',
    }
  );
}
