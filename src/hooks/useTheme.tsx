import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey) as Theme;
    return stored || defaultTheme;
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuth();

  // Apply theme to DOM immediately
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Initialize theme from database when user logs in
  useEffect(() => {
    if (user && !isInitialized) {
      const loadUserTheme = async () => {
        try {
          const { data } = await supabase
            .from('user_preferences')
            .select('theme')
            .eq('user_id', user.id)
            .single();
          
          if (data?.theme) {
            const dbTheme = data.theme as Theme;
            setThemeState(dbTheme);
            localStorage.setItem(storageKey, dbTheme);
          }
        } catch (error) {
          console.log('No theme preference found, using current theme');
        }
        setIsInitialized(true);
      };
      loadUserTheme();
    } else if (!user) {
      setIsInitialized(false);
    }
  }, [user, isInitialized, storageKey]);

  // Set up realtime subscription for theme changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('theme-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && 'theme' in payload.new) {
            const newTheme = payload.new.theme as Theme;
            setThemeState(newTheme);
            localStorage.setItem(storageKey, newTheme);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, storageKey]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(storageKey, newTheme);
    
    // Save to database if user is logged in
    if (user) {
      try {
        await supabase
          .from('user_preferences')
          .upsert({ 
            user_id: user.id, 
            theme: newTheme 
          });
        console.log('Theme preference saved');
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  };

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};