jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    executeSync: jest.fn(() => ({ rows: [] })),
    execute: jest.fn(() => Promise.resolve({ rows: [] })),
    executeRaw: jest.fn(() => Promise.resolve({ rawRows: [], columnNames: [] })),
    executeRawAsync: jest.fn(() => Promise.resolve({ rawRows: [], columnNames: [] })),
    executeAsync: jest.fn(() => Promise.resolve({ rows: [] })),
  })),
}));

jest.mock('@react-native-clipboard/clipboard', () =>
  require('@react-native-clipboard/clipboard/jest/clipboard-mock')
);

import {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  addFamily,
  updateFamily,
  deleteFamily,
  addMember,
  updateMember,
  deleteMember,
  addFriend,
  updateFriend,
  deleteFriend,
  getParticipants,
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from '../src/services/tripService';
import { initDatabase } from '../src/db/client';
import { copyToClipboard, getFromClipboard } from '../src/utils/clipboard';

describe('CRUD Operations Verification', () => {
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
      // INSERTS
      if (lower.includes('into "trips"')) {
        mockTrips.push([...params]);
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
      // UPDATES
      else if (lower.includes('update "trips"')) {
        // e.g. update "trips" set name = ?, description = ?, updated_at = ? where id = ?
        const id = params[params.length - 1];
        const trip = mockTrips.find(t => t[0] === id);
        if (trip) {
          if (lower.includes('"name" = ?')) {
            trip[1] = params[0];
          }
        }
      } else if (lower.includes('update "trip_families"')) {
        const id = params[params.length - 1];
        const fam = mockFamilies.find(f => f[0] === id);
        if (fam) fam[2] = params[0];
      } else if (lower.includes('update "trip_members"')) {
        const id = params[params.length - 1];
        const mem = mockMembers.find(m => m[0] === id);
        if (mem) mem[3] = params[0];
      } else if (lower.includes('update "expenses"')) {
        const id = params[params.length - 1];
        const exp = mockExpenses.find(e => e[0] === id);
        if (exp) exp[2] = params[0]; // title
      }
      // DELETES
      else if (lower.includes('delete from "trips"')) {
        const id = params[0];
        mockTrips = mockTrips.filter(t => t[0] !== id);
      } else if (lower.includes('delete from "trip_families"')) {
        const id = params[0];
        mockFamilies = mockFamilies.filter(f => f[0] !== id);
      } else if (lower.includes('delete from "trip_members"')) {
        const id = params[0];
        mockMembers = mockMembers.filter(m => m[0] !== id && m[2] !== id);
      } else if (lower.includes('delete from "expenses"')) {
        const id = params[0];
        mockExpenses = mockExpenses.filter(e => e[0] !== id && e[1] !== id && e[5] !== id);
      } else if (lower.includes('delete from "expense_splits"')) {
        const id = params[0];
        mockSplits = mockSplits.filter(s => s[0] !== id && s[1] !== id && s[2] !== id);
      } else if (lower.includes('delete from "settlements"')) {
        const id = params[0];
        mockSettlements = mockSettlements.filter(st => st[0] !== id && st[1] !== id);
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
        if (params.length > 0) {
          rawRows = rawRows.filter(r => r[0] === params[0]);
        }
      } else if (lower.includes('"trip_families"')) {
        columnNames = ['id', 'trip_id', 'name', 'created_at', 'updated_at'];
        rawRows = mockFamilies.map(f => [f[0], f[1], f[2], f[3], f[4]]);
        if (params.length > 0) {
          rawRows = rawRows.filter(r => r[1] === params[0] || r[0] === params[0]);
        }
      } else if (lower.includes('"trip_members"')) {
        columnNames = ['id', 'trip_id', 'family_id', 'name', 'member_type', 'default_weight', 'created_at', 'updated_at'];
        rawRows = mockMembers.map(m => [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7]]);
        if (params.length > 0) {
          rawRows = rawRows.filter(r => r[1] === params[0] || r[0] === params[0]);
        }
      } else if (lower.includes('"expenses"')) {
        columnNames = ['id', 'trip_id', 'title', 'amount_paise', 'payer_member_id', 'payer_family_id', 'split_type', 'category', 'expense_date', 'created_at', 'updated_at'];
        rawRows = mockExpenses.map(e => [e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9], e[10]]);
        if (params.length > 0) {
          rawRows = rawRows.filter(r => r[1] === params[0] || r[0] === params[0]);
        }
      } else if (lower.includes('"expense_splits"')) {
        columnNames = ['id', 'expense_id', 'family_id', 'member_id', 'share_paise', 'weight_used', 'created_at'];
        rawRows = mockSplits.map(s => [s[0], s[1], s[2], s[3], s[4], s[5], s[6]]);
        if (params.length > 0) {
          rawRows = rawRows.filter(r => r[1] === params[0]);
        }
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

  describe('Home Screen Trip CRUD', () => {
    it('creates, reads, updates, and deletes trips', async () => {
      // 1. Create Trip
      const created = await createTrip({
        name: 'Goa Holiday',
        description: 'Sun and Sand',
        tripType: 'families',
      });
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Goa Holiday');

      // 2. Read Trips
      const allTrips = await getTrips();
      expect(allTrips.length).toBe(1);
      expect(allTrips[0].name).toBe('Goa Holiday');

      // 3. Update Trip
      const updateResult = await updateTrip(created.id, {
        name: 'Goa Beach Trip 2026',
        description: 'Updated description',
      });
      expect(updateResult.success).toBe(true);

      // 4. Delete Trip
      const deleteResult = await deleteTrip(created.id);
      expect(deleteResult.success).toBe(true);
      const afterDelete = await getTrips();
      expect(afterDelete.length).toBe(0);
    });
  });

  describe('Families Screen CRUD', () => {
    it('creates, reads, updates, and deletes families and members', async () => {
      const trip = await createTrip({ name: 'Manali Snow', tripType: 'families' });

      // 1. Create Family
      const fam = await addFamily({ tripId: trip.id, name: 'Sharma Family' });
      expect(fam.id).toBeDefined();

      // 2. Create Members
      const adult = await addMember({
        tripId: trip.id,
        familyId: fam.id,
        name: 'Rajesh',
        memberType: 'adult',
      });
      const child = await addMember({
        tripId: trip.id,
        familyId: fam.id,
        name: 'Aarav',
        memberType: 'child',
        defaultWeight: 50,
      });

      // 3. Read Participants
      const parts = await getParticipants(trip.id);
      expect(parts.length).toBe(1);
      expect(parts[0].name).toBe('Sharma Family');
      expect(parts[0].members.length).toBe(2);

      // 4. Update Family Name
      const updatedFam = await updateFamily(fam.id, { name: 'Sharma Household' });
      expect(updatedFam.name).toBe('Sharma Household');

      // 5. Update Member
      const updatedMem = await updateMember(adult.id, { name: 'Rajesh Sharma' });
      expect(updatedMem.success).toBe(true);

      // 6. Delete Member
      const delMem = await deleteMember(child.id);
      expect(delMem.success).toBe(true);

      // 7. Delete Family
      const delFam = await deleteFamily(fam.id);
      expect(delFam.success).toBe(true);
    });

    it('creates, reads, updates, and deletes friends in friends trip mode', async () => {
      const trip = await createTrip({ name: 'Weekend Trekkers', tripType: 'friends' });

      // 1. Create Friend
      const friend = await addFriend({ tripId: trip.id, name: 'Vikram' });
      expect(friend.name).toBe('Vikram');

      // 2. Update Friend
      const updated = await updateFriend({
        familyId: friend.familyId,
        memberId: friend.memberId,
        name: 'Vikram Malhotra',
      });
      expect(updated.name).toBe('Vikram Malhotra');

      // 3. Delete Friend
      const deleted = await deleteFriend(friend.familyId);
      expect(deleted.success).toBe(true);
    });
  });

  describe('Expense Screen CRUD', () => {
    it('creates, reads, updates, and deletes expenses', async () => {
      const trip = await createTrip({ name: 'Dinner & Movies' });
      const fam = await addFamily({ tripId: trip.id, name: 'Host Family' });

      // 1. Create Expense
      const exp = await createExpense({
        tripId: trip.id,
        title: 'Team Dinner',
        amountPaise: 450000,
        payerFamilyId: fam.id,
        splitType: 'equal_family',
        splits: [{ familyId: fam.id, sharePaise: 450000, weightUsed: 100 }],
      });
      expect(exp.id).toBeDefined();

      // 2. Read Expenses
      const list = await getExpenses(trip.id);
      expect(list.length).toBe(1);
      expect(list[0].title).toBe('Team Dinner');

      // 3. Update Expense
      const updated = await updateExpense({
        expenseId: exp.id,
        tripId: trip.id,
        title: 'Team Buffet Dinner',
        amountPaise: 500000,
        payerFamilyId: fam.id,
        splitType: 'equal_family',
        splits: [{ familyId: fam.id, sharePaise: 500000, weightUsed: 100 }],
      });
      expect(updated.title).toBe('Team Buffet Dinner');
      expect(updated.amountPaise).toBe(500000);

      // 4. Delete Expense
      const del = await deleteExpense(exp.id);
      expect(del.success).toBe(true);
      const afterDel = await getExpenses(trip.id);
      expect(afterDel.length).toBe(0);
    });
  });

  describe('Clipboard Utility', () => {
    it('copies text and retrieves text from clipboard safely', async () => {
      const success = await copyToClipboard('test-encrypted-payload-string');
      expect(typeof success).toBe('boolean');

      const content = await getFromClipboard();
      expect(typeof content).toBe('string');
    });
  });
});
