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
 * Disable pinch-to-zoom and gesture zoom on iOS/Android
 * Uses multiple strategies for maximum compatibility
 */
function disablePinchZoom() {
  // Track initial touch distance for pinch detection
  let initialTouchDistance = 0;
  let isMultiTouch = false;

  // Calculate distance between two touch points
  function getTouchDistance(touches) {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Prevent pinch zoom via gesturestart (iOS Safari specific)
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, { passive: false, capture: true });

  document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, { passive: false, capture: true });

  document.addEventListener('gestureend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, { passive: false, capture: true });

  // Prevent two-finger zoom via touchstart
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
      isMultiTouch = true;
      initialTouchDistance = getTouchDistance(e.touches);
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    isMultiTouch = false;
  }, { passive: false, capture: true });

  // Prevent two-finger pinch zoom via touchmove (Android & iOS)
  document.addEventListener('touchmove', function(e) {
    if (e.touches.length > 1 || isMultiTouch) {
      // Check if this is a pinch gesture (distance changing)
      const currentDistance = getTouchDistance(e.touches);
      if (initialTouchDistance > 0 && Math.abs(currentDistance - initialTouchDistance) > 10) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Block all multi-touch moves regardless
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { passive: false, capture: true });

  // Reset multi-touch state on touchend
  document.addEventListener('touchend', function(e) {
    if (e.touches.length === 0) {
      isMultiTouch = false;
      initialTouchDistance = 0;
    }
  }, { passive: true });

  // Prevent double-tap zoom via touchend (with improved timing)
  let lastTouchEnd = 0;
  let lastTouchX = 0;
  let lastTouchY = 0;
  document.addEventListener('touchend', function(e) {
    const now = Date.now();
    const touch = e.changedTouches[0];
    const x = touch ? touch.clientX : 0;
    const y = touch ? touch.clientY : 0;
    
    // Check if this is a double-tap (same area, within 300ms)
    const timeDiff = now - lastTouchEnd;
    const distanceDiff = Math.sqrt(Math.pow(x - lastTouchX, 2) + Math.pow(y - lastTouchY, 2));
    
    if (timeDiff < 300 && distanceDiff < 50) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    lastTouchEnd = now;
    lastTouchX = x;
    lastTouchY = y;
  }, { passive: false, capture: true });

  // Additional: Prevent zoom via wheel event (trackpad pinch on desktop)
  document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { passive: false, capture: true });
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
