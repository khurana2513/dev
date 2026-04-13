/**
 * Centralized API Client with:
 * - Retry logic
 * - Auth guards
 * - Global error handling
 * - Request deduplication
 * - Timeout handling
 * - Proper error parsing
 */

import { buildApiUrl, getApiBaseCandidates, looksLikeHtmlDocument, resolveApiBase, setActiveApiBase } from "./apiBase";

const API_BASE = resolveApiBase();
const DEFAULT_TIMEOUT = 30000; // 30 seconds (was 15s — too short, caused cascading retries)
const MUTATION_TIMEOUT = 45000; // 45 seconds for POST/PUT/DELETE (heavier ops)
const MAX_RETRIES = 2; // Reduced from 3 — fewer retries = fewer duplicate requests on slow backend
const RETRY_DELAY = 1000; // 1 second base delay
const MAX_PENDING_REQUESTS = 50; // Prevent unbounded cache growth
const REQUEST_CACHE_TTL = 5000; // Clear requests older than 5 seconds
console.log("🌍 API_BASE =", API_BASE);

// Request deduplication cache with automatic cleanup
// ✓ Prevents memory leaks with automatic TTL and max size limits
const pendingRequests = new Map<string, { 
  promise: Promise<any>; 
  timestamp: number;
}>();

// Periodic cleanup of stale requests (every 10 seconds)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of pendingRequests.entries()) {
    if (now - value.timestamp > REQUEST_CACHE_TTL) {
      pendingRequests.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.debug(`🧹 [API] Cleaned ${cleaned} stale pending requests`);
  }
}, 10000);

/**
 * Enforce maximum cache size to prevent memory leaks
 */
function _enforceMaxPendingRequests() {
  if (pendingRequests.size > MAX_PENDING_REQUESTS) {
    // Remove oldest entries (FIFO)
    const entries = Array.from(pendingRequests.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = entries.slice(0, entries.length - MAX_PENDING_REQUESTS);
    for (const [key] of toDelete) {
      pendingRequests.delete(key);
    }
    console.warn(`⚠️ [API] Request cache exceeded ${MAX_PENDING_REQUESTS} items, removed oldest ${toDelete.length} entries`);
  }
}

// Auth state tracking
let authReady = false;
let authToken: string | null = null;
let isRefreshingToken = false;
let refreshTokenPromise: Promise<string | null> | null = null;

/**
 * Set auth ready state (called by AuthContext)
 */
export function setAuthReady(ready: boolean) {
  authReady = ready;
}

/**
 * Set auth token (called by AuthContext)
 */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/**
 * Get in-memory auth token.
 * Header-based auth is kept only as a backward-compatible fallback while
 * HttpOnly cookie auth is the primary mechanism.
 */
function getAuthToken(): string | null {
  return authToken;
}

function clearClientAuthState(clearUserData: boolean = true) {
  authToken = null;
  if (typeof window !== "undefined" && clearUserData) {
    localStorage.removeItem("user_data");
  }
}

async function clearServerSession(): Promise<void> {
  try {
    await fetch(buildApiUrl("/users/auth/logout"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
  } catch (error) {
    console.warn("⚠️ [API] Failed to clear server session:", error);
  }
}

/**
 * Attempt to refresh the access token using refresh token
 * Returns new access token or null if refresh fails
 */
async function attemptTokenRefresh(): Promise<string | null> {
  // If already refreshing, wait for that promise
  if (isRefreshingToken && refreshTokenPromise) {
    console.log("🔄 [API] Token refresh already in progress, waiting...");
    return refreshTokenPromise;
  }

  isRefreshingToken = true;
  
  refreshTokenPromise = (async () => {
    try {
      console.log("🔄 [API] Attempting to refresh access token");
      
      const response = await fetch(buildApiUrl("/users/auth/refresh"), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        console.error("❌ [API] Token refresh failed:", response.status);
        await clearServerSession();
        clearClientAuthState();
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.access_token;
      
      authToken = newAccessToken;
      
      console.log("✅ [API] Token refreshed successfully");
      return newAccessToken;
    } catch (error) {
      console.error("❌ [API] Token refresh error:", error);
      await clearServerSession();
      clearClientAuthState();
      return null;
    } finally {
      isRefreshingToken = false;
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
}


/**
 * Wait for auth to be ready (with timeout)
 */
async function waitForAuth(timeout: number = 5000): Promise<boolean> {
  if (authReady) return true;
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (authReady) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
}

/**
 * Create request key for deduplication
 */
function createRequestKey(method: string, url: string, body?: any): string {
  const bodyStr = body ? JSON.stringify(body) : '';
  return `${method}:${url}:${bodyStr}`;
}

/**
 * Sleep utility for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildCandidateUrls(endpoint: string): string[] {
  if (endpoint.startsWith("http")) {
    return [endpoint];
  }
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return getApiBaseCandidates().map((base) => `${base}${normalizedEndpoint}`);
}

function getAlternativeUrls(currentUrl: string, endpoint: string): string[] {
  return buildCandidateUrls(endpoint).filter((candidate) => candidate !== currentUrl);
}

function extractApiBase(url: string, endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (url.endsWith(normalizedEndpoint)) {
    return url.slice(0, -normalizedEndpoint.length);
  }
  return url.replace(/\/+$/, "");
}

/**
 * Parse error response safely
 */
async function parseErrorResponse(response: Response): Promise<{ detail?: string; message?: string; error?: string }> {
  try {
    const text = await response.text();
    if (!text) {
      return { detail: `Request failed with status ${response.status}` };
    }
    try {
      return JSON.parse(text);
    } catch {
      return { detail: text || `Request failed with status ${response.status}` };
    }
  } catch {
    return { detail: `Request failed with status ${response.status}` };
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, response?: Response): boolean {
  // Network errors are retryable (including ERR_EMPTY_RESPONSE)
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }
  
  // ERR_EMPTY_RESPONSE - connection closed without response
  if (error.message && (
    error.message.includes('ERR_EMPTY_RESPONSE') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('network error') ||
    error.message.includes('NetworkError')
  )) {
    return true;
  }
  
  // Timeout errors are retryable
  if (error.name === 'AbortError') {
    return true;
  }
  
  // 5xx errors are retryable (server errors)
  if (response && response.status >= 500 && response.status < 600) {
    return true;
  }
  
  // 429 (Too Many Requests) is retryable
  if (response && response.status === 429) {
    return true;
  }
  
  // 408 (Request Timeout) is retryable
  if (response && response.status === 408) {
    return true;
  }
  
  return false;
}

/**
 * Create error from response or error object
 */
function createApiError(error: any, response?: Response, errorData?: any): Error {
  // Check for specific error messages in response
  if (errorData?.detail) {
    return new Error(errorData.detail);
  }
  if (errorData?.message) {
    return new Error(errorData.message);
  }
  if (errorData?.error) {
    return new Error(errorData.error);
  }
  if (errorData?.hint) {
    return new Error(errorData.hint);
  }
  
  // Handle specific HTTP status codes with helpful messages
  if (response) {
    const status = response.status;
    
    if (status === 502) {
      return new Error(
        'Backend server is not responding. Please check:\n' +
        '1. Backend is running: `docker-compose ps` or check backend logs\n' +
        '2. Backend is accessible on port 8002 (or configured port)\n' +
        '3. Try refreshing the page or restarting the backend'
      );
    }
    
    if (status === 503) {
      return new Error('Service temporarily unavailable. Please try again in a moment.');
    }
    
    if (status === 504) {
      return new Error('Request timeout. The backend is taking too long to respond.');
    }
    
    if (status === 404) {
      return new Error('Endpoint not found. The requested resource does not exist.');
    }

    if (status === 405) {
      return new Error('Method not allowed. This usually means the request hit the wrong host or path instead of the backend API.');
    }
    
    if (status >= 500) {
      return new Error(`Server error (${status}). Please try again or contact support if the problem persists.`);
    }
    
    return new Error(`Request failed with status ${status}`);
  }
  
  if (error instanceof Error) {
    return error;
  }
  return new Error(error?.toString() || 'Unknown error');
}











/**
 * Make API request with retry logic
 */
async function apiRequest<T>(
  method: string,
  endpoint: string,
  options: {
    body?: any;
    headers?: HeadersInit;
    timeout?: number;
    retries?: number;
    requireAuth?: boolean;
    skipAuthCheck?: boolean;
  } = {}
): Promise<T> {

// ❌ Prevent bypassing Vite / Nginx proxy
if (endpoint.startsWith("http")) {
  throw new Error(
    "Absolute API URLs are forbidden. Use relative '/api/...' endpoints only."
  );
}



  const {
    body,
    headers = {},
    timeout: explicitTimeout,
    retries: explicitRetries,
    requireAuth = true,
    skipAuthCheck = false,
  } = options;

  // Auto-select timeout and retries based on HTTP method
  // Mutations (POST/PUT/DELETE) get longer timeout, fewer retries to avoid duplicates
  const isMutation = method !== 'GET';
  const timeout = explicitTimeout ?? (isMutation ? MUTATION_TIMEOUT : DEFAULT_TIMEOUT);
  const retries = explicitRetries ?? (isMutation ? 1 : MAX_RETRIES);

  // Wait for auth if required
  if (requireAuth && !skipAuthCheck) {
    const authIsReady = await waitForAuth();
    if (!authIsReady) {
      throw new Error('Authentication not ready. Please wait and try again.');
    }
  }

  const primaryUrl = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
  const requestKey = createRequestKey(method, primaryUrl, body);

  // Check for pending duplicate request (GET only — mutations must not be deduplicated)
  if (!isMutation) {
    const cachedRequest = pendingRequests.get(requestKey);
    if (cachedRequest) {
      console.log(`🔄 [API] Deduplicating request: ${method} ${endpoint}`);
      return cachedRequest.promise;
    }
  }

  // Create request promise
  const requestPromise = (async (): Promise<T> => {
    let lastError: any;
    let lastResponse: Response | undefined;
    let currentUrl = primaryUrl;
    let fallbackUrls = getAlternativeUrls(primaryUrl, endpoint);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Prepare headers
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(headers as Record<string, string>),
        };

        // Add auth token if available
        const token = getAuthToken();
        if (token && requireAuth) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);

        // Log request (only first attempt to avoid spam)
        if (attempt === 0) {
          console.log(`🔄 [API] ${method} ${endpoint}${attempt > 0 ? ` (retry ${attempt})` : ''}`);
        }

        // Make request
        const fetchOptions: RequestInit = {
          method,
          headers: requestHeaders,
          signal: controller.signal,
          credentials: 'include',
        };

        if (body !== undefined) {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(currentUrl, fetchOptions);
        clearTimeout(timeoutId);

        lastResponse = response;

        // Handle success
        if (response.ok) {
          const text = await response.text();
          if (!text) {
            return null as T;
          }
          if (looksLikeHtmlDocument(text)) {
            if (fallbackUrls.length > 0) {
              currentUrl = fallbackUrls.shift() as string;
              continue;
            }
            throw new Error(`API misconfiguration: ${method} ${endpoint} returned HTML instead of JSON. Resolved URL: ${currentUrl}`);
          }
          try {
            if (!endpoint.startsWith("http")) {
              setActiveApiBase(extractApiBase(currentUrl, endpoint));
            }
            return JSON.parse(text) as T;
          } catch {
            // Some endpoints return empty body, return null
            return null as T;
          }
        }

        // Handle errors
        const errorData = await parseErrorResponse(response);

        if ((response.status === 404 || response.status === 405) && fallbackUrls.length > 0) {
          currentUrl = fallbackUrls.shift() as string;
          continue;
        }

        // Check if error is retryable
        if (attempt < retries && isRetryableError(errorData, response)) {
          const delay = RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff
          console.log(`⚠️ [API] Retryable error (${response.status}), retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        // Non-retryable error or max retries reached
        throw createApiError(errorData, response, errorData);

      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || error?.toString() || '';
        
        // Handle abort (timeout)
        if (error.name === 'AbortError') {
          if (attempt < retries) {
            const delay = RETRY_DELAY * Math.pow(2, attempt);
            console.log(`⏱️ [API] Request timeout, retrying in ${delay}ms...`);
            await sleep(delay);
            continue;
          }
          throw new Error(
            `Request timeout after ${timeout}ms.\n\n` +
            'The backend is not responding. Please check:\n' +
            '1. Backend is running: `docker-compose ps` or check backend process\n' +
            '2. Backend logs: `docker-compose logs backend` or check backend console\n' +
            '3. Backend port: Ensure backend is running on the expected port (default: 8000)\n' +
            '4. Network connectivity: Check if backend is accessible'
          );
        }

        // Handle ERR_EMPTY_RESPONSE and network errors
        // ERR_EMPTY_RESPONSE occurs when connection closes without response
        const isNetworkError = error.name === 'TypeError' && errorMessage.includes('fetch');
        const isEmptyResponse = errorMessage.includes('ERR_EMPTY_RESPONSE') || 
                                errorMessage.includes('Failed to fetch') ||
                                errorMessage.includes('network error') ||
                                errorMessage.includes('NetworkError');
        
        if (isNetworkError || isEmptyResponse) {
          if (fallbackUrls.length > 0) {
            currentUrl = fallbackUrls.shift() as string;
            continue;
          }
          if (attempt < retries) {
            const delay = RETRY_DELAY * Math.pow(2, attempt);
            const errorType = isEmptyResponse ? 'Empty response (connection closed)' : 'Network error';
            console.log(`🌐 [API] ${errorType}, retrying in ${delay}ms...`);
            await sleep(delay);
            continue;
          }
          
          // After all retries failed
          throw new Error(
            isEmptyResponse
              ? 'Connection closed unexpectedly (ERR_EMPTY_RESPONSE).\n\n' +
                'This usually means:\n' +
                '1. Backend crashed or closed the connection mid-request\n' +
                '2. Backend is overloaded and dropping connections\n' +
                '3. Network interruption occurred\n\n' +
                'Please check:\n' +
                '1. Backend logs for errors: `docker-compose logs backend`\n' +
                '2. Backend is running: `docker-compose ps`\n' +
                '3. Backend resources (memory/CPU) are sufficient\n' +
                '4. Try refreshing the page'
              : 'Network error: Backend is unreachable.\n\n' +
                'Please check:\n' +
                '1. Backend is running: `docker-compose ps` or check backend process\n' +
                '2. Backend is accessible: Check if backend URL is correct\n' +
                '3. Firewall/VPN: Ensure no firewall is blocking the connection\n' +
                '4. Try restarting the backend: `docker-compose restart backend`'
          );
        }

        // Handle 401 Unauthorized - attempt token refresh
        if (lastResponse?.status === 401) {
          console.log("⚠️ [API] 401 Unauthorized - attempting token refresh");
          
          const newToken = await attemptTokenRefresh();
          
          if (newToken) {
            console.log("✅ [API] Token refreshed, retrying request");
            // Retry the request with new token (one time only)
            continue;
          } else {
            console.log("❌ [API] Token refresh failed - user must log in again");
            clearClientAuthState();
            throw new Error('Unauthorized: Please log in again.');
          }
        }

        // Non-retryable error
        if (attempt === retries) {
          throw createApiError(error, lastResponse);
        }

        // Retry for other errors
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
      }
    }

    // Should never reach here, but just in case
    throw createApiError(lastError, lastResponse);
  })();

  // Store pending request with timestamp for TTL tracking
  _enforceMaxPendingRequests(); // Prevent unbounded growth
  pendingRequests.set(requestKey, { promise: requestPromise, timestamp: Date.now() });

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Clean up pending request (always)
    pendingRequests.delete(requestKey);
  }
}

/**
 * API Client methods
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: { requireAuth?: boolean; timeout?: number }) =>
    apiRequest<T>('GET', endpoint, { ...options }),

  post: <T>(endpoint: string, body?: any, options?: { requireAuth?: boolean; timeout?: number }) =>
    apiRequest<T>('POST', endpoint, { body, ...options }),

  put: <T>(endpoint: string, body?: any, options?: { requireAuth?: boolean; timeout?: number }) =>
    apiRequest<T>('PUT', endpoint, { body, ...options }),

  patch: <T>(endpoint: string, body?: any, options?: { requireAuth?: boolean; timeout?: number }) =>
    apiRequest<T>('PATCH', endpoint, { body, ...options }),

  delete: <T>(endpoint: string, options?: { requireAuth?: boolean; timeout?: number }) =>
    apiRequest<T>('DELETE', endpoint, { ...options }),

  // Special method for login (no auth required)
  login: <T>(endpoint: string, body?: any) =>
    apiRequest<T>('POST', endpoint, { body, requireAuth: false, skipAuthCheck: true }),
};

export default apiClient;
