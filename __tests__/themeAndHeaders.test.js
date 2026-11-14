import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, View, TouchableOpacity } from 'react-native';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { lightColors, darkColors } from '../src/theme/colors';

// Test component consuming useTheme
function ThemeConsumer() {
  const { isDark, colors, toggleTheme, theme } = useTheme();
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text testID="theme-status">{isDark ? 'dark' : 'light'}</Text>
      <Text testID="theme-bg">{colors.background}</Text>
      <TouchableOpacity testID="toggle-btn" onPress={toggleTheme}>
        <Text>Toggle</Text>
      </TouchableOpacity>
    </View>
  );
}

describe('Dark Mode and Theme Switching with useColorScheme', () => {
  test('defaults to light/system colors and toggles theme dynamically', () => {
    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
    });

    const root = tree.root;
    const statusText = root.findByProps({ testID: 'theme-status' });
    const bgText = root.findByProps({ testID: 'theme-bg' });

    // Initial state (light)
    expect(statusText.props.children).toBe('light');
    expect(bgText.props.children).toBe(lightColors.background);

    // Toggle to Dark Mode
    const toggleBtn = root.findByProps({ testID: 'toggle-btn' });
    ReactTestRenderer.act(() => {
      toggleBtn.props.onPress();
    });

    expect(statusText.props.children).toBe('dark');
    expect(bgText.props.children).toBe(darkColors.background);

    // Toggle back to Light Mode
    ReactTestRenderer.act(() => {
      toggleBtn.props.onPress();
    });

    expect(statusText.props.children).toBe('light');
    expect(bgText.props.children).toBe(lightColors.background);
  });
});
