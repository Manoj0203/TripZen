/**
 * Min-Cash-Flow Debt Simplification Engine
 *
 * Given a list of net balances per family (positive = creditor, negative = debtor),
 * computes the minimum number of transactions needed to settle all debts.
 *
 * Algorithm:
 *   1. Compute net balance for each family from expense splits and payments.
 *   2. Separate families into creditors (owed money) and debtors (owe money).
 *   3. Greedily match the largest debtor with the largest creditor,
 *      transferring the smaller of the two amounts, until all balances are zero.
 *
 * All amounts are in integer paise.
 */

/**
 * Compute net balances per family from a list of expenses and their splits.
 *
 * For each expense:
 *   - The payer family's balance goes UP by amountPaise (they are owed money).
 *   - Each split family's balance goes DOWN by sharePaise (they owe money).
 *
 * @param {Array<{payerFamilyId: string, amountPaise: number, splits: Array<{familyId: string, sharePaise: number}>}>} expenses
 * @returns {Object<string, number>} Map of familyId -> net balance in paise
 *   Positive = family is owed money (creditor), Negative = family owes money (debtor)
 */
export function computeNetBalances(expenses) {
  const balances = {};

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    const payerId = expense.payerFamilyId;

    // Payer paid for everyone, so they are credited the full amount
    if (!balances[payerId]) {
      balances[payerId] = 0;
    }
    balances[payerId] += expense.amountPaise;

    // Each family owes their share
    for (let j = 0; j < expense.splits.length; j++) {
      const split = expense.splits[j];
      if (!balances[split.familyId]) {
        balances[split.familyId] = 0;
      }
      balances[split.familyId] -= split.sharePaise;
    }
  }

  return balances;
}

/**
 * Simplify debts to minimum transactions using a greedy approach.
 *
 * @param {Object<string, number>} netBalances - Map of familyId -> net balance in paise
 * @returns {Array<{from: string, to: string, amountPaise: number}>}
 *   Minimum list of settlements. "from" owes "to" the given amountPaise.
 */
export function simplifyDebts(netBalances) {
  // Separate into creditors (positive balance) and debtors (negative balance)
  const creditors = []; // families who are owed money
  const debtors = [];   // families who owe money

  const familyIds = Object.keys(netBalances);
  for (let i = 0; i < familyIds.length; i++) {
    const id = familyIds[i];
    const balance = netBalances[id];
    if (balance > 0) {
      creditors.push({ familyId: id, amount: balance });
    } else if (balance < 0) {
      debtors.push({ familyId: id, amount: -balance }); // store as positive
    }
    // balance === 0 means fully settled, skip
  }

  // Sort both descending by amount (greedily match largest first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let ci = 0; // creditor index
  let di = 0; // debtor index

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    // Transfer the smaller of the two amounts
    const transferAmount = Math.min(creditor.amount, debtor.amount);

    if (transferAmount > 0) {
      settlements.push({
        from: debtor.familyId,
        to: creditor.familyId,
        amountPaise: transferAmount,
      });
    }

    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;

    // Move past fully settled parties
    if (creditor.amount === 0) {
      ci++;
    }
    if (debtor.amount === 0) {
      di++;
    }
  }

  return settlements;
}

/**
 * Full pipeline: given raw expenses, compute net balances and simplify to
 * minimum transactions.
 *
 * @param {Array<{payerFamilyId: string, amountPaise: number, splits: Array<{familyId: string, sharePaise: number}>}>} expenses
 * @returns {Array<{from: string, to: string, amountPaise: number}>}
 */
export function calculateMinCashFlow(expenses) {
  if (!expenses || expenses.length === 0) {
    return [];
  }
  const balances = computeNetBalances(expenses);
  return simplifyDebts(balances);
}
