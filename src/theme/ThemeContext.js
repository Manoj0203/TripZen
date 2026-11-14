import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';
import { getSetting, setSetting } from '../services/settingsService';

const ThemeContext = createContext({
  theme: 'system', // 'system' | 'light' | 'dark'
  isDark: false,
  colors: lightColors,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children, initialTheme = 'system' }) {
  const systemColorScheme = useColorScheme();
  const [userTheme, setUserTheme] = useState(initialTheme);

  useEffect(() => {
    if (initialTheme && initialTheme !== userTheme) {
      setUserTheme(initialTheme);
    }
  }, [initialTheme]);

  const isDark = useMemo(() => {
    if (userTheme === 'light') return false;
    if (userTheme === 'dark') return true;
    return systemColorScheme === 'dark';
  }, [userTheme, systemColorScheme]);

  const activeColors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  const updateTheme = (newTheme) => {
    setUserTheme(newTheme);
    setSetting('theme', newTheme).catch(() => {});
  };

  const toggleTheme = () => {
    setUserTheme((prev) => {
      const current = prev === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : prev;
      const next = current === 'dark' ? 'light' : 'dark';
      setSetting('theme', next).catch(() => {});
      return next;
    });
  };

  const value = useMemo(
    () => ({
      theme: userTheme,
      isDark,
      colors: activeColors,
      setTheme: updateTheme,
      toggleTheme,
    }),
    [userTheme, isDark, activeColors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'system',
      isDark: false,
      colors: lightColors,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
