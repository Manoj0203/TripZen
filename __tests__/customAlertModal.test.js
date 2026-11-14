import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { View, Text } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { CustomAlertModal } from '../src/components/CustomAlertModal';
import { AlertProvider, useAlert } from '../src/context/AlertContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockModal({ isVisible, children, testID }) {
    return isVisible ? React.createElement(View, { testID }, children) : null;
  };
});

describe('CustomAlertModal and AlertContext', () => {
  test('renders CustomAlertModal correctly when visible', () => {
    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <CustomAlertModal
            isVisible={true}
            title="Delete Trip"
            message="Are you sure you want to delete this trip?"
            type="danger"
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={jest.fn()}
            onCancel={jest.fn()}
          />
        </ThemeProvider>
      );
    });

    const root = tree.root;
    expect(root.findByProps({ children: 'Delete Trip' })).toBeTruthy();
    expect(
      root.findByProps({ children: 'Are you sure you want to delete this trip?' })
    ).toBeTruthy();
    expect(root.findByProps({ children: 'Delete' })).toBeTruthy();
    expect(root.findByProps({ children: 'Cancel' })).toBeTruthy();
  });

  test('renders custom buttons array correctly', () => {
    const onCash = jest.fn();
    const onOnline = jest.fn();

    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <CustomAlertModal
            isVisible={true}
            title="Settle Payment"
            message="Select payment method"
            buttons={[
              { text: 'Cash', onPress: onCash },
              { text: 'Online', onPress: onOnline },
            ]}
          />
        </ThemeProvider>
      );
    });

    const root = tree.root;
    expect(root.findByProps({ children: 'Cash' })).toBeTruthy();
    expect(root.findByProps({ children: 'Online' })).toBeTruthy();
  });

  test('AlertProvider opens and closes alert via useAlert hook', () => {
    let alertContext;

    function TestComponent() {
      alertContext = useAlert();
      return <View><Text>Test</Text></View>;
    }

    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <AlertProvider>
            <TestComponent />
          </AlertProvider>
        </ThemeProvider>
      );
    });

    expect(alertContext).toBeDefined();
    expect(typeof alertContext.showAlert).toBe('function');
    expect(typeof alertContext.hideAlert).toBe('function');

    // Trigger alert
    ReactTestRenderer.act(() => {
      alertContext.showAlert({
        title: 'Action Required',
        message: 'Please confirm this action.',
        type: 'warning',
      });
    });

    const root = tree.root;
    expect(root.findByProps({ children: 'Action Required' })).toBeTruthy();
    expect(root.findByProps({ children: 'Please confirm this action.' })).toBeTruthy();

    // Close alert
    ReactTestRenderer.act(() => {
      alertContext.hideAlert();
    });

    expect(root.findAllByProps({ children: 'Action Required' }).length).toBe(0);
  });

  test('renders bottom sheet when position is bottom', () => {
    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <CustomAlertModal
            isVisible={true}
            title="Record Payment"
            message="Rahul pays ₹500 to Amit"
            position="bottom"
            buttons={[
              { text: 'Mark as Settled (Cash)', variant: 'primary' },
              { text: 'Mark as Settled (Online)', variant: 'secondary' },
              { text: 'Cancel', style: 'cancel' },
            ]}
          />
        </ThemeProvider>
      );
    });

    const root = tree.root;
    expect(root.findByProps({ children: 'Record Payment' })).toBeTruthy();
    expect(root.findByProps({ children: 'Rahul pays ₹500 to Amit' })).toBeTruthy();
    expect(root.findByProps({ children: 'Mark as Settled (Cash)' })).toBeTruthy();
    expect(root.findByProps({ children: 'Mark as Settled (Online)' })).toBeTruthy();
    expect(root.findByProps({ children: 'Cancel' })).toBeTruthy();
  });

  test('clicking button in buttons array dismisses modal via onCancel', () => {
    const onCancel = jest.fn();
    const onCash = jest.fn();

    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <CustomAlertModal
            isVisible={true}
            title="Confirm"
            onCancel={onCancel}
            buttons={[
              { text: 'Cash', onPress: onCash },
            ]}
          />
        </ThemeProvider>
      );
    });

    const root = tree.root;
    const cashBtn = root.findByProps({ title: 'Cash' });
    ReactTestRenderer.act(() => {
      cashBtn.props.onPress();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCash).toHaveBeenCalledTimes(1);
  });

  test('adapts bottom padding dynamically for Android 3-button navigation insets', () => {
    let tree;
    const navBar3ButtonInsets = { top: 24, bottom: 48, left: 0, right: 0 };
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <SafeAreaInsetsContext.Provider value={navBar3ButtonInsets}>
          <ThemeProvider>
            <CustomAlertModal
              isVisible={true}
              title="Record Payment"
              position="bottom"
              buttons={[{ text: 'Cancel', style: 'cancel' }]}
            />
          </ThemeProvider>
        </SafeAreaInsetsContext.Provider>
      );
    });

    const root = tree.root;
    const views = root.findAllByType(View);
    const bottomContainerView = views.find(
      v =>
        v.props.style &&
        Array.isArray(v.props.style) &&
        v.props.style.some(
          s =>
            (s && s.paddingBottom === 48 + 16) ||
            (Array.isArray(s) && s.some(nested => nested && nested.paddingBottom === 48 + 16))
        )
    );
    expect(bottomContainerView).toBeDefined();
  });
});
