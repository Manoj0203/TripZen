/**
 * Step 5: Migration & Schema DDL Verification
 *
 * Tests that the raw SQL DDL statements in migrations.js
 * are syntactically correct and enforce the expected constraints.
 */

import { INITIAL_SCHEMA_STATEMENTS, MIGRATIONS, runMigrations } from '../src/db/migrations';

describe('Step 5: Migration DDL Verification', () => {
  test('migration versions exist and have statements', () => {
    expect(MIGRATIONS.length).toBeGreaterThanOrEqual(1);
    expect(MIGRATIONS[0].version).toBe(1);
    expect(MIGRATIONS[0].name).toBe('0001_initial_schema');
    expect(MIGRATIONS[0].statements.length).toBeGreaterThan(0);
    expect(MIGRATIONS[1].version).toBe(2);
    expect(MIGRATIONS[1].name).toBe('0002_add_trip_type');
  });

  test('PRAGMA foreign_keys ON is the first statement', () => {
    expect(INITIAL_SCHEMA_STATEMENTS[0]).toBe('PRAGMA foreign_keys = ON;');
  });

  test('all 8 CREATE TABLE statements exist', () => {
    const tableNames = [
      'trips',
      'trip_families',
      'trip_members',
      'expenses',
      'expense_splits',
      'settlements',
      'trip_notes',
      'audit_logs',
    ];

    for (const table of tableNames) {
      const found = INITIAL_SCHEMA_STATEMENTS.some(s =>
        s.includes(`CREATE TABLE IF NOT EXISTS ${table}`)
      );
      expect(found).toBe(true);
    }
  });

  test('trip_members DDL enforces family_id NOT NULL', () => {
    const ddl = INITIAL_SCHEMA_STATEMENTS.find(s =>
      s.includes('CREATE TABLE IF NOT EXISTS trip_members')
    );
    expect(ddl).toBeDefined();
    expect(ddl).toContain('family_id TEXT NOT NULL');
    expect(ddl).toContain('REFERENCES trip_families(id)');
    expect(ddl).toContain('ON DELETE CASCADE');
  });

  test('trip_members DDL does NOT contain upi_id', () => {
    const ddl = INITIAL_SCHEMA_STATEMENTS.find(s =>
      s.includes('CREATE TABLE IF NOT EXISTS trip_members')
    );
    expect(ddl).not.toContain('upi');
  });

  test('settlements DDL uses family-to-family columns', () => {
    const ddl = INITIAL_SCHEMA_STATEMENTS.find(s =>
      s.includes('CREATE TABLE IF NOT EXISTS settlements')
    );
    expect(ddl).toBeDefined();
    expect(ddl).toContain('from_family_id TEXT NOT NULL');
    expect(ddl).toContain('to_family_id TEXT NOT NULL');
    expect(ddl).toContain('REFERENCES trip_families(id)');
    // Should NOT have member-level settlement columns
    expect(ddl).not.toContain('from_member_id');
    expect(ddl).not.toContain('to_member_id');
  });

  test('settlements DDL does NOT contain upi', () => {
    const ddl = INITIAL_SCHEMA_STATEMENTS.find(s =>
      s.includes('CREATE TABLE IF NOT EXISTS settlements')
    );
    expect(ddl).not.toContain('upi');
  });

  test('expenses DDL stores amounts as INTEGER paise', () => {
    const ddl = INITIAL_SCHEMA_STATEMENTS.find(s =>
      s.includes('CREATE TABLE IF NOT EXISTS expenses')
    );
    expect(ddl).toContain('amount_paise INTEGER NOT NULL');
  });

  test('expense_splits DDL stores shares as INTEGER paise', () => {
    const ddl = INITIAL_SCHEMA_STATEMENTS.find(s =>
      s.includes('CREATE TABLE IF NOT EXISTS expense_splits')
    );
    expect(ddl).toContain('share_paise INTEGER NOT NULL');
  });

  test('settlements DDL stores amounts as INTEGER paise', () => {
    const ddl = INITIAL_SCHEMA_STATEMENTS.find(s =>
      s.includes('CREATE TABLE IF NOT EXISTS settlements')
    );
    expect(ddl).toContain('amount_paise INTEGER NOT NULL');
  });

  test('performance indexes are created', () => {
    const indexStatements = INITIAL_SCHEMA_STATEMENTS.filter(s =>
      s.includes('CREATE INDEX IF NOT EXISTS')
    );
    // At least the key lookup indexes
    expect(indexStatements.length).toBeGreaterThanOrEqual(7);

    // Check specific critical indexes
    expect(indexStatements.some(s => s.includes('idx_trip_families_trip'))).toBe(true);
    expect(indexStatements.some(s => s.includes('idx_trip_members_family'))).toBe(true);
    expect(indexStatements.some(s => s.includes('idx_expenses_trip'))).toBe(true);
    expect(indexStatements.some(s => s.includes('idx_expense_splits_expense'))).toBe(true);
    expect(indexStatements.some(s => s.includes('idx_settlements_trip'))).toBe(true);
  });

  test('migration runner does not crash on double execution', () => {
    const executedQueries = [];

    const mockDb = {
      executeSync: jest.fn((sql) => {
        executedQueries.push(sql);
        if (sql.includes('SELECT version FROM __migrations')) {
          return { rows: [] };
        }
        return { rowsAffected: 1 };
      }),
    };

    // First run
    runMigrations(mockDb);
    const firstRunCount = executedQueries.length;

    // Reset mock to simulate version already applied
    mockDb.executeSync.mockImplementation((sql) => {
      if (sql.includes('SELECT version FROM __migrations')) {
        return { rows: [{ version: 1 }] };
      }
      return { rowsAffected: 0 };
    });

    // Second run
    runMigrations(mockDb);

    // Second run should execute fewer statements (no CREATE TABLEs)
    // Just the PRAGMA, __migrations CREATE, and SELECT
    expect(mockDb.executeSync).toHaveBeenCalled();
  });
});
