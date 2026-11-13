/**
 * main.js — Main application entry point for Twin Check
 *
 * Bootstraps router, wallet connection, animations, FAQ toggles,
 * and view lifecycle.
 */

import { initRouter, navigateTo } from './app/router.js';
import { renderApp } from './app/app.js';
import { renderBadge } from './app/badge.js';
import {
  isConnected,
  getAddress,
  connectWallet,
  getShortAddress,
  onChange as onWalletChange,
} from './app/wallet.js';
import { initHeroAnimations } from './animations/hero.js';
import { initScrollAnimations } from './animations/scroll.js';
import { initCardAnimations } from './animations/cards.js';
import { REGISTRY_ADDRESS, MAINNET_EXPLORER } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  setupFaqAccordion();
  setupFooter();
  initCardAnimations();

  // Initialize SPA routes
  initRouter({
    '/': () => {
      // Home route
      document.title = 'Twin Check — Is your mainnet contract really the one you tested?';
      // Kick off GSAP animations
      setTimeout(() => {
        initHeroAnimations();
        initScrollAnimations();
      }, 100);
    },
    '/app': () => {
      // App route
      document.title = 'Twin Check — Compare Contract Twins';
      const container = document.getElementById('app-container');
      if (container) {
        renderApp(container);
      }
    },
    '/t/:id': (params) => {
      // Badge route
      document.title = `Twin Check — Verified Report #${params.id}`;
      const container = document.getElementById('app-container');
      if (container) {
        renderBadge(container, params.id);
      }
    },
  });
});

/**
 * Setup navigation bar wallet connect and mobile menu
 */
function setupNavbar() {
  const connectBtn = document.getElementById('nav-connect-btn');
  const checkBtn = document.getElementById('nav-check-btn');
  const hamburger = document.getElementById('nav-hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      try {
        await connectWallet();
        updateNavWallet();
      } catch (err) {
        alert('Could not connect wallet: ' + err.message);
      }
    });
  }

  if (checkBtn) {
    checkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('/app');
    });
  }

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });

    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileNav.classList.remove('open');
      });
    });
  }

  onWalletChange(() => {
    updateNavWallet();
  });
  updateNavWallet();
}

function updateNavWallet() {
  const connectBtn = document.getElementById('nav-connect-btn');
  if (!connectBtn) return;

  if (isConnected()) {
    connectBtn.textContent = getShortAddress(getAddress());
    connectBtn.classList.remove('btn-outline');
    connectBtn.classList.add('btn-mint');
    connectBtn.style.color = '';
  } else {
    connectBtn.textContent = 'Connect wallet';
    connectBtn.classList.remove('btn-mint');
    connectBtn.classList.add('btn-outline');
    connectBtn.style.color = '';
  }
}

/**
 * FAQ accordion expand / collapse
 */
function setupFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Close other items
        faqItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });
}

/**
 * Footer: TwinRegistry address, copy button and explorer link,
 * all driven by REGISTRY_ADDRESS in config.js
 */
function setupFooter() {
  const addrEl = document.getElementById('footer-registry-addr');
  const linkEl = document.getElementById('footer-registry-link');
  const copyBtn = document.getElementById('footer-registry-copy');

  if (addrEl) {
    addrEl.textContent = `${REGISTRY_ADDRESS.slice(0, 6)}…${REGISTRY_ADDRESS.slice(-4)}`;
    addrEl.title = REGISTRY_ADDRESS;
  }
  if (linkEl) {
    linkEl.href = `${MAINNET_EXPLORER}/address/${REGISTRY_ADDRESS}`;
  }
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(REGISTRY_ADDRESS);
        copyBtn.textContent = 'Copied';
      } catch {
        copyBtn.textContent = 'Copy failed';
      }
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    });
  }
}
