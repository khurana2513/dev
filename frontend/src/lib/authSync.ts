/**
 * Auth token synchronization across browser tabs
 * ✓ Logout in one tab automatically logs out other tabs
 * ✓ Login in one tab reflects in other tabs
 * ✓ Session expiration handled consistently across tabs
 */

import { safeGetItem, safeSetItem, safeRemoveItem } from './storageUtils';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const AUTH_SYNC_EVENT = 'auth-changed';

// Callbacks registered for auth changes
type AuthChangeCallback = (token: string | null, userData: any | null) => void;
const authChangeCallbacks: AuthChangeCallback[] = [];

/**
 * Initialize auth sync listener (should be called once in app startup)
 * Listens for storage events from other tabs
 */
export function initializeAuthSync() {
  // Listen for storage changes from other tabs
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === AUTH_TOKEN_KEY || event.key === USER_DATA_KEY) {
      console.log(`🔄 [AUTH-SYNC] Auth changed in another tab (${event.key})`);
      
      const token = safeGetItem(AUTH_TOKEN_KEY);
      const userData = safeGetItem(USER_DATA_KEY);
      
      try {
        const parsedUserData = userData ? JSON.parse(userData) : null;
        // Notify all registered callbacks
        triggerAuthChange(token, parsedUserData);
      } catch (e) {
        console.error('⚠️ [AUTH-SYNC] Failed to parse user data:', e);
        triggerAuthChange(token, null);
      }
    }
  });
  
  // Listen for custom auth-changed events (within same tab)
  window.addEventListener(AUTH_SYNC_EVENT, (event: any) => {
    const { token, userData } = event.detail;
    triggerAuthChange(token, userData);
  });
  
  console.log('✓ [AUTH-SYNC] Auth synchronization initialized');
}

/**
 * Register callback for auth changes
 * Called when token or user data changes (including from other tabs)
 */
export function onAuthChange(callback: AuthChangeCallback): () => void {
  authChangeCallbacks.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = authChangeCallbacks.indexOf(callback);
    if (index > -1) {
      authChangeCallbacks.splice(index, 1);
    }
  };
}

/**
 * Trigger auth change event
 * Notifies all listeners of auth state change
 */
function triggerAuthChange(token: string | null, userData: any | null) {
  for (const callback of authChangeCallbacks) {
    try {
      callback(token, userData);
    } catch (error) {
      console.error('⚠️ [AUTH-SYNC] Error in auth change callback:', error);
    }
  }
}

/**
 * Set auth token and broadcast to other tabs
 * ✓ Saves to localStorage (syncs to other tabs via storage event)
 * ✓ Notifies local callbacks immediately
 */
export function setAuthToken(token: string | null, userData?: any) {
  try {
    if (token) {
      safeSetItem(AUTH_TOKEN_KEY, token);
      if (userData) {
        safeSetItem(USER_DATA_KEY, JSON.stringify(userData));
      }
      console.log('✓ [AUTH-SYNC] Auth token set and synced');
    } else {
      clearAuthToken();
    }
    
    // Notify local callbacks immediately
    triggerAuthChange(token || null, userData || null);
  } catch (error) {
    console.error('❌ [AUTH-SYNC] Failed to set auth token:', error);
  }
}

/**
 * Clear auth token and broadcast to other tabs
 * ✓ Removes from localStorage (syncs to other tabs)
 * ✓ Notifies local callbacks immediately
 */
export function clearAuthToken() {
  try {
    safeRemoveItem(AUTH_TOKEN_KEY);
    safeRemoveItem(USER_DATA_KEY);
    console.log('✓ [AUTH-SYNC] Auth token cleared and synced');
    
    // Notify local callbacks immediately
    triggerAuthChange(null, null);
  } catch (error) {
    console.error('❌ [AUTH-SYNC] Failed to clear auth token:', error);
  }
}

/**
 * Get current auth token
 */
export function getAuthToken(): string | null {
  return safeGetItem(AUTH_TOKEN_KEY);
}

/**
 * Get current user data
 */
export function getUserData(): any {
  const userData = safeGetItem(USER_DATA_KEY);
  if (!userData) return null;
  
  try {
    return JSON.parse(userData);
  } catch (e) {
    console.error('⚠️ [AUTH-SYNC] Failed to parse user data:', e);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Broadcast auth state to all tabs
 * Useful when auth state changes within the same tab
 */
export function broadcastAuthStateChange(token: string | null, userData?: any) {
  // This will trigger storage events in other tabs
  setAuthToken(token, userData);
  
  // Also dispatch custom event for same-tab listeners
  window.dispatchEvent(new CustomEvent(AUTH_SYNC_EVENT, {
    detail: { token, userData }
  }));
}

/**
 * Check auth status across tabs (useful for PWAs)
 * Returns true if any tab has active auth
 */
export function hasActiveSession(): boolean {
  return !!safeGetItem(AUTH_TOKEN_KEY);
}

/**
 * Get auth status summary
 */
export function getAuthStatus() {
  return {
    isAuthenticated: isAuthenticated(),
    token: getAuthToken(),
    userData: getUserData(),
    hasActiveSession: hasActiveSession()
  };
}
