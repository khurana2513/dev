/**
 * Storage utilities with quota management and error handling
 * ✓ Prevents silent failures from localStorage quota exceeded
 * ✓ Monitors storage usage and provides warnings
 */

const STORAGE_WARNING_THRESHOLD = 0.8; // Warn at 80% quota
const STORAGE_CRITICAL_THRESHOLD = 0.95; // Critical at 95% quota

/**
 * Estimate localStorage quota usage
 * Note: Exact quota varies by browser (usually 5-10MB)
 */
export async function getStorageQuotaInfo(): Promise<{ usage: number; quota: number; percentage: number }> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 5 * 1024 * 1024, // Fallback to 5MB
        percentage: ((estimate.usage || 0) / (estimate.quota || 5 * 1024 * 1024))
      };
    }
  } catch (e) {
    console.warn('⚠️ Storage quota API unavailable:', e);
  }
  
  // Fallback: estimate based on localStorage size
  return estimateStorageFromLocalStorage();
}

/**
 * Estimate localStorage size manually
 */
function estimateStorageFromLocalStorage(): { usage: number; quota: number; percentage: number } {
  let totalSize = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalSize += localStorage[key].length + key.length;
    }
  }
  
  const assumedQuota = 5 * 1024 * 1024; // 5MB default assumption
  return {
    usage: totalSize,
    quota: assumedQuota,
    percentage: totalSize / assumedQuota
  };
}

/**
 * Safe localStorage setItem with quota checking
 * ✓ Logs warnings if quota is getting full
 * ✓ Throws error if quota would be exceeded
 * ✓ Suggests cleanup if necessary
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    // Check current usage
    const estimate = estimateStorageFromLocalStorage();
    
    if (estimate.percentage > STORAGE_CRITICAL_THRESHOLD) {
      console.error('🚨 [STORAGE] Critical: localStorage quota almost full!');
      console.log('📊 Current usage:', (estimate.usage / 1024).toFixed(2), 'KB of', (estimate.quota / 1024).toFixed(2), 'KB');
      console.log('💡 Consider clearing cache or old data');
      throw new Error('Storage quota critical - unable to save');
    }
    
    if (estimate.percentage > STORAGE_WARNING_THRESHOLD) {
      console.warn('⚠️ [STORAGE] Warning: localStorage quota is high!');
      console.log('📊 Current usage:', (estimate.usage / 1024).toFixed(2), 'KB of', (estimate.quota / 1024).toFixed(2), 'KB');
    }
    
    // Try to set the item
    localStorage.setItem(key, value);
    
    // Verify it was actually stored (some browsers throw on quota exceeded)
    if (localStorage.getItem(key) !== value) {
      throw new Error('Failed to set item - quota may be exceeded');
    }
    
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('❌ [STORAGE] localStorage quota exceeded!');
      console.error('💡 Please clear browser cache or old data');
      throw error;
    }
    throw error;
  }
}

/**
 * Safe localStorage getItem
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('❌ [STORAGE] Error reading from localStorage:', error);
    return null;
  }
}

/**
 * Safe localStorage removal
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('❌ [STORAGE] Error removing from localStorage:', error);
    return false;
  }
}

/**
 * Get all localStorage keys (with error handling)
 */
export function getAllStorageKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  } catch (error) {
    console.error('❌ [STORAGE] Error accessing localStorage keys:', error);
    return [];
  }
}

/**
 * Clear specific key pattern from localStorage
 * Useful for cleanup: clearByPattern('cache_*')
 */
export function clearByPattern(pattern: string): number {
  const regex = new RegExp(pattern.replace('*', '.*'));
  const keys = getAllStorageKeys();
  let cleared = 0;
  
  for (const key of keys) {
    if (regex.test(key)) {
      safeRemoveItem(key);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    console.log(`🧹 [STORAGE] Cleared ${cleared} items matching pattern '${pattern}'`);
  }
  
  return cleared;
}

/**
 * Request persistent storage (useful for PWAs)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersistent = await navigator.storage.persist();
      if (isPersistent) {
        console.log('✓ [STORAGE] Persistent storage granted');
      } else {
        console.warn('⚠️ [STORAGE] Persistent storage denied by user');
      }
      return isPersistent;
    }
  } catch (e) {
    console.warn('⚠️ [STORAGE] Persistent storage API unavailable:', e);
  }
  return false;
}
