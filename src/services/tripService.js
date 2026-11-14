import { generateUUID as uuidv4 } from '../utils/uuid';
import { eq, desc, inArray } from 'drizzle-orm';
import { getDb } from '../db/client';
import {
  trips,
  tripFamilies,
  tripMembers,
  expenses,
  expenseSplits,
  settlements,
} from '../db/schema';
import { computeFamilyWeight, calculateWeightedSplit, calculateEqualFamilySplit } from '../logic/splitCalculator';
import { computeNetBalances, simplifyDebts } from '../logic/debtSimplifier';
import { encryptData, decryptData } from '../logic/encryption';

/**
 * Service providing high-level business queries for TripZen.
 */

export async function createTrip({ name, description = '', tripType = 'families' }) {
  const db = getDb();
  const tripId = uuidv4();
  const now = new Date();

  await db.insert(trips).values({
    id: tripId,
    name,
    description,
    tripType,
    currencyCode: 'INR',
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  });

  return { id: tripId, name, description, tripType };
}

export async function getTrips() {
  const db = getDb();
  return await db.select().from(trips).orderBy(desc(trips.createdAt));
}

export async function getTripById(tripId) {
  const db = getDb();
  const res = await db.select().from(trips).where(eq(trips.id, tripId));
  return res[0] || null;
}

export async function addFamily({ tripId, name }) {
  const db = getDb();
  const familyId = uuidv4();
  const now = new Date();

  await db.insert(tripFamilies).values({
    id: familyId,
    tripId,
    name,
    createdAt: now,
    updatedAt: now,
  });

  return { id: familyId, tripId, name };
}

export async function addMember({ tripId, familyId, name, memberType = 'adult', defaultWeight = 100 }) {
  const db = getDb();
  const memberId = uuidv4();
  const now = new Date();

  await db.insert(tripMembers).values({
    id: memberId,
    tripId,
    familyId,
    name,
    memberType,
    defaultWeight,
    createdAt: now,
    updatedAt: now,
  });

  return { id: memberId, tripId, familyId, name, memberType, defaultWeight };
}

/**
 * Convenience helper for 'friends' trips:
 * Adds a friend by creating a 1-person family and member behind the scenes.
 */
export async function addFriend({ tripId, name }) {
  const family = await addFamily({ tripId, name });
  const member = await addMember({
    tripId,
    familyId: family.id,
    name,
    memberType: 'adult',
    defaultWeight: 100,
  });
  return { familyId: family.id, memberId: member.id, name };
}

export async function getParticipants(tripId) {
  const db = getDb();
  const families = await db.select().from(tripFamilies).where(eq(tripFamilies.tripId, tripId));
  const members = await db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId));

  const familyMap = {};
  families.forEach(f => {
    familyMap[f.id] = { ...f, members: [] };
  });

  members.forEach(m => {
    if (familyMap[m.familyId]) {
      familyMap[m.familyId].members.push(m);
    }
  });

  return Object.values(familyMap);
}

export async function createExpense({
  tripId,
  title,
  amountPaise,
  payerFamilyId,
  payerMemberId = null,
  splitType = 'weighted_members',
  splits = [],
}) {
  const db = getDb();
  const expenseId = uuidv4();
  const now = new Date();

  await db.insert(expenses).values({
    id: expenseId,
    tripId,
    title,
    amountPaise,
    payerFamilyId,
    payerMemberId,
    splitType,
    category: 'general',
    expenseDate: now,
    createdAt: now,
    updatedAt: now,
  });

  if (splits.length > 0) {
    for (const split of splits) {
      await db.insert(expenseSplits).values({
        id: uuidv4(),
        expenseId,
        familyId: split.familyId,
        memberId: split.memberId || null,
        sharePaise: split.sharePaise,
        weightUsed: split.weightUsed || 100,
        createdAt: now,
      });
    }
  }

  return { id: expenseId, title, amountPaise };
}

export async function getExpenses(tripId) {
  const db = getDb();
  return await db.select().from(expenses).where(eq(expenses.tripId, tripId)).orderBy(desc(expenses.expenseDate));
}

export async function recordSettlement({
  tripId,
  fromFamilyId,
  toFamilyId,
  amountPaise,
  paymentMethod = 'cash',
  notes = '',
}) {
  const db = getDb();
  const settlementId = uuidv4();
  const now = new Date();

  await db.insert(settlements).values({
    id: settlementId,
    tripId,
    fromFamilyId,
    toFamilyId,
    amountPaise,
    paymentMethod,
    notes,
    settledAt: now,
    createdAt: now,
  });

  return { id: settlementId, fromFamilyId, toFamilyId, amountPaise };
}

export async function getSettlements(tripId) {
  const db = getDb();
  return await db.select().from(settlements).where(eq(settlements.tripId, tripId)).orderBy(desc(settlements.settledAt));
}

export async function deleteSettlement(settlementId) {
  const db = getDb();
  await db.delete(settlements).where(eq(settlements.id, settlementId));
  return { success: true, settlementId };
}

/**
 * Calculates net balances and simplified settlements for a trip,
 * taking into account both expenses and already recorded settlements.
 */
export async function getSettlementDashboard(tripId) {
  const db = getDb();
  const rawExpenses = await db.select().from(expenses).where(eq(expenses.tripId, tripId));
  const expenseIds = rawExpenses.map(e => e.id);

  let rawSplits = [];
  if (expenseIds.length > 0) {
    rawSplits = await db
      .select()
      .from(expenseSplits)
      .where(inArray(expenseSplits.expenseId, expenseIds));
  }

  const recordedSettlements = await db.select().from(settlements).where(eq(settlements.tripId, tripId));

  // Build expense + splits structure
  const splitsByExpenseId = new Map();
  for (const s of rawSplits) {
    if (!splitsByExpenseId.has(s.expenseId)) {
      splitsByExpenseId.set(s.expenseId, []);
    }
    splitsByExpenseId.get(s.expenseId).push(s);
  }

  const expenseMap = rawExpenses.map(e => ({
    payerFamilyId: e.payerFamilyId,
    amountPaise: e.amountPaise,
    splits: splitsByExpenseId.get(e.id) || [],
  }));

  const netBalances = computeNetBalances(expenseMap);

  // Adjust for already paid settlements
  for (const s of recordedSettlements) {
    if (!netBalances[s.fromFamilyId]) netBalances[s.fromFamilyId] = 0;
    if (!netBalances[s.toFamilyId]) netBalances[s.toFamilyId] = 0;
    netBalances[s.fromFamilyId] += s.amountPaise; // payer paid their debt
    netBalances[s.toFamilyId] -= s.amountPaise;   // receiver got their money
  }

  const suggestedSettlements = simplifyDebts(netBalances);

  return {
    netBalances,
    suggestedSettlements,
    recordedSettlements,
  };
}

export async function updateFamily(familyId, { name }) {
  const db = getDb();
  const now = new Date();
  await db.update(tripFamilies).set({ name, updatedAt: now }).where(eq(tripFamilies.id, familyId));
  return { success: true, familyId, name };
}

export async function deleteFamily(familyId) {
  const db = getDb();
  // Clean up settlements and splits referencing this family
  await db.delete(settlements).where(eq(settlements.fromFamilyId, familyId));
  await db.delete(settlements).where(eq(settlements.toFamilyId, familyId));
  await db.delete(expenseSplits).where(eq(expenseSplits.familyId, familyId));
  await db.delete(expenses).where(eq(expenses.payerFamilyId, familyId));
  await db.delete(tripMembers).where(eq(tripMembers.familyId, familyId));
  await db.delete(tripFamilies).where(eq(tripFamilies.id, familyId));
  return { success: true, familyId };
}

export async function updateMember(memberId, { name, memberType, defaultWeight }) {
  const db = getDb();
  const now = new Date();
  const updates = { updatedAt: now };
  if (name !== undefined) updates.name = name;
  if (memberType !== undefined) updates.memberType = memberType;
  if (defaultWeight !== undefined) updates.defaultWeight = defaultWeight;
  await db.update(tripMembers).set(updates).where(eq(tripMembers.id, memberId));
  return { success: true, memberId };
}

export async function deleteMember(memberId) {
  const db = getDb();
  await db.delete(expenseSplits).where(eq(expenseSplits.memberId, memberId));
  await db.delete(tripMembers).where(eq(tripMembers.id, memberId));
  return { success: true, memberId };
}

export async function updateFriend({ familyId, memberId, name }) {
  const db = getDb();
  const now = new Date();
  if (familyId) {
    await db.update(tripFamilies).set({ name, updatedAt: now }).where(eq(tripFamilies.id, familyId));
  }
  if (memberId) {
    await db.update(tripMembers).set({ name, updatedAt: now }).where(eq(tripMembers.id, memberId));
  }
  return { success: true, familyId, memberId, name };
}

export async function deleteFriend(familyId) {
  return await deleteFamily(familyId);
}

export async function updateTrip(tripId, { name, description, tripType }) {
  const db = getDb();
  const now = new Date();
  const updates = { updatedAt: now };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (tripType !== undefined) updates.tripType = tripType;
  await db.update(trips).set(updates).where(eq(trips.id, tripId));
  return { success: true, tripId };
}

export async function deleteTrip(tripId) {
  const db = getDb();
  // Cascaded cleanup of trip elements
  await db.delete(settlements).where(eq(settlements.tripId, tripId));
  const tripExp = await db.select({ id: expenses.id }).from(expenses).where(eq(expenses.tripId, tripId));
  for (const exp of tripExp) {
    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, exp.id));
  }
  await db.delete(expenses).where(eq(expenses.tripId, tripId));
  await db.delete(tripMembers).where(eq(tripMembers.tripId, tripId));
  await db.delete(tripFamilies).where(eq(tripFamilies.tripId, tripId));
  await db.delete(trips).where(eq(trips.id, tripId));
  return { success: true, tripId };
}

export async function getExpenseById(expenseId) {
  const db = getDb();
  const exp = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!exp || exp.length === 0) return null;
  const splits = await db.select().from(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  return { ...exp[0], splits };
}

export async function updateExpense({
  expenseId,
  title,
  amountPaise,
  payerFamilyId,
  payerMemberId = null,
  splitType = 'weighted_members',
  splits = [],
}) {
  const db = getDb();
  const now = new Date();

  await db.update(expenses).set({
    title,
    amountPaise,
    payerFamilyId,
    payerMemberId,
    splitType,
    updatedAt: now,
  }).where(eq(expenses.id, expenseId));

  await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  if (splits.length > 0) {
    for (const split of splits) {
      await db.insert(expenseSplits).values({
        id: uuidv4(),
        expenseId,
        familyId: split.familyId,
        memberId: split.memberId || null,
        sharePaise: split.sharePaise,
        weightUsed: split.weightUsed || 100,
        createdAt: now,
      });
    }
  }

  return { id: expenseId, title, amountPaise };
}

export async function deleteExpense(expenseId) {
  const db = getDb();
  await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  await db.delete(expenses).where(eq(expenses.id, expenseId));
  return { success: true, expenseId };
}

export async function archiveTrip(tripId, isArchived = true) {
  const db = getDb();
  const now = new Date();
  await db.update(trips).set({ isArchived, updatedAt: now }).where(eq(trips.id, tripId));
  return { success: true, tripId, isArchived };
}

/**
 * Export full trip data into an encrypted payload.
 */
export async function exportTripEncrypted(tripId, password) {
  const db = getDb();
  const trip = await getTripById(tripId);
  const families = await db.select().from(tripFamilies).where(eq(tripFamilies.tripId, tripId));
  const members = await db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId));
  const exp = await db.select().from(expenses).where(eq(expenses.tripId, tripId));
  const splits = await db.select().from(expenseSplits);
  const setts = await db.select().from(settlements).where(eq(settlements.tripId, tripId));

  const payload = {
    trip,
    families,
    members,
    expenses: exp,
    expenseSplits: splits.filter(s => exp.some(e => e.id === s.expenseId)),
    settlements: setts,
  };

  return encryptData(payload, password);
}

/**
 * Import a full trip from an AES-256 encrypted payload string.
 */
export async function importTripEncrypted(encryptedBase64, password) {
  const db = getDb();
  const payload = decryptData(encryptedBase64, password);

  if (!payload || !payload.trip || !payload.trip.id || !payload.trip.name) {
    throw new Error('Invalid trip backup format.');
  }

  const {
    trip,
    families = [],
    members = [],
    expenses: expList = [],
    expenseSplits: splitList = [],
    settlements: settList = [],
  } = payload;

  // If trip already exists locally, delete it first to ensure clean overwrite
  const existing = await getTripById(trip.id);
  if (existing) {
    await deleteTrip(trip.id);
  }

  const now = new Date();

  // 1. Insert Trip
  await db.insert(trips).values({
    id: trip.id,
    name: trip.name,
    description: trip.description || '',
    tripType: trip.tripType || 'families',
    currencyCode: trip.currencyCode || 'INR',
    isArchived: Boolean(trip.isArchived),
    createdAt: trip.createdAt ? new Date(trip.createdAt) : now,
    updatedAt: now,
  });

  // 2. Insert Families
  for (const f of families) {
    await db.insert(tripFamilies).values({
      id: f.id,
      tripId: trip.id,
      name: f.name,
      createdAt: f.createdAt ? new Date(f.createdAt) : now,
      updatedAt: now,
    });
  }

  // 3. Insert Members
  for (const m of members) {
    await db.insert(tripMembers).values({
      id: m.id,
      tripId: trip.id,
      familyId: m.familyId,
      name: m.name,
      memberType: m.memberType || 'adult',
      defaultWeight: Number(m.defaultWeight) || 100,
      createdAt: m.createdAt ? new Date(m.createdAt) : now,
      updatedAt: now,
    });
  }

  // 4. Insert Expenses
  for (const e of expList) {
    await db.insert(expenses).values({
      id: e.id,
      tripId: trip.id,
      title: e.title,
      amountPaise: Number(e.amountPaise),
      payerFamilyId: e.payerFamilyId,
      payerMemberId: e.payerMemberId || null,
      splitType: e.splitType || 'weighted_members',
      category: e.category || 'general',
      expenseDate: e.expenseDate ? new Date(e.expenseDate) : now,
      createdAt: e.createdAt ? new Date(e.createdAt) : now,
      updatedAt: now,
    });
  }

  // 5. Insert Splits
  for (const s of splitList) {
    await db.insert(expenseSplits).values({
      id: s.id || uuidv4(),
      expenseId: s.expenseId,
      familyId: s.familyId,
      memberId: s.memberId || null,
      sharePaise: Number(s.sharePaise),
      weightUsed: Number(s.weightUsed) || 100,
      createdAt: s.createdAt ? new Date(s.createdAt) : now,
    });
  }

  // 6. Insert Settlements
  for (const st of settList) {
    await db.insert(settlements).values({
      id: st.id || uuidv4(),
      tripId: trip.id,
      fromFamilyId: st.fromFamilyId,
      toFamilyId: st.toFamilyId,
      amountPaise: Number(st.amountPaise),
      paymentMethod: st.paymentMethod || 'cash',
      notes: st.notes || '',
      settledAt: st.settledAt ? new Date(st.settledAt) : now,
      createdAt: st.createdAt ? new Date(st.createdAt) : now,
    });
  }

  return trip;
}
