import { generateUUID as uuidv4 } from '../utils/uuid';
import { eq, desc } from 'drizzle-orm';
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

/**
 * Calculates net balances and simplified settlements for a trip,
 * taking into account both expenses and already recorded settlements.
 */
export async function getSettlementDashboard(tripId) {
  const db = getDb();
  const rawExpenses = await db.select().from(expenses).where(eq(expenses.tripId, tripId));
  const rawSplits = await db.select().from(expenseSplits);
  const recordedSettlements = await db.select().from(settlements).where(eq(settlements.tripId, tripId));

  // Build expense + splits structure
  const expenseMap = rawExpenses.map(e => ({
    payerFamilyId: e.payerFamilyId,
    amountPaise: e.amountPaise,
    splits: rawSplits.filter(s => s.expenseId === e.id),
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
