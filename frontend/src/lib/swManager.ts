/**
 * Service Worker registration and management
 * ✓ Registers service worker for offline support
 * ✓ Handles updates and cache management
 * ✓ Provides offline status detection
 */

/**
 * Register service worker (call from App.tsx on startup)
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ [SW] Service Workers not supported in this browser');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('✓ [SW] Service Worker registered successfully');
    
    // Check for updates periodically
    setInterval(() => {
      registration.update().catch(err => {
        console.warn('⚠️ [SW] Error checking for updates:', err);
      });
    }, 60000); // Check every 60 seconds
    
    // Listen for updates
    registration.addEventListener('updatefound', () => {
      console.log('📦 [SW] Service Worker update found');
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('⚡ [SW] New Service Worker ready - reload to activate');
            notifyUserOfUpdate();
          }
        });
      }
    });
    
    return registration;
  } catch (error) {
    console.error('❌ [SW] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('✓ [SW] Service Worker unregistered');
    }
    return true;
  } catch (error) {
    console.error('❌ [SW] Error unregistering Service Worker:', error);
    return false;
  }
}

/**
 * Clear all service worker caches
 */
export async function clearServiceWorkerCaches(): Promise<void> {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
    console.log('✓ [SW] All caches cleared');
  } catch (error) {
    console.error('❌ [SW] Error clearing caches:', error);
  }
}

/**
 * Detect online/offline status
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline status changes
 */
export function onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Message service worker to clear caches
 */
export async function askServiceWorkerToClearCaches(): Promise<void> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    console.warn('⚠️ [SW] Service Worker not active');
    return;
  }
  
  navigator.serviceWorker.controller.postMessage({
    type: 'CLEAR_CACHES'
  });
  console.log('✓ [SW] Asked Service Worker to clear caches');
}

/**
 * Notify user of service worker update
 * You can customize this to show a toast/notification
 */
function notifyUserOfUpdate() {
  // Dispatch custom event that app can listen to
  window.dispatchEvent(new CustomEvent('sw-update-available'));
  
  // Or show a notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Update Available', {
      body: 'A new version of the app is available. Refresh to get the latest features.',
      badge: '/favicon.ico'
    });
  }
}

/**
 * Update service worker (force refresh with new version)
 */
export async function updateServiceWorker(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.update();
  }
  console.log('✓ [SW] Update check triggered');
}

/**
 * Get service worker registration details
 */
export async function getServiceWorkerStatus(): Promise<{
  registered: boolean;
  active: boolean;
  pending: boolean;
  installing: boolean;
}> {
  if (!('serviceWorker' in navigator)) {
    return { registered: false, active: false, pending: false, installing: false };
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      registered: !!registration,
      active: !!registration?.active,
      pending: !!registration?.waiting,
      installing: !!registration?.installing
    };
  } catch {
    return { registered: false, active: false, pending: false, installing: false };
  }
}
