/**
 * Simple hash-based router for SPA
 */
class Router {
  constructor() {
    this.routes = {};
    this.currentView = null;
    this.currentParams = {};
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  /**
   * Register a route
   * @param {string} path - Route path (e.g., '/', '/view/:id')
   * @param {object} handler - { init: Function, destroy: Function }
   */
  on(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  /**
   * Navigate to a route
   * @param {string} path - Route path
   */
  navigate(path) {
    window.location.hash = path;
  }

  /**
   * Parse current hash and match route
   */
  handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const { handler, params, viewName } = this.matchRoute(hash);

    if (!handler) {
      console.warn('No route found for:', hash);
      // Default to library view
      this.navigate('/');
      return;
    }

    // Destroy previous view if exists
    if (this.currentView && this.currentView.destroy) {
      this.currentView.destroy();
    }

    // Store current state
    this.currentView = handler;
    this.currentParams = params;

    // Show correct view container
    this.showView(viewName);

    // Initialize new view
    if (handler.init) {
      handler.init(params);
    }
  }

  /**
   * Match a hash to a route
   */
  matchRoute(hash) {
    // Direct match first
    if (this.routes[hash]) {
      return { 
        handler: this.routes[hash], 
        params: {},
        viewName: hash === '/' ? 'library' : hash.slice(1)
      };
    }

    // Pattern matching for dynamic routes (e.g., /view/:id)
    for (const [pattern, handler] of Object.entries(this.routes)) {
      const params = this.matchPattern(pattern, hash);
      if (params) {
        const viewName = pattern.split('/')[1] || 'library';
        return { handler, params, viewName };
      }
    }

    return { handler: null, params: {}, viewName: null };
  }

  /**
   * Match a pattern against a hash
   * @param {string} pattern - Route pattern (e.g., '/view/:id')
   * @param {string} hash - Current hash
   * @returns {object|null} - Params object or null if no match
   */
  matchPattern(pattern, hash) {
    const patternParts = pattern.split('/');
    const hashParts = hash.split('/');

    if (patternParts.length !== hashParts.length) {
      return null;
    }

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        // Dynamic parameter
        params[patternParts[i].slice(1)] = hashParts[i];
      } else if (patternParts[i] !== hashParts[i]) {
        // Static part doesn't match
        return null;
      }
    }

    return params;
  }

  /**
   * Show specific view and hide others
   */
  showView(viewName) {
    const views = document.querySelectorAll('[data-view]');
    views.forEach(view => {
      if (view.dataset.view === viewName) {
        view.style.display = '';
        view.classList.add('active');
      } else {
        view.style.display = 'none';
        view.classList.remove('active');
      }
    });
  }

  /**
   * Get current route params
   */
  getParams() {
    return this.currentParams;
  }
}

// Create and export router instance
window.router = new Router();
