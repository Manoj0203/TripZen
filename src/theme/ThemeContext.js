import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';

const ThemeContext = createContext({
  theme: 'system', // 'system' | 'light' | 'dark'
  isDark: false,
  colors: lightColors,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [userTheme, setUserTheme] = useState('system');

  const isDark = useMemo(() => {
    if (userTheme === 'light') return false;
    if (userTheme === 'dark') return true;
    return systemColorScheme === 'dark';
  }, [userTheme, systemColorScheme]);

  const activeColors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  const toggleTheme = () => {
    setUserTheme(prev => {
      const current = prev === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : prev;
      return current === 'dark' ? 'light' : 'dark';
    });
  };

  const value = useMemo(
    () => ({
      theme: userTheme,
      isDark,
      colors: activeColors,
      setTheme: setUserTheme,
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
