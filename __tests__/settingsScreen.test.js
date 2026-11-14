import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { AlertProvider } from '../src/context/AlertContext';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import * as settingsService from '../src/services/settingsService';

// Mock settingsService
jest.mock('../src/services/settingsService', () => ({
  getStorageStats: jest.fn(),
  clearAllData: jest.fn(),
  exportAllDataEncrypted: jest.fn(),
  importAllDataEncrypted: jest.fn(),
  getSetting: jest.fn(),
  setSetting: jest.fn(),
}));

describe('SettingsScreen UI and Interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    settingsService.getStorageStats.mockResolvedValue({
      totalTrips: 3,
      totalExpenses: 14,
      totalSettlements: 5,
      totalParticipants: 8,
    });
    settingsService.getSetting.mockImplementation((key, defaultVal) => {
      if (key === 'defaultTripType') return Promise.resolve('families');
      if (key === 'defaultChildWeight') return Promise.resolve(50);
      return Promise.resolve(defaultVal);
    });
  });

  test('renders all settings sections, stats, and developer links', async () => {
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
              <SettingsScreen navigation={mockNavigation} />
            </AlertProvider>
          </ThemeProvider>
        </SafeAreaInsetsContext.Provider>
      );
    });

    const root = tree.root;

    // Appearance & Theme
    expect(root.findByProps({ children: 'Appearance & Theme' })).toBeTruthy();
    expect(root.findByProps({ children: 'Light' })).toBeTruthy();
    expect(root.findByProps({ children: 'Dark' })).toBeTruthy();
    expect(root.findByProps({ children: 'System' })).toBeTruthy();

    // Trip & Split Defaults
    expect(root.findByProps({ children: 'Trip & Split Defaults' })).toBeTruthy();
    expect(root.findByProps({ children: 'Family Trip' })).toBeTruthy();
    expect(root.findByProps({ children: 'Friends Trip' })).toBeTruthy();
    expect(root.findByProps({ children: '0.50x (50%)' })).toBeTruthy();

    // Backup & Storage
    expect(root.findByProps({ children: 'Backup & Storage' })).toBeTruthy();
    expect(root.findByProps({ children: 3 })).toBeTruthy(); // totalTrips
    expect(root.findByProps({ children: 14 })).toBeTruthy(); // totalExpenses
    expect(root.findByProps({ children: 5 })).toBeTruthy(); // totalSettlements
    expect(root.findByProps({ children: 'Export All Trips' })).toBeTruthy();
    expect(root.findByProps({ children: 'Restore All Trips' })).toBeTruthy();
    expect(root.findByProps({ children: 'Clear All Data' })).toBeTruthy();

    // About & Develax
    expect(root.findByProps({ children: 'About & Developer' })).toBeTruthy();
    expect(root.findByProps({ children: 'Rate This App' })).toBeTruthy();
    expect(root.findByProps({ children: 'More from Develax' })).toBeTruthy();
  });
});
