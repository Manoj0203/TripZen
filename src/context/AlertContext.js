import React, { createContext, useContext, useState, useCallback } from 'react';
import { CustomAlertModal } from '../components/CustomAlertModal';

const AlertContext = createContext({
  showAlert: () => {},
  hideAlert: () => {},
});

export function AlertProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState({
    isVisible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: true,
    buttons: null,
    position: 'center',
    onConfirm: null,
    onCancel: null,
  });

  const hideAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, isVisible: false }));
  }, []);

  const showAlert = useCallback(
    ({
      title,
      message,
      type = 'info',
      confirmText = 'OK',
      cancelText = 'Cancel',
      showCancel = true,
      buttons = null,
      position = 'center',
      onConfirm = null,
      onCancel = null,
    }) => {
      // Auto-wrap buttons to always dismiss alert on press
      const wrappedButtons = buttons
        ? buttons.map(btn => ({
            ...btn,
            onPress: async () => {
              hideAlert();
              if (typeof btn.onPress === 'function') {
                await btn.onPress();
              }
            },
          }))
        : null;

      setAlertConfig({
        isVisible: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        showCancel,
        buttons: wrappedButtons,
        position,
        onConfirm: async () => {
          hideAlert();
          if (typeof onConfirm === 'function') {
            await onConfirm();
          }
        },
        onCancel: () => {
          hideAlert();
          if (typeof onCancel === 'function') {
            onCancel();
          }
        },
      });
    },
    [hideAlert]
  );

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomAlertModal
        isVisible={alertConfig.isVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        showCancel={alertConfig.showCancel}
        buttons={alertConfig.buttons}
        position={alertConfig.position}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  return useContext(AlertContext);
}
