import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, loginWithGoogle, getCurrentUser, removeAuthToken, setAuthToken, refreshAccessToken } from "../lib/userApi";
import { setAuthReady, setAuthToken as setApiAuthToken } from "../lib/apiClient";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mark auth as not ready initially
    setAuthReady(false);
    setApiAuthToken(null);
    
    // Check if user is already logged in
    const token = localStorage.getItem("auth_token");
    console.log("🟡 [AUTH] Initializing - token present:", !!token);
    
    if (token) {
      console.log("🟡 [AUTH] Token found, fetching user...");
      setApiAuthToken(token);
      
      // Try to get current user - if it fails, token might be expired
      getCurrentUser()
        .then((userData) => {
          console.log("✅ [AUTH] User restored from token:", userData.email);
          setUser(userData);
          setAuthReady(true);
          setApiAuthToken(token);
        })
        .catch(async (error: any) => {
          console.error("❌ [AUTH] Failed to restore user:", error);
          console.error("❌ [AUTH] Error message:", error?.message);
          console.error("❌ [AUTH] Error type:", error?.name);
          
          // Only remove token if it's a 401 (unauthorized) - token expired
          const errorMsg = error?.message || "";
          const isUnauthorized = errorMsg.includes("Unauthorized") || 
                                errorMsg.includes("401") || 
                                error?.name === "Unauthorized" ||
                                errorMsg.includes("Please log in again");
          
          if (isUnauthorized) {
            console.log("🔄 [AUTH] Token expired/invalid (401), attempting refresh...");
            
            // Try to refresh the token first
            const refreshToken = localStorage.getItem("refresh_token");
            if (refreshToken) {
              try {
                console.log("🔄 [AUTH] Attempting token refresh with refresh token");
                const refreshResponse = await refreshAccessToken(refreshToken);
                console.log("✅ [AUTH] Token refreshed successfully");
                setAuthToken(refreshResponse.access_token);
                setApiAuthToken(refreshResponse.access_token);
                
                // Retry getting current user with new token
                const userData = await getCurrentUser();
                console.log("✅ [AUTH] User restored after token refresh:", userData.email);
                setUser(userData);
                localStorage.setItem("user_data", JSON.stringify(userData));
                setAuthReady(true);
                setLoading(false);
                return;
              } catch (refreshError) {
                console.error("❌ [AUTH] Token refresh failed:", refreshError);
                // Fall through to check stored user data
              }
            }
            
            // Check if we have stored user data - use it temporarily to prevent immediate logout
            // This helps if SECRET_KEY changed or token format issue (user can still use app)
            const storedUser = localStorage.getItem("user_data");
            if (storedUser) {
              try {
                const userData = JSON.parse(storedUser);
                console.log("⚠️ [AUTH] Token invalid but using stored user data:", userData.email);
                console.log("⚠️ [AUTH] User will need to re-login for fresh token");
                setUser(userData); // Use stored data temporarily
                // Keep token removed - user will need to re-login
                removeAuthToken();
                setApiAuthToken(null);
              } catch (e) {
                console.log("🔄 [AUTH] Could not parse stored user, removing token");
                removeAuthToken();
                localStorage.removeItem("user_data");
                setUser(null);
                setApiAuthToken(null);
              }
            } else {
              console.log("🔄 [AUTH] No stored user data, removing token");
              removeAuthToken();
              setUser(null);
              setApiAuthToken(null);
            }
          } else {
            // For network errors, keep token and create a minimal user object
            // This prevents redirect to login on temporary network issues
            console.log("⚠️ [AUTH] Network/other error, keeping token and creating temporary user");
            console.log("⚠️ [AUTH] Will retry on next interaction");
            
            // Create a minimal user object from stored data if available
            // This allows the app to continue working while we retry
            const storedUser = localStorage.getItem("user_data");
            if (storedUser) {
              try {
                const userData = JSON.parse(storedUser);
                console.log("✅ [AUTH] Using stored user data:", userData.email);
                setUser(userData);
                setApiAuthToken(token); // Keep token for retry
              } catch (e) {
                console.log("⚠️ [AUTH] Could not parse stored user, setting null");
                setUser(null);
                setApiAuthToken(null);
              }
            } else {
              // No stored user data, but keep token for retry
              console.log("⚠️ [AUTH] No stored user data, but keeping token");
              setUser(null);
              setApiAuthToken(token);
            }
          }
        })
        .finally(() => {
          console.log("🟡 [AUTH] Loading complete");
          setLoading(false);
          // Mark auth as ready even if failed (so API calls can proceed with retry)
          setAuthReady(true);
        });
    } else {
      console.log("🟡 [AUTH] No token found, user not logged in");
      setLoading(false);
      setAuthReady(true); // No auth needed, mark as ready
    }
  }, []);

  const login = async (token: string) => {
    console.log("🟡 [AUTH] Login function called");
    try {
      console.log("🟡 [AUTH] Calling loginWithGoogle...");
      const response = await loginWithGoogle(token);
      console.log("🟡 [AUTH] loginWithGoogle returned, setting user state...");
      setAuthToken(response.access_token);
      setApiAuthToken(response.access_token);
      setUser(response.user);
      // Store user data in localStorage as backup
      localStorage.setItem("user_data", JSON.stringify(response.user));
      setAuthReady(true);
      console.log("✅ [AUTH] User state updated, user:", response.user.email);
    } catch (error) {
      console.error("❌ [AUTH] Login error in context:", error);
      setAuthReady(false);
      setApiAuthToken(null);
      throw error;
    }
  };

  const logout = () => {
    removeAuthToken();
    localStorage.removeItem("user_data");
    setUser(null);
    setAuthReady(false);
    setApiAuthToken(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      localStorage.setItem("user_data", JSON.stringify(userData));
      const token = localStorage.getItem("auth_token");
      if (token) {
        setApiAuthToken(token);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      // If unauthorized, clear auth state
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("Unauthorized") || errorMsg.includes("401") || errorMsg.includes("Please log in again")) {
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthSafe() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}

