import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { Loader2, Sparkles, Shield, TrendingUp, Zap, ChevronDown, ChevronUp, Activity } from "lucide-react";
import BackendTest from "./BackendTest";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBackendTest, setShowBackendTest] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  
  // Redirect after successful login
  useEffect(() => {
    if (isAuthenticated) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        // Get the current location to see if we need to redirect
        const currentPath = window.location.pathname;
        console.log("🟢 [LOGIN] User authenticated, current path:", currentPath);
        
        // Only redirect if we're on /login or an invalid route
        if (currentPath === "/login" || currentPath === "/" || !currentPath) {
          setLocation("/");
        } else {
          // Stay on the current route if it's valid
          console.log("🟢 [LOGIN] Staying on current route:", currentPath);
        }
      }, 200);
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    // Load Google OAuth script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log("Google OAuth script loaded");
      
      // Initialize Google Sign-In
      if (window.google && buttonRef.current && !initializedRef.current) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        
        if (!clientId) {
          setError("Google Client ID not configured. Please check your environment variables.");
          return;
        }

        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              console.log("🟢 [GOOGLE] Callback received, has credential:", !!response?.credential);
              setLoading(true);
              setError(null);
              
              try {
                // response.credential is the ID token
                if (!response?.credential) {
                  console.error("❌ [GOOGLE] No credential in response:", response);
                  throw new Error("No credential received from Google");
                }
                
                console.log("🟢 [GOOGLE] Calling login function with credential...");
                await login(response.credential);
                console.log("✅ [GOOGLE] Login completed successfully");
                // Login successful - ProtectedRoute will automatically show the protected content
                // No need to set loading to false, component will unmount when authenticated
                setLoading(false);
              } catch (err: any) {
                console.error("❌ [GOOGLE] Login error:", err);
                let errorMessage = err?.message || err?.toString() || "Login failed. Please try again.";
                
                // Format multi-line error messages for display
                if (errorMessage.includes('\n')) {
                  // Keep the first line as main message, show rest as details
                  const lines = errorMessage.split('\n');
                  errorMessage = lines[0];
                  if (lines.length > 1) {
                    errorMessage += '\n\n' + lines.slice(1).join('\n');
                  }
                }
                
                setError(errorMessage);
                setLoading(false);
              }
            },
          });

          // Render the button
          if (buttonRef.current) {
            window.google.accounts.id.renderButton(buttonRef.current, {
              theme: "outline",
              size: "large",
              width: 300, // Use pixel value instead of percentage to avoid warning
              text: "signin_with",
              shape: "rectangular",
            });
          }

          initializedRef.current = true;
        } catch (err: any) {
          console.error("Google Sign-In initialization error:", err);
          setError("Failed to initialize Google Sign-In. Please refresh the page.");
        }
      }
    };

    script.onerror = () => {
      setError("Failed to load Google Sign-In script. Please check your internet connection.");
    };

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!existingScript) {
      document.head.appendChild(script);
    } else {
      // Script already loaded, trigger onload manually
      if (window.google) {
        script.onload?.();
      }
    }

    return () => {
      // Don't remove script on cleanup to avoid reloading
    };
  }, [login]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: `rgba(255, 255, 255, ${Math.random() * 0.6 + 0.2})`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              boxShadow: `0 0 ${Math.random() * 4 + 2}px rgba(255, 255, 255, 0.5)`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-2xl">
        {/* Premium Glass Card */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12 lg:p-16 transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-2xl blur-xl opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-2xl shadow-2xl transform hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          {/* Title Section */}
          <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4">
              <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent drop-shadow-lg inline-block">
                Welcome Back
              </span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
              Sign in to track your progress, earn points, and improve your mental math skills
            </p>
          </div>

          {/* Features Icons */}
          <div className="flex justify-center gap-6 mb-8 opacity-80">
            <div className="flex flex-col items-center gap-2 group">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-white/70 font-medium">Progress</span>
            </div>
            <div className="flex flex-col items-center gap-2 group">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-white/70 font-medium">Practice</span>
            </div>
            <div className="flex flex-col items-center gap-2 group">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-white/70 font-medium">Secure</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border-2 border-red-400/50 rounded-xl text-red-100 text-sm animate-fade-in shadow-lg">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mt-1.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="whitespace-pre-line font-medium">{error}</div>
                  {error.includes('Backend') && (
                    <div className="mt-3 pt-3 border-t border-red-400/30">
                      <div className="text-xs text-red-200/80">
                        💡 Tip: Check the browser console (F12) for detailed error logs
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Sign-In Button Container */}
          <div className="mb-6">
            <div 
              ref={buttonRef} 
              id="google-signin-button" 
              className="w-full flex justify-center transform transition-all duration-300 hover:scale-[1.02] google-button-wrapper"
            ></div>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="mt-6 flex flex-col items-center justify-center gap-3 text-white/90 animate-fade-in">
              <div className="relative">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-300" />
                <div className="absolute inset-0 bg-indigo-300/20 rounded-full blur-xl animate-pulse"></div>
              </div>
              <span className="text-sm font-medium">Signing you in...</span>
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          )}

          {/* Terms */}
          <p className="mt-8 text-center text-sm text-white/60 leading-relaxed">
            By signing in, you agree to track your practice progress and earn points
          </p>
        </div>

        {/* Backend Test - Collapsible in Corner */}
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
            <button
              onClick={() => setShowBackendTest(!showBackendTest)}
              className="w-full px-4 py-3 flex items-center justify-between gap-2 text-white/90 hover:bg-white/10 transition-all duration-300 group"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-300 group-hover:text-indigo-200 transition-colors" />
                <span className="text-sm font-medium">Connection Status</span>
              </div>
              {showBackendTest ? (
                <ChevronDown className="w-4 h-4 transition-transform duration-300 rotate-180" />
              ) : (
                <ChevronDown className="w-4 h-4 transition-transform duration-300" />
              )}
            </button>
            {showBackendTest && (
              <div className="border-t border-white/20 p-4 max-w-sm animate-fade-in">
                <BackendTest />
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
        }
        
        /* Custom Google Button Styling */
        .google-button-wrapper iframe {
          border-radius: 12px !important;
          overflow: hidden !important;
        }
        
        .google-button-wrapper div[role="button"] {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          border-radius: 12px !important;
          transition: all 0.3s ease !important;
        }
        
        .google-button-wrapper div[role="button"]:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
          transform: scale(1.02) !important;
        }
        
        /* Override Google's white background */
        .google-button-wrapper iframe[src*="accounts.google.com"] {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
