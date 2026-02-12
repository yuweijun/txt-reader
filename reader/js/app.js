/**
 * Main App Entry Point for Text Reader SPA
 * Initializes the router and sets up routes
 */

// Fix iOS 100vh issue - set CSS custom property for true viewport height
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Set initial value and update on resize/orientation change
setViewportHeight();
window.addEventListener('resize', window.debounce(setViewportHeight, 100));
window.addEventListener('orientationchange', () => {
  setTimeout(setViewportHeight, 100);
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Register routes
  window.router
    .on('/', {
      init: () => {
        LibraryController.init();
      },
      destroy: () => {
        LibraryController.destroy();
      }
    })
    .on('/view/:id', {
      init: (params) => {
        ViewerController.init(params);
      },
      destroy: () => {
        ViewerController.destroy();
      }
    });

  // Handle initial route (router handles this via 'load' event listener)
  // The router already listens for 'load' and 'hashchange' events
});

// Legacy support: redirect from old URL format
(function() {
  // Check if we're coming from old viewer.html#view/xxx URL pattern
  const currentPath = window.location.pathname;
  if (currentPath.includes('viewer.html')) {
    const hash = window.location.hash;
    if (hash.startsWith('#view/')) {
      // Redirect to new SPA format
      window.location.href = 'app.html' + hash.replace('#view/', '#/view/');
    }
  }
})();
