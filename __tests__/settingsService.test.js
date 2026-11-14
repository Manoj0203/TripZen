jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    executeSync: jest.fn(() => ({ rows: [] })),
    execute: jest.fn(() => Promise.resolve({ rows: [] })),
    executeRaw: jest.fn(() => Promise.resolve({ rawRows: [], columnNames: [] })),
    executeRawAsync: jest.fn(() => Promise.resolve({ rawRows: [], columnNames: [] })),
    executeAsync: jest.fn(() => Promise.resolve({ rows: [] })),
  })),
}));

import {
  generateTripSummaryDoc,
  getSetting,
  setSetting,
  getAllSettings,
  getStorageStats,
  exportAllDataEncrypted,
  importAllDataEncrypted,
} from '../src/services/settingsService';
import * as tripService from '../src/services/tripService';
import * as client from '../src/db/client';

// Mock tripService
jest.mock('../src/services/tripService', () => ({
  getSettlementDashboard: jest.fn(),
  getParticipants: jest.fn(),
  getExpenses: jest.fn(),
}));

describe('Settings Service & Trip Summary Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTripSummaryDoc', () => {
    test('generates a formatted text document with balances, plan, and breakdown', async () => {
      tripService.getSettlementDashboard.mockResolvedValue({
        netBalances: {
          'fam-1': 420000, // +₹4,200 (Receives)
          'fam-2': -180000, // -₹1,800 (Owes)
          'fam-3': -240000, // -₹2,400 (Owes)
        },
        suggestedSettlements: [
          { from: 'fam-2', to: 'fam-1', amountPaise: 180000 },
          { from: 'fam-3', to: 'fam-1', amountPaise: 240000 },
        ],
        recordedSettlements: [
          {
            id: 'rec-1',
            fromFamilyId: 'fam-2',
            toFamilyId: 'fam-1',
            amountPaise: 50000,
            paymentMethod: 'cash',
            settledAt: '2026-11-14T00:00:00.000Z',
          },
        ],
      });

      tripService.getParticipants.mockResolvedValue([
        { id: 'fam-1', name: 'Sharma Family' },
        { id: 'fam-2', name: 'Rahul' },
        { id: 'fam-3', name: 'Amit' },
      ]);

      tripService.getExpenses.mockResolvedValue([
        {
          id: 'exp-1',
          title: 'Seafood Dinner',
          amountPaise: 420000,
          payerFamilyId: 'fam-1',
        },
      ]);

      const doc = await generateTripSummaryDoc('trip-1', 'Goa Vacation');

      expect(doc).toContain('GOA VACATION — TRIPZEN SUMMARY');
      expect(doc).toContain('FINAL BALANCES');
      expect(doc).toContain('Sharma Family: +₹4,200.00 (Receives back)');
      expect(doc).toContain('Rahul: -₹1,800.00 (Owes)');
      expect(doc).toContain('SETTLEMENT PAYMENT PLAN');
      expect(doc).toContain('Rahul pays ₹1,800.00 ➔ Sharma Family');
      expect(doc).toContain('Amit pays ₹2,400.00 ➔ Sharma Family');
      expect(doc).toContain('RECORDED PAYMENTS');
      expect(doc).toContain('Rahul paid Sharma Family — ₹500.00 (CASH)');
      expect(doc).toContain('EXPENSE BREAKDOWN');
      expect(doc).toContain('Seafood Dinner: ₹4,200.00 (Paid by Sharma Family)');
      expect(doc).toContain('Generated offline with TripZen');
    });

    test('generates all-settled message when no debts remain', async () => {
      tripService.getSettlementDashboard.mockResolvedValue({
        netBalances: {
          'fam-1': 0,
          'fam-2': 0,
        },
        suggestedSettlements: [],
        recordedSettlements: [],
      });

      tripService.getParticipants.mockResolvedValue([
        { id: 'fam-1', name: 'Sharma Family' },
        { id: 'fam-2', name: 'Verma Family' },
      ]);

      tripService.getExpenses.mockResolvedValue([]);

      const doc = await generateTripSummaryDoc('trip-2', 'Manali Roadtrip');
      expect(doc).toContain('MANALI ROADTRIP — TRIPZEN SUMMARY');
      expect(doc).toContain('Sharma Family: Settled');
      expect(doc).toContain('Verma Family: Settled');
      expect(doc).toContain('All settled up! No outstanding payments required.');
    });
  });

  describe('Full Backup Export and Import validation', () => {
    test('throws error if password is empty for export or import', async () => {
      await expect(exportAllDataEncrypted('')).rejects.toThrow('Encryption password is required.');
      await expect(importAllDataEncrypted('abc', '')).rejects.toThrow('Decryption password is required.');
      await expect(importAllDataEncrypted('', 'pass')).rejects.toThrow('Encrypted backup string is required.');
    });
  });
});
