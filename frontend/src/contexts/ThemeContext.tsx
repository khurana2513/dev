import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Apply theme immediately before React renders to prevent flash
    const root = window.document.documentElement;
    
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme") as Theme;
    let initialTheme: Theme;
    
    if (savedTheme === "dark" || savedTheme === "light") {
      initialTheme = savedTheme;
    } else {
      // Check system preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        initialTheme = "dark";
      } else {
        initialTheme = "light";
      }
    }
    
    // Apply immediately
    root.classList.remove("light", "dark");
    root.classList.add(initialTheme);
    
    return initialTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    
    // Remove both classes first
    root.classList.remove("light", "dark");
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Also ensure body has proper background
    if (theme === "dark") {
      body.style.backgroundColor = "#020617"; // slate-950 - richer, deeper
    } else {
      body.style.backgroundColor = "#f8fafc"; // slate-50
    }
    
    localStorage.setItem("theme", theme);
    console.log("🌙 [THEME] Theme changed to:", theme);
    console.log("🌙 [THEME] HTML classes:", root.className);
    console.log("🌙 [THEME] Body background:", body.style.backgroundColor);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
