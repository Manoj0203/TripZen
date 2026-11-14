import '../utils/interactionManagerPolyfill';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import {
  TrashIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon,
} from './Icons';

export function CustomAlertModal({
  isVisible = false,
  title,
  message,
  type = 'info', // 'danger' | 'warning' | 'info' | 'success'
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  buttons, // Optional array of custom buttons: [{ text, style, variant, onPress }]
  loading = false,
  showCancel = true,
  icon,
  position = 'center', // 'center' | 'bottom'
}) {
  const { colors, isDark } = useTheme();
  const isBottom = position === 'bottom';

  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'danger':
        return <TrashIcon size={28} color={colors.danger} strokeWidth={2.2} />;
      case 'warning':
        return <AlertCircleIcon size={28} color={colors.warning} strokeWidth={2.2} />;
      case 'success':
        return <CheckCircleIcon size={28} color={colors.success} strokeWidth={2.2} />;
      case 'info':
      default:
        return <InfoIcon size={28} color={colors.secondary} strokeWidth={2.2} />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'danger':
        return colors.dangerLight;
      case 'warning':
        return colors.warningLight;
      case 'success':
        return colors.successLight;
      case 'info':
      default:
        return colors.secondaryLight;
    }
  };

  const handleButtonPress = async (btn) => {
    // Immediately dismiss the modal
    if (typeof onCancel === 'function') {
      onCancel();
    }
    if (typeof btn.onPress === 'function') {
      await btn.onPress();
    }
  };

  const handleConfirmPress = async () => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
    if (typeof onConfirm === 'function') {
      await onConfirm();
    }
  };

  const renderButtons = () => {
    if (buttons && buttons.length > 0) {
      return (
        <View style={styles.customButtonsCol}>
          {buttons.map((btn, idx) => {
            const isCancel = btn.style === 'cancel';
            return (
              <Button
                key={idx}
                title={btn.text}
                variant={btn.variant || (isCancel ? 'outline' : 'primary')}
                size="md"
                onPress={() => handleButtonPress(btn)}
                style={[styles.customBtn, idx > 0 && { marginTop: 10 }]}
              />
            );
          })}
        </View>
      );
    }

    return (
      <View style={styles.buttonRow}>
        {showCancel && cancelText ? (
          <Button
            title={cancelText}
            variant="outline"
            size="md"
            onPress={onCancel}
            style={styles.actionBtn}
          />
        ) : null}
        <Button
          title={confirmText}
          variant={type === 'danger' ? 'danger' : 'primary'}
          size="md"
          loading={loading}
          onPress={handleConfirmPress}
          style={styles.actionBtn}
        />
      </View>
    );
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onCancel}
      onBackButtonPress={onCancel}
      swipeDirection={isBottom ? ['down'] : undefined}
      onSwipeComplete={onCancel}
      backdropOpacity={0.65}
      backdropColor="#000000"
      animationIn={isBottom ? 'slideInUp' : 'zoomIn'}
      animationOut={isBottom ? 'slideOutDown' : 'zoomOut'}
      animationInTiming={160}
      animationOutTiming={120}
      backdropTransitionOutTiming={0}
      useNativeDriver
      useNativeDriverForBackdrop
      style={[styles.modal, isBottom && styles.bottomModal]}
    >
      <View
        style={[
          styles.container,
          isBottom && styles.bottomContainer,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Bottom Sheet Drag Handle */}
        {isBottom ? (
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
        ) : null}

        {/* Animated Icon Badge */}
        <View style={[styles.iconCircle, { backgroundColor: getIconBg() }]}>
          {getIcon()}
        </View>

        {/* Title */}
        {title ? (
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        ) : null}

        {/* Message */}
        {message ? (
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
        ) : null}

        {/* Action Buttons */}
        {renderButtons()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomModal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomContainer: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  actionBtn: {
    flex: 1,
  },
  customButtonsCol: {
    width: '100%',
  },
  customBtn: {
    width: '100%',
  },
});
