/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// Mock op-sqlite native TurboModule in Node.js test environment
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    executeSync: jest.fn(() => ({ rows: [] })),
    execute: jest.fn(() => Promise.resolve({ rows: [] })),
  })),
}));

// Mock react-native-modal for headless Jest environment
jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockModal({ isVisible, children, testID }) {
    return isVisible ? React.createElement(View, { testID }, children) : null;
  };
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
