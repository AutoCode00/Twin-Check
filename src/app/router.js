/**
 * router.js — SPA client-side router for Twin Check
 *
 * Supported paths:
 *   '/'      — Marketing homepage (10 sections)
 *   '/app'   — Twin Check comparison tool
 *   '/t/:id' — Verified twin badge page
 *
 * Also handles GitHub Pages 404 redirection recovery from sessionStorage.
 */

let routes = {};
let currentPath = '';

/**
 * Register routes and start router.
 * @param {Object.<string, Function>} routeMap - { '/': fn, '/app': fn, '/t/:id': fn }
 */
export function initRouter(routeMap) {
  routes = routeMap;

  // Handle GitHub Pages 404 redirect parameter if present
  const redirectedPath = sessionStorage.getItem('spa-redirect');
  if (redirectedPath) {
    sessionStorage.removeItem('spa-redirect');
    history.replaceState(null, '', redirectedPath);
  }

  // Handle popstate (back/forward)
  window.addEventListener('popstate', () => {
    handleRoute(window.location.pathname);
  });

  // Handle clicks on internal links <a href="/app">
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    // Only intercept internal relative or root-absolute paths, not external or hashes
    if (href && (href.startsWith('/') || href.startsWith('./')) && !href.startsWith('//') && !link.target) {
      const url = new URL(link.href);
      if (url.origin === window.location.origin) {
        e.preventDefault();
        navigateTo(url.pathname);
      }
    }
  });

  // Initial dispatch
  handleRoute(window.location.pathname);
}

/**
 * Programmatically navigate to path.
 * @param {string} path - Target path e.g. '/app' or '/t/12'
 */
export function navigateTo(path) {
  if (path !== window.location.pathname) {
    history.pushState(null, '', path);
  }
  handleRoute(path);
}

/**
 * Match current path against registered routes.
 */
function handleRoute(path) {
  // Normalize path
  let normalized = path.replace(/\/index\.html$/, '') || '/';
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  currentPath = normalized;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Exact match
  if (routes[normalized]) {
    routes[normalized]({});
    updateViewClasses(normalized);
    return;
  }

  // Pattern match e.g. /t/:id
  for (const pattern of Object.keys(routes)) {
    if (pattern.includes(':')) {
      const paramName = pattern.split(':')[1];
      const prefix = pattern.split(':')[0]; // e.g. '/t/'
      if (normalized.startsWith(prefix) && normalized.length > prefix.length) {
        const paramVal = normalized.slice(prefix.length);
        routes[pattern]({ [paramName]: paramVal });
        updateViewClasses(normalized);
        return;
      }
    }
  }

  // Fallback to home
  if (routes['/']) {
    routes['/']({});
    updateViewClasses('/');
  }
}

/**
 * Toggle CSS classes on document body between website mode and app mode.
 */
function updateViewClasses(path) {
  const isHome = path === '/';
  document.body.classList.toggle('website-view', isHome);
  document.body.classList.toggle('app-view', !isHome);

  const websiteSections = document.querySelectorAll('.website-section');
  const appContainer = document.getElementById('app-container');

  if (isHome) {
    websiteSections.forEach(sec => sec.style.display = '');
    if (appContainer) appContainer.style.display = 'none';
  } else {
    websiteSections.forEach(sec => sec.style.display = 'none');
    if (appContainer) appContainer.style.display = 'block';
  }
}
