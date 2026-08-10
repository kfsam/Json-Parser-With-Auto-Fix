import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ThemeName } from '../types';

const THEME_KEY = 'jsonParser.theme';
const DEFAULT_THEME: ThemeName = 'midnight';

interface ThemeCtx { theme: ThemeName; setTheme: (t: ThemeName) => void; }
const Ctx = createContext<ThemeCtx>({ theme: DEFAULT_THEME, setTheme: () => {} });

function readInitial(): ThemeName {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'midnight' || v === 'daylight' || v === 'aurora') return v;
  } catch { /* ignore */ }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(readInitial);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  return <Ctx.Provider value={{ theme, setTheme: setThemeState }}>{children}</Ctx.Provider>;
}

export function useTheme() { return useContext(Ctx); }
