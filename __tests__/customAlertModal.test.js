import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { View, Text } from 'react-native';
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
});
