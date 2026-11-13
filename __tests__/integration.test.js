/**
 * Step 5: Comprehensive Verification & Edge-Case Testing
 *
 * Integration tests that run the FULL pipeline:
 *   Split Calculator -> Debt Simplifier -> Currency Formatter
 *
 * These simulate real-world trip scenarios end-to-end.
 */

import {
  calculateWeightedSplit,
  calculateEqualFamilySplit,
} from '../src/logic/splitCalculator';

import {
  computeNetBalances,
  simplifyDebts,
  calculateMinCashFlow,
} from '../src/logic/debtSimplifier';

import {
  formatPaiseToRupees,
  parseRupeesToPaise,
  formatPaiseShort,
} from '../src/logic/currencyFormatter';

// ===================================================================
// HELPERS
// ===================================================================

/** Build a family entry for the split calculator */
function makeFamily(id, adults, children) {
  const members = [];
  for (let i = 0; i < adults; i++) {
    members.push({ memberId: `${id}-adult-${i}`, weight: 100 });
  }
  for (let i = 0; i < children; i++) {
    members.push({ memberId: `${id}-child-${i}`, weight: 50 });
  }
  return { familyId: id, members };
}

/** Assert that split total exactly equals the expense amount */
function assertSplitTotals(splits, expectedTotal) {
  const total = splits.reduce((sum, s) => sum + s.sharePaise, 0);
  expect(total).toBe(expectedTotal);
}

/** Assert settlement conservation: total credits = total debits */
function assertSettlementConservation(settlements, netBalances) {
  // Total owed must equal total paid
  const totalDebt = Object.values(netBalances)
    .filter(v => v < 0)
    .reduce((s, v) => s + Math.abs(v), 0);
  const totalTransferred = settlements.reduce((s, t) => s + t.amountPaise, 0);
  expect(totalTransferred).toBe(totalDebt);
}

// ===================================================================
// TESTS
// ===================================================================

describe('Step 5: Full Integration & Edge-Case Verification', () => {

  // ---------------------------------------------------------------
  // 1. Real-World Full Trip Simulation
  // ---------------------------------------------------------------

  describe('Full Trip Simulation: Ooty Trip (3 families, 5 expenses)', () => {
    // Sharma: 2 adults + 1 child  (weight 250)
    // Verma:  2 adults             (weight 200)
    // Patel:  1 adult + 2 children (weight 200)
    const families = [
      makeFamily('sharma', 2, 1),
      makeFamily('verma', 2, 0),
      makeFamily('patel', 1, 2),
    ];

    const expenses = [];
    const splits = {};

    test('Expense 1: Hotel ₹15,000 paid by Sharma (weighted split)', () => {
      const amount = parseRupeesToPaise('15000');
      expect(amount).toBe(1500000);

      const result = calculateWeightedSplit(amount, families);
      assertSplitTotals(result, amount);

      // Sharma: 1500000 * 250/650 = 576923.07... → 576923 or 576924
      // Verma:  1500000 * 200/650 = 461538.46... → 461538 or 461539
      // Patel:  1500000 * 200/650 = 461538.46... → 461538 or 461539
      expect(result.find(r => r.familyId === 'sharma').sharePaise).toBeGreaterThan(576000);
      expect(result.find(r => r.familyId === 'verma').sharePaise).toBeGreaterThan(461000);

      expenses.push({
        payerFamilyId: 'sharma',
        amountPaise: amount,
        splits: result.map(r => ({ familyId: r.familyId, sharePaise: r.sharePaise })),
      });
      splits['hotel'] = result;
    });

    test('Expense 2: Restaurant ₹3,500.50 paid by Verma (weighted split)', () => {
      const amount = parseRupeesToPaise('3500.50');
      expect(amount).toBe(350050);

      const result = calculateWeightedSplit(amount, families);
      assertSplitTotals(result, amount);

      expenses.push({
        payerFamilyId: 'verma',
        amountPaise: amount,
        splits: result.map(r => ({ familyId: r.familyId, sharePaise: r.sharePaise })),
      });
    });

    test('Expense 3: Taxi ₹2,100 paid by Patel (equal family split)', () => {
      const amount = parseRupeesToPaise('2100');
      expect(amount).toBe(210000);

      const result = calculateEqualFamilySplit(amount, families);
      assertSplitTotals(result, amount);

      expenses.push({
        payerFamilyId: 'patel',
        amountPaise: amount,
        splits: result.map(r => ({ familyId: r.familyId, sharePaise: r.sharePaise })),
      });
    });

    test('Expense 4: Snacks ₹800.75 paid by Sharma (weighted split)', () => {
      const amount = parseRupeesToPaise('800.75');
      expect(amount).toBe(80075);

      const result = calculateWeightedSplit(amount, families);
      assertSplitTotals(result, amount);

      expenses.push({
        payerFamilyId: 'sharma',
        amountPaise: amount,
        splits: result.map(r => ({ familyId: r.familyId, sharePaise: r.sharePaise })),
      });
    });

    test('Expense 5: Entry Tickets ₹450 paid by Verma (equal family split)', () => {
      const amount = parseRupeesToPaise('450');
      expect(amount).toBe(45000);

      const result = calculateEqualFamilySplit(amount, families);
      assertSplitTotals(result, amount);

      expenses.push({
        payerFamilyId: 'verma',
        amountPaise: amount,
        splits: result.map(r => ({ familyId: r.familyId, sharePaise: r.sharePaise })),
      });
    });

    test('Net balances sum to zero', () => {
      const balances = computeNetBalances(expenses);
      const total = Object.values(balances).reduce((s, v) => s + v, 0);
      expect(total).toBe(0);
    });

    test('Settlements resolve all debts with minimum transactions', () => {
      const balances = computeNetBalances(expenses);
      const settlements = simplifyDebts(balances);

      // At most 2 transactions needed for 3 families
      expect(settlements.length).toBeLessThanOrEqual(2);
      assertSettlementConservation(settlements, balances);

      // All amounts must be positive integers
      for (const s of settlements) {
        expect(s.amountPaise).toBeGreaterThan(0);
        expect(Number.isInteger(s.amountPaise)).toBe(true);
      }
    });

    test('Settlement amounts display correctly in Indian format', () => {
      const balances = computeNetBalances(expenses);
      const settlements = simplifyDebts(balances);

      for (const s of settlements) {
        const formatted = formatPaiseToRupees(s.amountPaise);
        expect(formatted).toMatch(/^₹/);
        // Round-trip check
        const parsed = parseRupeesToPaise(formatted);
        expect(parsed).toBe(s.amountPaise);
      }
    });
  });

  // ---------------------------------------------------------------
  // 2. Odd-Paise Remainder Edge Cases
  // ---------------------------------------------------------------

  describe('Odd-Paise Remainder Edge Cases', () => {
    test('₹1 (100 paise) split among 3 equal families', () => {
      const result = calculateWeightedSplit(100, [
        makeFamily('A', 1, 0),
        makeFamily('B', 1, 0),
        makeFamily('C', 1, 0),
      ]);
      assertSplitTotals(result, 100);
      // 100/3 = 33.33... → 34 + 33 + 33 = 100
      const shares = result.map(r => r.sharePaise).sort((a, b) => b - a);
      expect(shares).toEqual([34, 33, 33]);
    });

    test('₹0.01 (1 paisa) split among 7 families', () => {
      const families = [];
      for (let i = 0; i < 7; i++) {
        families.push(makeFamily(`F${i}`, 1, 0));
      }
      const result = calculateWeightedSplit(1, families);
      assertSplitTotals(result, 1);

      // Only 1 family can get the 1 paisa
      const nonZero = result.filter(r => r.sharePaise > 0);
      expect(nonZero).toHaveLength(1);
      expect(nonZero[0].sharePaise).toBe(1);
    });

    test('₹0.07 (7 paise) split among 3 families with unequal weights', () => {
      // A: 2 adults (200), B: 1 adult (100), C: 1 child (50)
      // Total = 350
      const result = calculateWeightedSplit(7, [
        makeFamily('A', 2, 0),
        makeFamily('B', 1, 0),
        makeFamily('C', 0, 1),
      ]);
      assertSplitTotals(result, 7);
      // Exact: A=4.0, B=2.0, C=1.0 → A=4, B=2, C=1
      expect(result.find(r => r.familyId === 'A').sharePaise).toBe(4);
      expect(result.find(r => r.familyId === 'B').sharePaise).toBe(2);
      expect(result.find(r => r.familyId === 'C').sharePaise).toBe(1);
    });

    test('₹0.11 (11 paise) split among 3 equal families', () => {
      const result = calculateWeightedSplit(11, [
        makeFamily('A', 1, 0),
        makeFamily('B', 1, 0),
        makeFamily('C', 1, 0),
      ]);
      assertSplitTotals(result, 11);
      // 11/3 = 3.66... → 4 + 4 + 3 = 11
      const shares = result.map(r => r.sharePaise).sort((a, b) => b - a);
      expect(shares[0] + shares[1] + shares[2]).toBe(11);
    });

    test('₹999.99 (99999 paise) split among 7 families', () => {
      const families = [];
      for (let i = 0; i < 7; i++) {
        families.push(makeFamily(`F${i}`, 1, 0));
      }
      const result = calculateWeightedSplit(99999, families);
      assertSplitTotals(result, 99999);
      // 99999/7 = 14285.57... → mix of 14286 and 14285
      for (const r of result) {
        expect(r.sharePaise).toBeGreaterThanOrEqual(14285);
        expect(r.sharePaise).toBeLessThanOrEqual(14286);
      }
    });

    test('2 paise split among 3 families: only 2 get 1 each', () => {
      const result = calculateWeightedSplit(2, [
        makeFamily('A', 1, 0),
        makeFamily('B', 1, 0),
        makeFamily('C', 1, 0),
      ]);
      assertSplitTotals(result, 2);
      const nonZero = result.filter(r => r.sharePaise > 0);
      expect(nonZero).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------
  // 3. Zero-Weight Exclusion Edge Cases
  // ---------------------------------------------------------------

  describe('Zero-Weight Exclusion Edge Cases', () => {
    test('family with no members is excluded but listed', () => {
      const result = calculateWeightedSplit(10000, [
        makeFamily('A', 1, 0),
        { familyId: 'B', members: [] }, // no members
        makeFamily('C', 1, 0),
      ]);

      expect(result).toHaveLength(3);
      expect(result.find(r => r.familyId === 'B').sharePaise).toBe(0);
      expect(result.find(r => r.familyId === 'B').weightUsed).toBe(0);
      assertSplitTotals(result, 10000);
    });

    test('multiple zero-weight families are all excluded', () => {
      const result = calculateWeightedSplit(50000, [
        makeFamily('A', 2, 0),
        { familyId: 'B', members: [] },
        { familyId: 'C', members: [] },
        makeFamily('D', 1, 1),
      ]);

      expect(result.find(r => r.familyId === 'B').sharePaise).toBe(0);
      expect(result.find(r => r.familyId === 'C').sharePaise).toBe(0);
      assertSplitTotals(result, 50000);
    });

    test('only one non-zero-weight family gets the full amount', () => {
      const result = calculateWeightedSplit(99999, [
        { familyId: 'A', members: [] },
        makeFamily('B', 1, 0),
        { familyId: 'C', members: [] },
      ]);

      expect(result.find(r => r.familyId === 'A').sharePaise).toBe(0);
      expect(result.find(r => r.familyId === 'B').sharePaise).toBe(99999);
      expect(result.find(r => r.familyId === 'C').sharePaise).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // 4. Cycle Debt Scenarios
  // ---------------------------------------------------------------

  describe('Cycle Debt Scenarios', () => {
    test('perfect 3-way cycle cancels out entirely', () => {
      // A→B ₹100, B→C ₹100, C→A ₹100 → net: all zero
      const settlements = simplifyDebts({ A: 0, B: 0, C: 0 });
      expect(settlements).toHaveLength(0);
    });

    test('partial 3-way cycle simplifies correctly', () => {
      // A→B ₹500, B→C ₹300, C→A ₹200
      // Net: A = -500+200 = -300, B = +500-300 = +200, C = +300-200 = +100
      const settlements = simplifyDebts({ A: -300, B: 200, C: 100 });

      const totalTransferred = settlements.reduce((s, t) => s + t.amountPaise, 0);
      expect(totalTransferred).toBe(300);

      // A is the only debtor
      for (const s of settlements) {
        expect(s.from).toBe('A');
      }
    });

    test('4-way cycle: A→B→C→D→A', () => {
      // A→B ₹400, B→C ₹300, C→D ₹200, D→A ₹100
      // Net: A=-300, B=+100, C=+100, D=+100
      const settlements = simplifyDebts({ A: -300, B: 100, C: 100, D: 100 });

      const totalTransferred = settlements.reduce((s, t) => s + t.amountPaise, 0);
      expect(totalTransferred).toBe(300);

      // Should need at most 3 transactions
      expect(settlements.length).toBeLessThanOrEqual(3);
    });

    test('complex cycle with 5 families', () => {
      // Net: F1=+5000, F2=-2000, F3=+1000, F4=-3000, F5=-1000
      const settlements = simplifyDebts({
        F1: 5000, F2: -2000, F3: 1000, F4: -3000, F5: -1000,
      });

      const totalTransferred = settlements.reduce((s, t) => s + t.amountPaise, 0);
      expect(totalTransferred).toBe(6000); // total debt = 2000+3000+1000

      expect(settlements.length).toBeLessThanOrEqual(4);

      // Verify no family appears as both creditor and debtor
      const fromIds = new Set(settlements.map(s => s.from));
      const toIds = new Set(settlements.map(s => s.to));
      for (const id of fromIds) {
        expect(toIds.has(id)).toBe(false);
      }
    });
  });

  // ---------------------------------------------------------------
  // 5. Stress Test: Large Number of Families & Expenses
  // ---------------------------------------------------------------

  describe('Stress Tests', () => {
    test('10 families, 50 expenses', () => {
      const families = [];
      for (let i = 0; i < 10; i++) {
        const adults = 1 + (i % 3); // 1-3 adults
        const children = i % 2;     // 0-1 children
        families.push(makeFamily(`F${i}`, adults, children));
      }

      const expenses = [];
      for (let e = 0; e < 50; e++) {
        const payerIdx = e % 10;
        const amount = 10000 + (e * 137); // varied amounts

        const splits = calculateWeightedSplit(amount, families);
        assertSplitTotals(splits, amount);

        expenses.push({
          payerFamilyId: `F${payerIdx}`,
          amountPaise: amount,
          splits: splits.map(s => ({ familyId: s.familyId, sharePaise: s.sharePaise })),
        });
      }

      // Compute and verify balances
      const balances = computeNetBalances(expenses);
      const totalNet = Object.values(balances).reduce((s, v) => s + v, 0);
      expect(totalNet).toBe(0);

      // Simplify debts
      const settlements = simplifyDebts(balances);

      // At most n-1 = 9 transactions
      expect(settlements.length).toBeLessThanOrEqual(9);

      // All amounts positive integers
      for (const s of settlements) {
        expect(s.amountPaise).toBeGreaterThan(0);
        expect(Number.isInteger(s.amountPaise)).toBe(true);
      }
    });

    test('single family pays everything: no settlements needed', () => {
      const families = [
        makeFamily('rich', 3, 2),
        makeFamily('poor1', 1, 0),
        makeFamily('poor2', 1, 1),
      ];

      // Rich family pays, and the split includes only rich family
      const expenses = [{
        payerFamilyId: 'rich',
        amountPaise: 500000,
        splits: [{ familyId: 'rich', sharePaise: 500000 }],
      }];

      const settlements = calculateMinCashFlow(expenses);
      expect(settlements).toHaveLength(0);
    });

    test('two families alternating payments balance out', () => {
      const families = [makeFamily('A', 2, 0), makeFamily('B', 2, 0)];

      const expenses = [
        {
          payerFamilyId: 'A',
          amountPaise: 10000,
          splits: [
            { familyId: 'A', sharePaise: 5000 },
            { familyId: 'B', sharePaise: 5000 },
          ],
        },
        {
          payerFamilyId: 'B',
          amountPaise: 10000,
          splits: [
            { familyId: 'A', sharePaise: 5000 },
            { familyId: 'B', sharePaise: 5000 },
          ],
        },
      ];

      const settlements = calculateMinCashFlow(expenses);
      // They spent equally and paid equally → no settlement needed
      expect(settlements).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------
  // 6. Currency Formatter Edge Cases
  // ---------------------------------------------------------------

  describe('Currency Formatter Edge Cases', () => {
    test('zero paise formats correctly', () => {
      expect(formatPaiseToRupees(0)).toBe('₹0.00');
      expect(formatPaiseShort(0)).toBe('₹0');
    });

    test('very large amounts (crores) format with Indian grouping', () => {
      // ₹1,23,45,678.90
      expect(formatPaiseToRupees(1234567890)).toBe('₹1,23,45,678.90');
    });

    test('negative debts format correctly', () => {
      expect(formatPaiseToRupees(-123456)).toBe('-₹1,234.56');
      expect(formatPaiseShort(-100)).toBe('-₹1');
    });

    test('round-trip integrity for various amounts', () => {
      const testCases = [
        0, 1, 50, 99, 100, 101, 999, 1000,
        12345, 99999, 100000, 123456, 1000000,
        10000000, 99999999, 123456789,
      ];
      for (const paise of testCases) {
        const formatted = formatPaiseToRupees(paise);
        const parsed = parseRupeesToPaise(formatted);
        expect(parsed).toBe(paise);
      }
    });

    test('parse handles unusual but valid inputs', () => {
      expect(parseRupeesToPaise('₹0')).toBe(0);
      expect(parseRupeesToPaise('₹0.00')).toBe(0);
      expect(parseRupeesToPaise('  ₹  1,000  ')).toBe(100000);
    });
  });

  // ---------------------------------------------------------------
  // 7. Split + Settle Integration with Formatted Output
  // ---------------------------------------------------------------

  describe('End-to-End: Split → Settle → Display', () => {
    test('3 families, 3 expenses → formatted settlement report', () => {
      const families = [
        makeFamily('sharma', 2, 1), // weight 250
        makeFamily('verma', 2, 0),  // weight 200
        makeFamily('patel', 1, 2),  // weight 200
      ];

      const expenseData = [
        { title: 'Hotel', amount: '10000', payer: 'sharma', type: 'weighted' },
        { title: 'Taxi', amount: '3000', payer: 'verma', type: 'equal' },
        { title: 'Food', amount: '5000', payer: 'patel', type: 'weighted' },
      ];

      const processedExpenses = [];

      for (const exp of expenseData) {
        const amountPaise = parseRupeesToPaise(exp.amount);
        let splits;
        if (exp.type === 'weighted') {
          splits = calculateWeightedSplit(amountPaise, families);
        } else {
          splits = calculateEqualFamilySplit(amountPaise, families);
        }
        assertSplitTotals(splits, amountPaise);

        processedExpenses.push({
          payerFamilyId: exp.payer,
          amountPaise,
          splits: splits.map(s => ({ familyId: s.familyId, sharePaise: s.sharePaise })),
        });
      }

      // Compute net balances
      const balances = computeNetBalances(processedExpenses);
      const totalNet = Object.values(balances).reduce((s, v) => s + v, 0);
      expect(totalNet).toBe(0);

      // Simplify
      const settlements = simplifyDebts(balances);
      expect(settlements.length).toBeLessThanOrEqual(2);

      // Generate display report
      const report = settlements.map(s => ({
        description: `${s.from} pays ${s.to}`,
        amount: formatPaiseToRupees(s.amountPaise),
        amountShort: formatPaiseShort(s.amountPaise),
      }));

      // Verify report format
      for (const line of report) {
        expect(line.amount).toMatch(/^₹/);
        expect(line.amountShort).toMatch(/^₹/);
        expect(line.description).toMatch(/ pays /);
      }
    });
  });
});
