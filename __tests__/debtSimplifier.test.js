import {
  computeNetBalances,
  simplifyDebts,
  calculateMinCashFlow,
} from '../src/logic/debtSimplifier';

describe('Debt Simplification Engine (Min-Cash-Flow)', () => {
  // ----- computeNetBalances -----

  describe('computeNetBalances', () => {
    test('single expense: payer credited, others debited', () => {
      const balances = computeNetBalances([
        {
          payerFamilyId: 'sharma',
          amountPaise: 30000, // ₹300
          splits: [
            { familyId: 'sharma', sharePaise: 10000 },
            { familyId: 'verma', sharePaise: 10000 },
            { familyId: 'patel', sharePaise: 10000 },
          ],
        },
      ]);

      // Sharma paid 30000, owes 10000 => net = +20000
      expect(balances['sharma']).toBe(20000);
      // Verma paid nothing, owes 10000 => net = -10000
      expect(balances['verma']).toBe(-10000);
      // Patel paid nothing, owes 10000 => net = -10000
      expect(balances['patel']).toBe(-10000);
    });

    test('multiple expenses balance out correctly', () => {
      const balances = computeNetBalances([
        {
          payerFamilyId: 'A',
          amountPaise: 6000,
          splits: [
            { familyId: 'A', sharePaise: 2000 },
            { familyId: 'B', sharePaise: 2000 },
            { familyId: 'C', sharePaise: 2000 },
          ],
        },
        {
          payerFamilyId: 'B',
          amountPaise: 3000,
          splits: [
            { familyId: 'A', sharePaise: 1000 },
            { familyId: 'B', sharePaise: 1000 },
            { familyId: 'C', sharePaise: 1000 },
          ],
        },
      ]);

      // A: paid 6000, owes 2000+1000 = 3000, net = +3000
      expect(balances['A']).toBe(3000);
      // B: paid 3000, owes 2000+1000 = 3000, net = 0
      expect(balances['B']).toBe(0);
      // C: paid 0, owes 2000+1000 = 3000, net = -3000
      expect(balances['C']).toBe(-3000);
    });

    test('total net balances always sum to zero', () => {
      const balances = computeNetBalances([
        {
          payerFamilyId: 'A',
          amountPaise: 15000,
          splits: [
            { familyId: 'A', sharePaise: 5000 },
            { familyId: 'B', sharePaise: 5000 },
            { familyId: 'C', sharePaise: 5000 },
          ],
        },
        {
          payerFamilyId: 'B',
          amountPaise: 9000,
          splits: [
            { familyId: 'A', sharePaise: 3000 },
            { familyId: 'B', sharePaise: 3000 },
            { familyId: 'C', sharePaise: 3000 },
          ],
        },
        {
          payerFamilyId: 'C',
          amountPaise: 6000,
          splits: [
            { familyId: 'A', sharePaise: 2000 },
            { familyId: 'B', sharePaise: 2000 },
            { familyId: 'C', sharePaise: 2000 },
          ],
        },
      ]);

      const totalNet = Object.values(balances).reduce((s, v) => s + v, 0);
      expect(totalNet).toBe(0);
    });
  });

  // ----- simplifyDebts -----

  describe('simplifyDebts', () => {
    test('two families: single transaction', () => {
      const settlements = simplifyDebts({
        A: 5000,  // owed ₹50
        B: -5000, // owes ₹50
      });

      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        from: 'B',
        to: 'A',
        amountPaise: 5000,
      });
    });

    test('three families: reduces cycle debts', () => {
      // A is owed 2000, B is owed 1000, C owes 3000
      const settlements = simplifyDebts({
        A: 2000,
        B: 1000,
        C: -3000,
      });

      // Should be exactly 2 transactions (C pays A 2000 and C pays B 1000)
      expect(settlements).toHaveLength(2);

      const totalPaid = settlements.reduce((s, t) => s + t.amountPaise, 0);
      expect(totalPaid).toBe(3000);

      // All payments come FROM C
      for (const s of settlements) {
        expect(s.from).toBe('C');
      }
    });

    test('handles circular debts efficiently', () => {
      // A owes B ₹500, B owes C ₹500, C owes A ₹200
      // Net: A = -300, B = 0, C = +300
      const settlements = simplifyDebts({
        A: -300,
        B: 0,
        C: 300,
      });

      // Should simplify to just 1 transaction: A pays C 300
      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        from: 'A',
        to: 'C',
        amountPaise: 300,
      });
    });

    test('returns empty for all-zero balances', () => {
      const settlements = simplifyDebts({
        A: 0,
        B: 0,
        C: 0,
      });
      expect(settlements).toHaveLength(0);
    });

    test('handles large multi-family scenario', () => {
      // 5 families with varied balances
      const settlements = simplifyDebts({
        F1: 10000,   // owed ₹100
        F2: -5000,   // owes ₹50
        F3: -3000,   // owes ₹30
        F4: 2000,    // owed ₹20
        F5: -4000,   // owes ₹40
      });

      // Verify conservation: total paid equals total received
      let totalFrom = 0;
      let totalTo = 0;
      for (const s of settlements) {
        totalFrom += s.amountPaise;
        totalTo += s.amountPaise;
      }
      expect(totalFrom).toBe(totalTo);

      // Total amount transferred should equal total debt = 12000
      expect(totalFrom).toBe(12000);

      // Number of transactions should be <= n-1 (at most 4)
      expect(settlements.length).toBeLessThanOrEqual(4);
    });
  });

  // ----- calculateMinCashFlow (full pipeline) -----

  describe('calculateMinCashFlow', () => {
    test('returns empty for no expenses', () => {
      expect(calculateMinCashFlow([])).toEqual([]);
      expect(calculateMinCashFlow(null)).toEqual([]);
    });

    test('full scenario: 3 families, 2 expenses', () => {
      const settlements = calculateMinCashFlow([
        {
          payerFamilyId: 'sharma',
          amountPaise: 90000, // Sharma paid ₹900 for hotel
          splits: [
            { familyId: 'sharma', sharePaise: 30000 },
            { familyId: 'verma', sharePaise: 30000 },
            { familyId: 'patel', sharePaise: 30000 },
          ],
        },
        {
          payerFamilyId: 'verma',
          amountPaise: 30000, // Verma paid ₹300 for taxi
          splits: [
            { familyId: 'sharma', sharePaise: 10000 },
            { familyId: 'verma', sharePaise: 10000 },
            { familyId: 'patel', sharePaise: 10000 },
          ],
        },
      ]);

      // Net balances:
      // Sharma: paid 90000, owes 30000+10000=40000 => net = +50000
      // Verma:  paid 30000, owes 30000+10000=40000 => net = -10000
      // Patel:  paid 0,     owes 30000+10000=40000 => net = -40000

      // Settlements should total 50000 paise (₹500)
      const totalTransferred = settlements.reduce((s, t) => s + t.amountPaise, 0);
      expect(totalTransferred).toBe(50000);

      // Maximum 2 transactions needed
      expect(settlements.length).toBeLessThanOrEqual(2);
    });

    test('everyone pays their own share: no settlements needed', () => {
      const settlements = calculateMinCashFlow([
        {
          payerFamilyId: 'A',
          amountPaise: 5000,
          splits: [
            { familyId: 'A', sharePaise: 5000 },
          ],
        },
        {
          payerFamilyId: 'B',
          amountPaise: 3000,
          splits: [
            { familyId: 'B', sharePaise: 3000 },
          ],
        },
      ]);

      expect(settlements).toHaveLength(0);
    });
  });
});
