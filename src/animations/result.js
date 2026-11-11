/**
 * Result-state animations: match confetti, notes glow, mismatch shake.
 * Tic & Tac react per result.
 */

const gsap = window.gsap;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// --- helpers ---

function createConfettiSquare(container, color) {
  const el = document.createElement('div');
  const size = 6 + Math.random() * 6;
  Object.assign(el.style, {
    position: 'absolute',
    width: size + 'px',
    height: size + 'px',
    borderRadius: '2px',
    backgroundColor: color,
    top: '50%',
    left: '50%',
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  });
  container.appendChild(el);
  return el;
}

/**
 * Burst confetti (lavender + sky squares) then float down.
 * Call when result === 'match'.
 * Expects: .result-container (position:relative) for confetti, .result-tic, .result-tac
 */
export function animateMatch() {
  if (prefersReducedMotion() || !gsap) return;

  const container = document.querySelector('.result-container');
  if (!container) return;

  // Ensure container is positioned for absolute children
  const pos = getComputedStyle(container).position;
  if (pos === 'static') container.style.position = 'relative';

  const colors = ['#C9B8FF', '#9ED8FF']; // lavender, sky
  const pieces = [];
  const count = 28;

  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length];
    pieces.push(createConfettiSquare(container, color));
  }

  // burst outward
  pieces.forEach((el) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 100;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    gsap.set(el, { scale: 0, opacity: 1 });

    gsap.to(el, {
      x: dx,
      y: dy - 40, // upward bias
      scale: 1,
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out',
    });

    // float down + fade
    gsap.to(el, {
      y: dy + 80,
      opacity: 0,
      duration: 0.9,
      delay: 0.4,
      ease: 'power1.in',
      onComplete: () => el.remove(),
    });

    // gentle rotation via transform
    gsap.to(el, {
      rotation: (Math.random() - 0.5) * 360,
      duration: 1.3,
      ease: 'none',
    });
  });

  // Tic & Tac celebrate — bounce
  animateMascotReaction('match');
}

/**
 * Butter glow pulse on the "notes" banner.
 * Expects: .result-banner, .result-tic, .result-tac
 */
export function animateNotes() {
  if (prefersReducedMotion() || !gsap) return;

  const banner = document.querySelector('.result-banner');
  if (banner) {
    gsap.fromTo(
      banner,
      { opacity: 0, scale: 0.95 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
      }
    );

    // Gentle pulse glow
    gsap.fromTo(
      banner,
      { opacity: 0.85 },
      {
        opacity: 1,
        duration: 0.7,
        repeat: 3,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.5,
      }
    );
  }

  animateMascotReaction('notes');
}

/**
 * Coral shake on mismatch.
 * Expects: .result-banner, .result-tic, .result-tac
 */
export function animateMismatch() {
  if (prefersReducedMotion() || !gsap) return;

  const banner = document.querySelector('.result-banner');
  if (banner) {
    gsap.fromTo(
      banner,
      { opacity: 0, scale: 0.96 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      }
    );

    // Shake: rapid x oscillation
    gsap.to(banner, {
      x: 6,
      duration: 0.06,
      repeat: 5,
      yoyo: true,
      ease: 'power1.inOut',
      delay: 0.3,
      onComplete: () => gsap.set(banner, { x: 0 }),
    });
  }

  animateMascotReaction('mismatch');
}

/**
 * Tic & Tac mascot reactions based on result type.
 * @param {'match'|'notes'|'mismatch'} result
 */
function animateMascotReaction(result) {
  if (!gsap) return;

  const tic = document.querySelector('.result-tic');
  const tac = document.querySelector('.result-tac');

  if (!tic && !tac) return;

  switch (result) {
    case 'match':
      // Happy bounce
      [tic, tac].forEach((el) => {
        if (!el) return;
        gsap.to(el, {
          y: -12,
          duration: 0.25,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        });
        gsap.fromTo(
          el,
          { scale: 1 },
          {
            scale: 1.08,
            duration: 0.2,
            delay: 0.1,
            yoyo: true,
            repeat: 1,
            ease: 'power1.out',
          }
        );
      });
      break;

    case 'notes':
      // Thoughtful tilt
      if (tic) {
        gsap.to(tic, {
          rotation: -6,
          duration: 0.4,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        });
      }
      if (tac) {
        gsap.to(tac, {
          rotation: 6,
          duration: 0.4,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        });
      }
      break;

    case 'mismatch':
      // Worried shake
      [tic, tac].forEach((el) => {
        if (!el) return;
        gsap.to(el, {
          x: 4,
          duration: 0.06,
          repeat: 5,
          yoyo: true,
          ease: 'power1.inOut',
          onComplete: () => gsap.set(el, { x: 0 }),
        });
      });
      break;
  }
}
