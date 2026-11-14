import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import {
  appSettings,
  trips,
  tripFamilies,
  tripMembers,
  expenses,
  expenseSplits,
  settlements,
  tripNotes,
  auditLogs,
} from '../db/schema';
import { encryptData, decryptData } from '../logic/encryption';
import { formatPaiseToRupees } from '../logic/currencyFormatter';
import { getSettlementDashboard, getParticipants, getExpenses } from './tripService';

/**
 * Retrieve a single setting by key.
 */
export async function getSetting(key, defaultValue = null) {
  try {
    const db = getDb();
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (rows && rows.length > 0) {
      try {
        return JSON.parse(rows[0].value);
      } catch {
        return rows[0].value;
      }
    }
    return defaultValue;
  } catch (e) {
    console.error(`Failed to get setting "${key}":`, e);
    return defaultValue;
  }
}

/**
 * Save or update a setting.
 */
export async function setSetting(key, value) {
  try {
    const db = getDb();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));

    const now = new Date();
    if (existing && existing.length > 0) {
      await db
        .update(appSettings)
        .set({ value: serialized, updatedAt: now })
        .where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({
        key,
        value: serialized,
        updatedAt: now,
      });
    }
    return true;
  } catch (e) {
    console.error(`Failed to set setting "${key}":`, e);
    return false;
  }
}

/**
 * Get all settings as a key-value object.
 */
export async function getAllSettings() {
  try {
    const db = getDb();
    const rows = await db.select().from(appSettings);
    const result = {
      theme: 'system',
      defaultTripType: 'families',
      defaultChildWeight: 50,
    };

    if (rows && Array.isArray(rows)) {
      for (const row of rows) {
        try {
          result[row.key] = JSON.parse(row.value);
        } catch {
          result[row.key] = row.value;
        }
      }
    }
    return result;
  } catch (e) {
    console.error('Failed to get all settings:', e);
    return {
      theme: 'system',
      defaultTripType: 'families',
      defaultChildWeight: 50,
    };
  }
}

/**
 * Retrieve database storage stats.
 */
export async function getStorageStats() {
  try {
    const db = getDb();
    const [allTrips, allExp, allSett, allMem] = await Promise.all([
      db.select().from(trips),
      db.select().from(expenses),
      db.select().from(settlements),
      db.select().from(tripMembers),
    ]);

    return {
      totalTrips: allTrips?.length || 0,
      totalExpenses: allExp?.length || 0,
      totalSettlements: allSett?.length || 0,
      totalParticipants: allMem?.length || 0,
    };
  } catch (e) {
    console.error('Failed to get storage stats:', e);
    return {
      totalTrips: 0,
      totalExpenses: 0,
      totalSettlements: 0,
      totalParticipants: 0,
    };
  }
}

/**
 * Hard reset all user data (trips, participants, expenses, settlements).
 * Preserves app settings.
 */
export async function clearAllData() {
  const db = getDb();
  await db.delete(settlements);
  await db.delete(expenseSplits);
  await db.delete(expenses);
  await db.delete(tripMembers);
  await db.delete(tripFamilies);
  await db.delete(tripNotes);
  await db.delete(auditLogs);
  await db.delete(trips);
  return true;
}

/**
 * Export complete multi-trip database archive encrypted with AES-256.
 */
export async function exportAllDataEncrypted(password) {
  if (!password || !password.trim()) {
    throw new Error('Encryption password is required.');
  }

  const db = getDb();
  const [
    allTrips,
    allFamilies,
    allMembers,
    allExpenses,
    allSplits,
    allSettlements,
    allNotes,
  ] = await Promise.all([
    db.select().from(trips),
    db.select().from(tripFamilies),
    db.select().from(tripMembers),
    db.select().from(expenses),
    db.select().from(expenseSplits),
    db.select().from(settlements),
    db.select().from(tripNotes),
  ]);

  const archive = {
    version: '1.0',
    type: 'tripzen_full_backup',
    exportedAt: Date.now(),
    trips: allTrips || [],
    families: allFamilies || [],
    members: allMembers || [],
    expenses: allExpenses || [],
    expenseSplits: allSplits || [],
    settlements: allSettlements || [],
    tripNotes: allNotes || [],
  };

  return encryptData(archive, password.trim());
}

/**
 * Import and restore a full database backup archive.
 */
export async function importAllDataEncrypted(encryptedBase64, password) {
  if (!encryptedBase64 || !encryptedBase64.trim()) {
    throw new Error('Encrypted backup string is required.');
  }
  if (!password || !password.trim()) {
    throw new Error('Decryption password is required.');
  }

  const payload = decryptData(encryptedBase64.trim(), password.trim());

  if (!payload || !payload.trips || !Array.isArray(payload.trips)) {
    throw new Error('Invalid full backup payload format.');
  }

  const db = getDb();
  const now = new Date();

  // Process trips one by one, replacing any existing ones
  for (const t of payload.trips) {
    const existing = await db.select().from(trips).where(eq(trips.id, t.id));
    if (existing && existing.length > 0) {
      await db.delete(trips).where(eq(trips.id, t.id));
    }

    await db.insert(trips).values({
      id: t.id,
      name: t.name,
      description: t.description || '',
      tripType: t.tripType || 'families',
      currencyCode: t.currencyCode || 'INR',
      isArchived: Boolean(t.isArchived),
      createdAt: t.createdAt ? new Date(t.createdAt) : now,
      updatedAt: now,
    });
  }

  // Insert Families
  if (Array.isArray(payload.families)) {
    for (const f of payload.families) {
      await db.insert(tripFamilies).values({
        id: f.id,
        tripId: f.tripId,
        name: f.name,
        createdAt: f.createdAt ? new Date(f.createdAt) : now,
        updatedAt: now,
      });
    }
  }

  // Insert Members
  if (Array.isArray(payload.members)) {
    for (const m of payload.members) {
      await db.insert(tripMembers).values({
        id: m.id,
        tripId: m.tripId,
        familyId: m.familyId,
        name: m.name,
        memberType: m.memberType || 'adult',
        defaultWeight: Number(m.defaultWeight) || 100,
        createdAt: m.createdAt ? new Date(m.createdAt) : now,
        updatedAt: now,
      });
    }
  }

  // Insert Expenses
  if (Array.isArray(payload.expenses)) {
    for (const e of payload.expenses) {
      await db.insert(expenses).values({
        id: e.id,
        tripId: e.tripId,
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
  }

  // Insert Expense Splits
  if (Array.isArray(payload.expenseSplits)) {
    for (const s of payload.expenseSplits) {
      await db.insert(expenseSplits).values({
        id: s.id,
        expenseId: s.expenseId,
        familyId: s.familyId,
        memberId: s.memberId || null,
        sharePaise: Number(s.sharePaise),
        weightUsed: Number(s.weightUsed) || 100,
        createdAt: s.createdAt ? new Date(s.createdAt) : now,
      });
    }
  }

  // Insert Settlements
  if (Array.isArray(payload.settlements)) {
    for (const st of payload.settlements) {
      await db.insert(settlements).values({
        id: st.id,
        tripId: st.tripId,
        fromFamilyId: st.fromFamilyId,
        toFamilyId: st.toFamilyId,
        amountPaise: Number(st.amountPaise),
        paymentMethod: st.paymentMethod || 'cash',
        notes: st.notes || '',
        settledAt: st.settledAt ? new Date(st.settledAt) : now,
        createdAt: st.createdAt ? new Date(st.createdAt) : now,
      });
    }
  }

  return { restoredTripsCount: payload.trips.length };
}

/**
 * Generate a beautifully structured, shareable trip summary document text.
 */
export async function generateTripSummaryDoc(tripId, tripName = 'Trip') {
  const [dash, parts, expList] = await Promise.all([
    getSettlementDashboard(tripId),
    getParticipants(tripId),
    getExpenses(tripId),
  ]);

  const getName = (id) => {
    const found = parts.find((p) => p.id === id);
    return found ? found.name : 'Unknown';
  };

  const totalPaise = (expList || []).reduce((sum, e) => sum + e.amountPaise, 0);
  const { netBalances = {}, suggestedSettlements = [], recordedSettlements = [] } = dash || {};

  const lines = [
    '========================================',
    `🌴 ${tripName.toUpperCase()} — TRIPZEN SUMMARY`,
    '========================================',
    `📅 Generated: ${new Date().toLocaleDateString()}`,
    `💰 Total Expenses: ${formatPaiseToRupees(totalPaise)} (${(expList || []).length} expenses)`,
    '',
    '----------------------------------------',
    '📊 FINAL BALANCES',
    '----------------------------------------',
  ];

  const participantIds = Object.keys(netBalances);
  if (participantIds.length === 0) {
    lines.push('No balance calculations available.');
  } else {
    for (const pid of participantIds) {
      const bal = netBalances[pid] || 0;
      const name = getName(pid);
      if (bal === 0) {
        lines.push(`• ${name}: Settled`);
      } else if (bal > 0) {
        lines.push(`• ${name}: +${formatPaiseToRupees(bal)} (Receives back)`);
      } else {
        lines.push(`• ${name}: -${formatPaiseToRupees(Math.abs(bal))} (Owes)`);
      }
    }
  }

  lines.push('');
  lines.push('----------------------------------------');
  lines.push('🤝 SETTLEMENT PAYMENT PLAN');
  lines.push('----------------------------------------');

  if (suggestedSettlements.length === 0) {
    lines.push('🎉 All settled up! No outstanding payments required.');
  } else {
    suggestedSettlements.forEach((s, idx) => {
      const from = getName(s.from);
      const to = getName(s.to);
      lines.push(`${idx + 1}. ${from} pays ${formatPaiseToRupees(s.amountPaise)} ➔ ${to}`);
    });
  }

  if (recordedSettlements.length > 0) {
    lines.push('');
    lines.push('----------------------------------------');
    lines.push('✅ RECORDED PAYMENTS');
    lines.push('----------------------------------------');
    recordedSettlements.forEach((r, idx) => {
      const from = getName(r.fromFamilyId);
      const to = getName(r.toFamilyId);
      lines.push(
        `${idx + 1}. ${from} paid ${to} — ${formatPaiseToRupees(r.amountPaise)} (${r.paymentMethod.toUpperCase()}) on ${new Date(
          r.settledAt
        ).toLocaleDateString()}`
      );
    });
  }

  if (expList && expList.length > 0) {
    lines.push('');
    lines.push('----------------------------------------');
    lines.push('📝 EXPENSE BREAKDOWN');
    lines.push('----------------------------------------');
    expList.forEach((e, idx) => {
      const payer = getName(e.payerFamilyId);
      lines.push(
        `${idx + 1}. ${e.title}: ${formatPaiseToRupees(e.amountPaise)} (Paid by ${payer})`
      );
    });
  }

  lines.push('');
  lines.push('========================================');
  lines.push('🌿 Generated offline with TripZen');
  lines.push('========================================');

  return lines.join('\n');
}
