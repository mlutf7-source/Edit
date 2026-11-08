import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_COLOR_THEME } from '../core/colorTheme';
import type { ColorTheme } from '../core/colorTheme';

const STORAGE_KEY = 'app-color-theme-v1';

function loadTheme(): ColorTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLOR_THEME;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_COLOR_THEME, ...parsed };
  } catch {
    return DEFAULT_COLOR_THEME;
  }
}

export function useColorTheme() {
  const [theme, setTheme] = useState<ColorTheme>(loadTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch (e) {
      console.warn('Failed to save color theme to localStorage', e);
    }
  }, [theme]);

  const updateColor = useCallback((key: keyof ColorTheme, value: string) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setTheme(DEFAULT_COLOR_THEME);
  }, []);

  return { theme, updateColor, resetToDefaults };
}
