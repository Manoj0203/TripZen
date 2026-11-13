import { getTableColumns, getTableName } from 'drizzle-orm';
import {
  trips,
  tripFamilies,
  tripMembers,
  expenses,
  expenseSplits,
  settlements,
  tripNotes,
  auditLogs,
} from '../src/db/schema';
import { runMigrations, MIGRATIONS } from '../src/db/migrations';

describe('Database Schema & Migration Layer (JavaScript)', () => {
  describe('Schema Verification', () => {
    test('defines all 8 core tables with appropriate table names', () => {
      expect(getTableName(trips)).toBe('trips');
      expect(getTableName(tripFamilies)).toBe('trip_families');
      expect(getTableName(tripMembers)).toBe('trip_members');
      expect(getTableName(expenses)).toBe('expenses');
      expect(getTableName(expenseSplits)).toBe('expense_splits');
      expect(getTableName(settlements)).toBe('settlements');
      expect(getTableName(tripNotes)).toBe('trip_notes');
      expect(getTableName(auditLogs)).toBe('audit_logs');
    });

    test('enforces mandatory family grouping on tripMembers (familyId is NOT NULL)', () => {
      const columns = getTableColumns(tripMembers);
      expect(columns.familyId).toBeDefined();
      expect(columns.familyId.notNull).toBe(true);
    });

    test('does not include upiId in tripMembers or settlements for v1', () => {
      const memberCols = getTableColumns(tripMembers);
      const settlementCols = getTableColumns(settlements);

      expect(memberCols.upiId).toBeUndefined();
      expect(settlementCols.upiId).toBeUndefined();
    });

    test('stores money in integer paise across expenses, splits, and settlements', () => {
      const expenseCols = getTableColumns(expenses);
      const splitCols = getTableColumns(expenseSplits);
      const settlementCols = getTableColumns(settlements);

      expect(expenseCols.amountPaise).toBeDefined();
      expect(expenseCols.amountPaise.columnType).toBe('SQLiteInteger');

      expect(splitCols.sharePaise).toBeDefined();
      expect(splitCols.sharePaise.columnType).toBe('SQLiteInteger');

      expect(settlementCols.amountPaise).toBeDefined();
      expect(settlementCols.amountPaise.columnType).toBe('SQLiteInteger');
    });

    test('settlements resolve debt from family to family', () => {
      const cols = getTableColumns(settlements);
      expect(cols.fromFamilyId).toBeDefined();
      expect(cols.toFamilyId).toBeDefined();
      expect(cols.fromFamilyId.notNull).toBe(true);
      expect(cols.toFamilyId.notNull).toBe(true);
    });
  });

  describe('Migration Runner', () => {
    test('runs initial migration statements and registers version in __migrations', () => {
      const executedQueries = [];
      const mockRows = [];

      const mockDb = {
        executeSync: jest.fn((sql, params) => {
          executedQueries.push({ sql, params });
          if (sql.includes('SELECT version FROM __migrations')) {
            return { rows: mockRows };
          }
          return { rowsAffected: 1 };
        }),
      };

      runMigrations(mockDb);

      // Verify PRAGMA foreign_keys is set
      expect(executedQueries.some(q => q.sql === 'PRAGMA foreign_keys = ON;')).toBe(true);

      // Verify __migrations table created
      expect(executedQueries.some(q => q.sql.includes('CREATE TABLE IF NOT EXISTS __migrations'))).toBe(true);

      // Verify all initial schema statements were executed
      expect(executedQueries.some(q => q.sql.includes('CREATE TABLE IF NOT EXISTS trips'))).toBe(true);
      expect(executedQueries.some(q => q.sql.includes('CREATE TABLE IF NOT EXISTS trip_families'))).toBe(true);
      expect(executedQueries.some(q => q.sql.includes('CREATE TABLE IF NOT EXISTS trip_members'))).toBe(true);
      expect(executedQueries.some(q => q.sql.includes('CREATE TABLE IF NOT EXISTS expenses'))).toBe(true);

      // Verify migration recorded in __migrations
      expect(executedQueries.some(q =>
        q.sql.includes('INSERT INTO __migrations') &&
        q.params &&
        q.params[0] === 1
      )).toBe(true);
    });

    test('skips migrations that have already been applied', () => {
      const executedQueries = [];
      const mockRows = [{ version: 1 }]; // Version 1 already applied

      const mockDb = {
        executeSync: jest.fn((sql) => {
          executedQueries.push(sql);
          if (sql.includes('SELECT version FROM __migrations')) {
            return { rows: mockRows };
          }
          return { rowsAffected: 0 };
        }),
      };

      runMigrations(mockDb);

      // Should not run table creation statements again
      expect(executedQueries.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS trips'))).toBe(false);
    });
  });
});
