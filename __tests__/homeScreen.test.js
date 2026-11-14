import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { HomeScreen } from '../src/screens/HomeScreen';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { AlertProvider } from '../src/context/AlertContext';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import * as tripService from '../src/services/tripService';

// Mock tripService
jest.mock('../src/services/tripService', () => ({
  getTrips: jest.fn(),
  deleteTrip: jest.fn(),
  updateTrip: jest.fn(),
  importTripEncrypted: jest.fn(),
}));

// Mock react-native-modal
jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockModal({ isVisible, children, testID }) {
    return isVisible ? React.createElement(View, { testID }, children) : null;
  };
});

jest.setTimeout(15000);

describe('HomeScreen Initial State and Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders header, hero card, and how-it-works features when trips list is empty', async () => {
    tripService.getTrips.mockResolvedValue([]);

    const mockNavigation = {
      navigate: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    };

    let tree;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaInsetsContext.Provider value={{ top: 20, bottom: 48, left: 0, right: 0 }}>
          <ThemeProvider>
            <AlertProvider>
              <HomeScreen navigation={mockNavigation} />
            </AlertProvider>
          </ThemeProvider>
        </SafeAreaInsetsContext.Provider>
      );
    });

    const root = tree.root;

    // Header elements
    expect(root.findByProps({ children: 'TripZen' })).toBeTruthy();
    expect(root.findByProps({ children: 'Offline Group Expenses' })).toBeTruthy();
    expect(root.findByProps({ children: 'Offline' })).toBeTruthy();

    // Hero Welcome Card elements
    expect(root.findByProps({ children: 'Plan & Split With Peace of Mind' })).toBeTruthy();
    expect(root.findByProps({ children: 'Get Started' })).toBeTruthy();
    expect(root.findByProps({ children: 'Create a Trip' })).toBeTruthy();
    expect(root.findByProps({ children: 'Import Backup' })).toBeTruthy();

    // Feature highlights
    expect(root.findByProps({ children: 'How TripZen Works' })).toBeTruthy();
    expect(root.findByProps({ children: 'Families & Friends Split' })).toBeTruthy();
    expect(root.findByProps({ children: 'Smart Debt Settlement' })).toBeTruthy();
    expect(root.findByProps({ children: '100% Offline & Encrypted' })).toBeTruthy();

    // FAB Button
    expect(root.findByProps({ children: 'New Trip' })).toBeTruthy();
  });

  test('renders trips list with section header and trip count when trips exist', async () => {
    tripService.getTrips.mockResolvedValue([
      {
        id: 'trip-1',
        name: 'Goa Holiday 2026',
        description: 'Beach resort with friends',
        tripType: 'friends',
        createdAt: '2026-11-14T00:00:00.000Z',
      },
    ]);

    const mockNavigation = {
      navigate: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    };

    let tree;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaInsetsContext.Provider value={{ top: 20, bottom: 48, left: 0, right: 0 }}>
          <ThemeProvider>
            <AlertProvider>
              <HomeScreen navigation={mockNavigation} />
            </AlertProvider>
          </ThemeProvider>
        </SafeAreaInsetsContext.Provider>
      );
    });

    const root = tree.root;

    // List header elements
    expect(root.findByProps({ children: 'Your Trips' })).toBeTruthy();
    expect(root.findByProps({ children: '1 trip' })).toBeTruthy();
    expect(root.findByProps({ children: 'Goa Holiday 2026' })).toBeTruthy();

    // Single trip quick tip
    expect(root.findByProps({ children: 'Quick Tip' })).toBeTruthy();
  });
});
