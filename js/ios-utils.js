/**
 * iOS-specific utility functions
 * Handles iOS viewport height fixes and safe area handling
 */

/**
 * Set viewport height CSS variable for iOS devices
 * iOS Safari viewport height changes when address bar appears/disappears
 */
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

/**
 * Disable pinch-to-zoom and gesture zoom on iOS
 */
function disablePinchZoom() {
  // Prevent pinch zoom via gesturestart (iOS Safari)
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('gestureend', function(e) {
    e.preventDefault();
  }, { passive: false });

  // Prevent two-finger pinch zoom via touchmove (Android & iOS)
  document.addEventListener('touchmove', function(e) {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent two-finger zoom via touchstart
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent double-tap zoom via touchend
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
}

/**
 * Initialize iOS viewport height handling
 */
function initializeIOSViewport() {
  setViewportHeight();
  window.addEventListener('resize', window.debounce(setViewportHeight, 100));
  window.addEventListener('orientationchange', () => {
    setTimeout(setViewportHeight, 100);
  });
  // Disable zoom on mobile devices
  disablePinchZoom();
}

// Export to window for global access
window.initializeIOSViewport = initializeIOSViewport;
window.disablePinchZoom = disablePinchZoom;
