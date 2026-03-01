/**
 * Inactivity Detection Hook
 * 
 * Detects user inactivity after 30 minutes and shows a warning modal.
 * Tracks mouse movement, keyboard events, and clicks.
 * 
 * Note: This does NOT log out the user - just warns them they've been inactive.
 * User sessions persist across reloads/tabs until they explicitly logout.
 */

import { useEffect, useRef, useState } from 'react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_BEFORE_TIMEOUT = 25 * 60 * 1000; // Show warning at 25 minutes

export function useInactivityDetection() {
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivity = () => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only reset if it's been at least 1 second (debounce)
    if (timeSinceLastActivity < 1000) return;
    
    lastActivityRef.current = now;
    setShowInactivityWarning(false);
    setIsInactive(false);
    
    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    
    // Set warning timer (25 minutes)
    warningTimerRef.current = setTimeout(() => {
      console.log("⚠️ [INACTIVITY] 25 minutes of inactivity - showing warning");
      setShowInactivityWarning(true);
    }, WARNING_BEFORE_TIMEOUT);
    
    // Set inactivity timer (30 minutes)
    inactivityTimerRef.current = setTimeout(() => {
      console.log("⚠️ [INACTIVITY] 30 minutes of inactivity detected");
      setIsInactive(true);
    }, INACTIVITY_TIMEOUT);
  };

  const dismissWarning = () => {
    console.log("✅ [INACTIVITY] User acknowledged warning");
    resetActivity();
  };

  useEffect(() => {
    // Activity event handlers
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Throttled event handler to avoid excessive updates
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleActivity = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        resetActivity();
        throttleTimeout = null;
      }, 1000); // Throttle to max once per second
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timers on mount
    resetActivity();

    // Cleanup on unmount
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (throttleTimeout) clearTimeout(throttleTimeout);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  return {
    showInactivityWarning,
    isInactive,
    dismissWarning,
    resetActivity
  };
}
