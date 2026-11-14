import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

/**
 * 1. Trips Table
 * Root entity for a trip.
 */
export const trips = sqliteTable('trips', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  currencyCode: text('currency_code').notNull().default('INR'),
  tripType: text('trip_type', { enum: ['families', 'friends'] }).notNull().default('families'),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 2. Trip Families Table
 * Mandatory grouping: Every member belongs to a family unit.
 * Splits and debt settlements resolve at the family level.
 */
export const tripFamilies = sqliteTable('trip_families', {
  id: text('id').primaryKey(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 3. Trip Members Table
 * Individual participants on the trip.
 * familyId is NOT NULL (mandatory family association).
 * No UPI ID (as per v1 requirements).
 */
export const tripMembers = sqliteTable('trip_members', {
  id: text('id').primaryKey(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  familyId: text('family_id')
    .notNull()
    .references(() => tripFamilies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  memberType: text('member_type', { enum: ['adult', 'child'] })
    .notNull()
    .default('adult'),
  // Weight representation: 100 = 1.0x (full adult share), 50 = 0.5x (child share)
  defaultWeight: integer('default_weight').notNull().default(100),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 4. Expenses Table
 * Header for an expense event.
 * amountPaise is stored as integer paise (e.g. ₹250.75 -> 25075) to prevent rounding errors.
 */
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  amountPaise: integer('amount_paise').notNull(),
  payerMemberId: text('payer_member_id').references(() => tripMembers.id),
  payerFamilyId: text('payer_family_id')
    .notNull()
    .references(() => tripFamilies.id),
  splitType: text('split_type', {
    enum: ['equal_family', 'weighted_members', 'custom'],
  })
    .notNull()
    .default('weighted_members'),
  category: text('category').notNull().default('general'),
  expenseDate: integer('expense_date', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 5. Expense Splits Table
 * Stores the exact share owed by each family (and optional member breakdown).
 */
export const expenseSplits = sqliteTable('expense_splits', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id')
    .notNull()
    .references(() => expenses.id, { onDelete: 'cascade' }),
  familyId: text('family_id')
    .notNull()
    .references(() => tripFamilies.id, { onDelete: 'cascade' }),
  memberId: text('member_id').references(() => tripMembers.id, {
    onDelete: 'set null',
  }),
  sharePaise: integer('share_paise').notNull(),
  weightUsed: integer('weight_used').notNull().default(100),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 6. Settlements Table
 * Direct debt settlement transactions between families.
 */
export const settlements = sqliteTable('settlements', {
  id: text('id').primaryKey(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  fromFamilyId: text('from_family_id')
    .notNull()
    .references(() => tripFamilies.id),
  toFamilyId: text('to_family_id')
    .notNull()
    .references(() => tripFamilies.id),
  amountPaise: integer('amount_paise').notNull(),
  paymentMethod: text('payment_method', {
    enum: ['cash', 'online', 'other'],
  })
    .notNull()
    .default('cash'),
  notes: text('notes'),
  settledAt: integer('settled_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 7. Trip Notes Table
 * Offline notes, itineraries, reminders.
 */
export const tripNotes = sqliteTable('trip_notes', {
  id: text('id').primaryKey(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * 8. Audit Logs Table
 * Audit log recording all expense/settlement/family creations, modifications, and deletions.
 */
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
  changesJson: text('changes_json').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
});

// --- Drizzle Relations ---

export const tripsRelations = relations(trips, ({ many }) => ({
  families: many(tripFamilies),
  members: many(tripMembers),
  expenses: many(expenses),
  settlements: many(settlements),
  notes: many(tripNotes),
  auditLogs: many(auditLogs),
}));

export const tripFamiliesRelations = relations(tripFamilies, ({ one, many }) => ({
  trip: one(trips, {
    fields: [tripFamilies.tripId],
    references: [trips.id],
  }),
  members: many(tripMembers),
  splits: many(expenseSplits),
  settlementsFrom: many(settlements, { relationName: 'settlement_from_family' }),
  settlementsTo: many(settlements, { relationName: 'settlement_to_family' }),
  expensesPaid: many(expenses),
}));

export const tripMembersRelations = relations(tripMembers, ({ one, many }) => ({
  trip: one(trips, {
    fields: [tripMembers.tripId],
    references: [trips.id],
  }),
  family: one(tripFamilies, {
    fields: [tripMembers.familyId],
    references: [tripFamilies.id],
  }),
  expensesPaid: many(expenses),
  splits: many(expenseSplits),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  trip: one(trips, {
    fields: [expenses.tripId],
    references: [trips.id],
  }),
  payerFamily: one(tripFamilies, {
    fields: [expenses.payerFamilyId],
    references: [tripFamilies.id],
  }),
  payerMember: one(tripMembers, {
    fields: [expenses.payerMemberId],
    references: [tripMembers.id],
  }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
  family: one(tripFamilies, {
    fields: [expenseSplits.familyId],
    references: [tripFamilies.id],
  }),
  member: one(tripMembers, {
    fields: [expenseSplits.memberId],
    references: [tripMembers.id],
  }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  trip: one(trips, {
    fields: [settlements.tripId],
    references: [trips.id],
  }),
  fromFamily: one(tripFamilies, {
    fields: [settlements.fromFamilyId],
    references: [tripFamilies.id],
    relationName: 'settlement_from_family',
  }),
  toFamily: one(tripFamilies, {
    fields: [settlements.toFamilyId],
    references: [tripFamilies.id],
    relationName: 'settlement_to_family',
  }),
}));

export const tripNotesRelations = relations(tripNotes, ({ one }) => ({
  trip: one(trips, {
    fields: [tripNotes.tripId],
    references: [trips.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  trip: one(trips, {
    fields: [auditLogs.tripId],
    references: [trips.id],
  }),
}));

/**
 * 10. App Settings Table
 * Persistent key-value store for user preferences and configuration.
 */
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
