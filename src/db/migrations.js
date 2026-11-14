/**
 * Database Migration & Schema Initialization Layer
 * Offline-first schema setup for TripZen with foreign key integrity.
 */

export const INITIAL_SCHEMA_STATEMENTS = [
  // 1. Enable Foreign Keys
  'PRAGMA foreign_keys = ON;',

  // 2. Trips Table
  `CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    currency_code TEXT NOT NULL DEFAULT 'INR',
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  // 3. Trip Families Table (Mandatory grouping for members)
  `CREATE TABLE IF NOT EXISTS trip_families (
    id TEXT PRIMARY KEY NOT NULL,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  // 4. Trip Members Table (family_id NOT NULL, no UPI ID)
  `CREATE TABLE IF NOT EXISTS trip_members (
    id TEXT PRIMARY KEY NOT NULL,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    family_id TEXT NOT NULL REFERENCES trip_families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    member_type TEXT NOT NULL DEFAULT 'adult',
    default_weight INTEGER NOT NULL DEFAULT 100,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  // 5. Expenses Table (amount_paise stored as integer)
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    payer_member_id TEXT REFERENCES trip_members(id),
    payer_family_id TEXT NOT NULL REFERENCES trip_families(id),
    split_type TEXT NOT NULL DEFAULT 'weighted_members',
    category TEXT NOT NULL DEFAULT 'general',
    expense_date INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  // 6. Expense Splits Table (Splits attributed to families and optional members)
  `CREATE TABLE IF NOT EXISTS expense_splits (
    id TEXT PRIMARY KEY NOT NULL,
    expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    family_id TEXT NOT NULL REFERENCES trip_families(id) ON DELETE CASCADE,
    member_id TEXT REFERENCES trip_members(id) ON DELETE SET NULL,
    share_paise INTEGER NOT NULL,
    weight_used INTEGER NOT NULL DEFAULT 100,
    created_at INTEGER NOT NULL
  );`,

  // 7. Settlements Table (Family to Family settlement)
  `CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY NOT NULL,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    from_family_id TEXT NOT NULL REFERENCES trip_families(id),
    to_family_id TEXT NOT NULL REFERENCES trip_families(id),
    amount_paise INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    notes TEXT,
    settled_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );`,

  // 8. Trip Notes Table
  `CREATE TABLE IF NOT EXISTS trip_notes (
    id TEXT PRIMARY KEY NOT NULL,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  // 9. Audit Logs Table
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    changes_json TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );`,

  // 10. App Settings Table
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  // Performance Indexes
  'CREATE INDEX IF NOT EXISTS idx_trip_families_trip ON trip_families(trip_id);',
  'CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON trip_members(trip_id);',
  'CREATE INDEX IF NOT EXISTS idx_trip_members_family ON trip_members(family_id);',
  'CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);',
  'CREATE INDEX IF NOT EXISTS idx_expenses_family ON expenses(payer_family_id);',
  'CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);',
  'CREATE INDEX IF NOT EXISTS idx_expense_splits_family ON expense_splits(family_id);',
  'CREATE INDEX IF NOT EXISTS idx_settlements_trip ON settlements(trip_id);',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_trip ON audit_logs(trip_id);',
];

export const MIGRATIONS = [
  {
    version: 1,
    name: '0001_initial_schema',
    statements: INITIAL_SCHEMA_STATEMENTS,
  },
  {
    version: 2,
    name: '0002_add_trip_type',
    statements: [
      "ALTER TABLE trips ADD COLUMN trip_type TEXT NOT NULL DEFAULT 'families';",
    ],
  },
  {
    version: 3,
    name: '0003_add_app_settings',
    statements: [
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
    ],
  },
];

/**
 * Migration Runner
 * Applies versioned migrations incrementally to an op-sqlite instance.
 *
 * @param {object} sqliteDb op-sqlite database instance with executeSync or execute
 */
export function runMigrations(sqliteDb) {
  // Helper to execute query synchronously if supported, else async
  const exec = (sql, params = []) => {
    if (typeof sqliteDb.executeSync === 'function') {
      return sqliteDb.executeSync(sql, params);
    }
    return sqliteDb.execute(sql, params);
  };

  // 1. Ensure foreign keys are enabled
  exec('PRAGMA foreign_keys = ON;');

  // 2. Ensure migration tracking table exists
  exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  // 3. Get list of already applied versions
  const appliedRows = exec('SELECT version FROM __migrations ORDER BY version ASC;');
  const appliedVersions = new Set();

  if (appliedRows && appliedRows.rows) {
    for (let i = 0; i < appliedRows.rows.length; i++) {
      appliedVersions.add(appliedRows.rows[i].version);
    }
  }

  // 4. Apply unapplied migrations in order
  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      for (const statement of migration.statements) {
        exec(statement);
      }
      exec(
        'INSERT INTO __migrations (version, name, applied_at) VALUES (?, ?, ?);',
        [migration.version, migration.name, Date.now()]
      );
    }
  }
}
