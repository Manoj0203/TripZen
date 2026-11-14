import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function Button({
  title,
  icon,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  disabled = false,
  loading = false,
  style,
  textStyle,
}) {
  const { colors } = useTheme();

  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return [styles.secondaryContainer, { backgroundColor: colors.secondaryLight }];
      case 'outline':
        return [
          styles.outlineContainer,
          { backgroundColor: colors.card, borderColor: colors.primary },
        ];
      case 'danger':
        return [styles.dangerContainer, { backgroundColor: colors.danger }];
      case 'primary':
      default:
        return [styles.primaryContainer, { backgroundColor: colors.primary }];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return [styles.outlineText, { color: colors.primary }];
      case 'danger':
        return styles.dangerText;
      case 'secondary':
        return [styles.secondaryText, { color: colors.secondary }];
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.baseContainer,
        styles[`size_${size}`],
        getContainerStyle(),
        disabled && styles.disabledContainer,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#FFFFFF'} />
      ) : (
        <>
          {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
          <Text style={[styles.baseText, styles[`textSize_${size}`], getTextStyle(), textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    marginRight: 6,
  },
  baseContainer: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryContainer: {},
  secondaryContainer: {},
  outlineContainer: {
    borderWidth: 1.5,
  },
  dangerContainer: {},
  disabledContainer: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: '600',
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 17,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {},
  outlineText: {},
  dangerText: {
    color: '#FFFFFF',
  },
});
