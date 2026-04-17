import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, loginWithGoogle, getCurrentUser, removeAuthToken, setAuthToken, refreshAccessToken, logoutUser } from "../lib/userApi";
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
    
    const restoreSession = async () => {
      const storedUser = localStorage.getItem("user_data");

      try {
        const userData = await getCurrentUser();
        setUser(userData);
        localStorage.setItem("user_data", JSON.stringify(userData));
      } catch (error: any) {
        const errorMsg = error?.message || "";
        const isUnauthorized =
          errorMsg.includes("Unauthorized") ||
          errorMsg.includes("401") ||
          errorMsg.includes("Please log in again");

        if (isUnauthorized) {
          try {
            const refreshResponse = await refreshAccessToken();
            setAuthToken(refreshResponse.access_token);
            setApiAuthToken(refreshResponse.access_token);

            const userData = await getCurrentUser();
            setUser(userData);
            localStorage.setItem("user_data", JSON.stringify(userData));
          } catch (refreshError) {
            console.error("[AUTH] Cookie refresh failed:", refreshError);
            removeAuthToken();
            localStorage.removeItem("user_data");
            setUser(null);
            setApiAuthToken(null);
          }
        } else if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    };

    void restoreSession();
  }, []);

  const login = useCallback(async (token: string) => {
    try {
      const response = await loginWithGoogle(token);
      setAuthToken(response.access_token);
      setApiAuthToken(response.access_token);
      // Store the initial user data from login response
      localStorage.setItem("user_data", JSON.stringify(response.user));
      setAuthReady(true);
      // Immediately fetch full user data (includes branch/course/level from profile)
      // so the profile dropdown shows them without requiring a page reload
      try {
        const freshUser = await getCurrentUser();
        setUser(freshUser);
        localStorage.setItem("user_data", JSON.stringify(freshUser));
      } catch (_e) {
        // Fallback: use the data from the login response
        setUser(response.user);
      }
    } catch (error) {
      console.error("[AUTH] Login error:", error);
      // Do NOT call setAuthReady(false) here — if auth was already ready
      // (re-auth scenario), doing so would cause all pending API calls to
      // block inside waitForAuth() for up to 5 seconds.
      setApiAuthToken(null);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    void logoutUser();
    removeAuthToken();
    localStorage.removeItem("user_data");
    setUser(null);
    setApiAuthToken(null);
    // Hard-navigate to login so all component state and React Query caches are cleared.
    // Without this, ProtectedRoute re-renders Login in-place while setAuthReady(false)
    // causes waitForAuth() to stall pending requests, freezing the UI.
    window.location.replace("/login");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      localStorage.setItem("user_data", JSON.stringify(userData));
    } catch (error) {
      console.error("Failed to refresh user:", error);
      // If unauthorized, clear auth state
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("Unauthorized") || errorMsg.includes("401") || errorMsg.includes("Please log in again")) {
        logout();
      }
    }
  }, [logout]);

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
