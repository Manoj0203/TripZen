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
  createTrip,
  getTrips,
  getTripById,
  addFamily,
  addMember,
  createExpense,
  deleteTrip,
  exportTripEncrypted,
  importTripEncrypted,
} from '../src/services/tripService';
import { initDatabase } from '../src/db/client';

describe('Trip Export and Import Encryption Service', () => {
  let mockTrips = [];
  let mockFamilies = [];
  let mockMembers = [];
  let mockExpenses = [];
  let mockSplits = [];
  let mockSettlements = [];

  const mockDb = {
    executeSync: jest.fn(() => ({ rows: [] })),
    execute: jest.fn(async () => ({ rowsAffected: 1, insertId: 1, rows: [] })),
    executeAsync: jest.fn(async (sql, params = []) => {
      const lower = sql.toLowerCase();
      if (lower.includes('into "trips"')) {
        mockTrips.push([...params]);
      } else if (lower.includes('from "trips"')) {
        mockTrips = mockTrips.filter(t => t[0] !== params[0]);
      } else if (lower.includes('into "trip_families"')) {
        mockFamilies.push([...params]);
      } else if (lower.includes('into "trip_members"')) {
        mockMembers.push([...params]);
      } else if (lower.includes('into "expenses"')) {
        mockExpenses.push([...params]);
      } else if (lower.includes('into "expense_splits"')) {
        mockSplits.push([...params]);
      } else if (lower.includes('into "settlements"')) {
        mockSettlements.push([...params]);
      }
      return { rowsAffected: 1, insertId: 1 };
    }),
    executeRaw: jest.fn(async (sql, params = []) => {
      const lower = sql.toLowerCase();
      let rawRows = [];
      let columnNames = [];

      if (lower.includes('"trips"')) {
        columnNames = ['id', 'name', 'description', 'currency_code', 'trip_type', 'is_archived', 'created_at', 'updated_at'];
        rawRows = mockTrips.map(t => [t[0], t[1], t[2], t[3], t[4], t[5] ? 1 : 0, t[6], t[7]]);
      } else if (lower.includes('"trip_families"')) {
        columnNames = ['id', 'trip_id', 'name', 'created_at', 'updated_at'];
        rawRows = mockFamilies.map(f => [f[0], f[1], f[2], f[3], f[4]]);
      } else if (lower.includes('"trip_members"')) {
        columnNames = ['id', 'trip_id', 'family_id', 'name', 'member_type', 'default_weight', 'created_at', 'updated_at'];
        rawRows = mockMembers.map(m => [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7]]);
      } else if (lower.includes('"expenses"')) {
        columnNames = ['id', 'trip_id', 'title', 'amount_paise', 'payer_member_id', 'payer_family_id', 'split_type', 'category', 'expense_date', 'created_at', 'updated_at'];
        rawRows = mockExpenses.map(e => [e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9], e[10]]);
      } else if (lower.includes('"expense_splits"')) {
        columnNames = ['id', 'expense_id', 'family_id', 'member_id', 'share_paise', 'weight_used', 'created_at'];
        rawRows = mockSplits.map(s => [s[0], s[1], s[2], s[3], s[4], s[5], s[6]]);
      } else if (lower.includes('"settlements"')) {
        columnNames = ['id', 'trip_id', 'from_family_id', 'to_family_id', 'amount_paise', 'payment_method', 'notes', 'settled_at', 'created_at'];
        rawRows = mockSettlements.map(st => [st[0], st[1], st[2], st[3], st[4], st[5], st[6], st[7], st[8]]);
      }

      return { rawRows, columnNames, rowsAffected: rawRows.length };
    }),
    executeRawAsync: jest.fn(async (sql, params = []) => mockDb.executeRaw(sql, params)),
  };

  beforeAll(() => {
    initDatabase(mockDb);
  });

  beforeEach(() => {
    mockTrips = [];
    mockFamilies = [];
    mockMembers = [];
    mockExpenses = [];
    mockSplits = [];
    mockSettlements = [];
  });

  it('exports trip to encrypted string and imports it back accurately', async () => {
    const trip = await createTrip({
      name: 'Kerala Voyage',
      description: 'Backwaters trip',
      tripType: 'families',
    });

    const fam = await addFamily({ tripId: trip.id, name: 'Menon Family' });
    await addMember({ tripId: trip.id, familyId: fam.id, name: 'Anil' });

    await createExpense({
      tripId: trip.id,
      title: 'Houseboat Booking',
      amountPaise: 1500000,
      payerFamilyId: fam.id,
      splitType: 'equal_family',
      splits: [{ familyId: fam.id, sharePaise: 1500000, weightUsed: 100 }],
    });

    const password = 'SecretPassword123';
    const encrypted = await exportTripEncrypted(trip.id, password);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(50);

    // Now test importing
    const importedTrip = await importTripEncrypted(encrypted, password);
    expect(importedTrip.name).toBe('Kerala Voyage');

    // Importing with wrong password fails
    await expect(importTripEncrypted(encrypted, 'WrongPassword')).rejects.toThrow();
  });
});
