import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  error,
  keyboardType = 'default',
  multiline = false,
  containerStyle,
  inputStyle,
  ...props
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.inputBg,
            borderColor: error ? colors.danger : colors.border,
          },
          multiline && styles.inputWrapperMultiline,
          error && styles.inputError,
        ]}
      >
        {prefix ? (
          <Text style={[styles.prefix, { color: colors.text }]}>{prefix}</Text>
        ) : null}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            prefix && styles.inputWithPrefix,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          {...props}
        />
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputWrapperMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  inputError: {
    borderWidth: 1.5,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  inputWithPrefix: {
    paddingLeft: 0,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
