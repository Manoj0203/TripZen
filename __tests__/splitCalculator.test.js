import {
  computeFamilyWeight,
  calculateWeightedSplit,
  calculateEqualFamilySplit,
} from '../src/logic/splitCalculator';

describe('Split Calculator Engine', () => {
  // ----- computeFamilyWeight -----

  describe('computeFamilyWeight', () => {
    test('returns 0 for empty or null members', () => {
      expect(computeFamilyWeight([])).toBe(0);
      expect(computeFamilyWeight(null)).toBe(0);
    });

    test('sums weights for 2 adults', () => {
      const members = [{ weight: 100 }, { weight: 100 }];
      expect(computeFamilyWeight(members)).toBe(200);
    });

    test('sums weights for 1 adult + 1 child', () => {
      const members = [{ weight: 100 }, { weight: 50 }];
      expect(computeFamilyWeight(members)).toBe(150);
    });

    test('handles single member', () => {
      expect(computeFamilyWeight([{ weight: 100 }])).toBe(100);
    });
  });

  // ----- calculateWeightedSplit -----

  describe('calculateWeightedSplit', () => {
    test('splits evenly between 2 identical families', () => {
      const result = calculateWeightedSplit(10000, [
        { familyId: 'A', members: [{ memberId: 'm1', weight: 100 }] },
        { familyId: 'B', members: [{ memberId: 'm2', weight: 100 }] },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].sharePaise).toBe(5000);
      expect(result[1].sharePaise).toBe(5000);
      expect(result[0].sharePaise + result[1].sharePaise).toBe(10000);
    });

    test('splits proportionally with adult/child weights', () => {
      // Family A: 2 adults = weight 200
      // Family B: 1 adult + 1 child = weight 150
      // Total weight = 350
      // ₹7000 (700000 paise)
      const result = calculateWeightedSplit(700000, [
        {
          familyId: 'A',
          members: [
            { memberId: 'm1', weight: 100 },
            { memberId: 'm2', weight: 100 },
          ],
        },
        {
          familyId: 'B',
          members: [
            { memberId: 'm3', weight: 100 },
            { memberId: 'm4', weight: 50 },
          ],
        },
      ]);

      expect(result).toHaveLength(2);
      // A: 700000 * 200/350 = 400000
      // B: 700000 * 150/350 = 300000
      expect(result[0].sharePaise).toBe(400000);
      expect(result[1].sharePaise).toBe(300000);
      expect(result[0].weightUsed).toBe(200);
      expect(result[1].weightUsed).toBe(150);
    });

    test('handles odd-paise remainder fairly (₹100 split 3 ways)', () => {
      // 10000 paise / 3 = 3333.33... each
      // Two families get 3333, one gets 3334 (total = 10000)
      const result = calculateWeightedSplit(10000, [
        { familyId: 'A', members: [{ memberId: 'm1', weight: 100 }] },
        { familyId: 'B', members: [{ memberId: 'm2', weight: 100 }] },
        { familyId: 'C', members: [{ memberId: 'm3', weight: 100 }] },
      ]);

      const total = result.reduce((sum, r) => sum + r.sharePaise, 0);
      expect(total).toBe(10000); // total must EXACTLY match

      // Each share should be either 3333 or 3334
      for (const r of result) {
        expect(r.sharePaise).toBeGreaterThanOrEqual(3333);
        expect(r.sharePaise).toBeLessThanOrEqual(3334);
      }
    });

    test('handles 1 paisa split among 3 families', () => {
      const result = calculateWeightedSplit(1, [
        { familyId: 'A', members: [{ memberId: 'm1', weight: 100 }] },
        { familyId: 'B', members: [{ memberId: 'm2', weight: 100 }] },
        { familyId: 'C', members: [{ memberId: 'm3', weight: 100 }] },
      ]);

      const total = result.reduce((sum, r) => sum + r.sharePaise, 0);
      expect(total).toBe(1);
      // Only one family gets the 1 paisa, others get 0
      const nonZero = result.filter(r => r.sharePaise > 0);
      expect(nonZero).toHaveLength(1);
      expect(nonZero[0].sharePaise).toBe(1);
    });

    test('excludes zero-weight families from split', () => {
      const result = calculateWeightedSplit(10000, [
        { familyId: 'A', members: [{ memberId: 'm1', weight: 100 }] },
        { familyId: 'B', members: [] }, // zero weight - excluded
        { familyId: 'C', members: [{ memberId: 'm3', weight: 100 }] },
      ]);

      expect(result).toHaveLength(3);
      expect(result[0].sharePaise).toBe(5000); // A
      expect(result[1].sharePaise).toBe(0);    // B excluded
      expect(result[2].sharePaise).toBe(5000); // C
    });

    test('handles 3 families with mixed adults and children', () => {
      // Sharma: 2 adults + 1 child = 250
      // Verma: 2 adults = 200
      // Patel: 1 adult + 2 children = 200
      // Total weight = 650
      // ₹6,500 (650000 paise)
      const result = calculateWeightedSplit(650000, [
        {
          familyId: 'sharma',
          members: [
            { memberId: 's1', weight: 100 },
            { memberId: 's2', weight: 100 },
            { memberId: 's3', weight: 50 },
          ],
        },
        {
          familyId: 'verma',
          members: [
            { memberId: 'v1', weight: 100 },
            { memberId: 'v2', weight: 100 },
          ],
        },
        {
          familyId: 'patel',
          members: [
            { memberId: 'p1', weight: 100 },
            { memberId: 'p2', weight: 50 },
            { memberId: 'p3', weight: 50 },
          ],
        },
      ]);

      // Sharma: 650000 * 250/650 = 250000
      // Verma:  650000 * 200/650 = 200000
      // Patel:  650000 * 200/650 = 200000
      const total = result.reduce((sum, r) => sum + r.sharePaise, 0);
      expect(total).toBe(650000);
      expect(result.find(r => r.familyId === 'sharma').sharePaise).toBe(250000);
      expect(result.find(r => r.familyId === 'verma').sharePaise).toBe(200000);
      expect(result.find(r => r.familyId === 'patel').sharePaise).toBe(200000);
    });

    test('throws on non-integer amountPaise', () => {
      expect(() =>
        calculateWeightedSplit(100.5, [
          { familyId: 'A', members: [{ memberId: 'm1', weight: 100 }] },
        ])
      ).toThrow('amountPaise must be a positive integer');
    });

    test('throws on zero amountPaise', () => {
      expect(() =>
        calculateWeightedSplit(0, [
          { familyId: 'A', members: [{ memberId: 'm1', weight: 100 }] },
        ])
      ).toThrow('amountPaise must be a positive integer');
    });

    test('throws on empty families', () => {
      expect(() => calculateWeightedSplit(1000, [])).toThrow(
        'At least one family is required'
      );
    });

    test('throws when total weight is zero', () => {
      expect(() =>
        calculateWeightedSplit(1000, [
          { familyId: 'A', members: [] },
        ])
      ).toThrow();
    });
  });

  // ----- calculateEqualFamilySplit -----

  describe('calculateEqualFamilySplit', () => {
    test('splits evenly between 2 families', () => {
      const result = calculateEqualFamilySplit(10000, [
        { familyId: 'A' },
        { familyId: 'B' },
      ]);
      expect(result[0].sharePaise).toBe(5000);
      expect(result[1].sharePaise).toBe(5000);
    });

    test('distributes remainder paise to first families', () => {
      // 10000 / 3 = 3333 remainder 1
      const result = calculateEqualFamilySplit(10000, [
        { familyId: 'A' },
        { familyId: 'B' },
        { familyId: 'C' },
      ]);

      const total = result.reduce((sum, r) => sum + r.sharePaise, 0);
      expect(total).toBe(10000);
      // First family gets the extra paisa
      expect(result[0].sharePaise).toBe(3334);
      expect(result[1].sharePaise).toBe(3333);
      expect(result[2].sharePaise).toBe(3333);
    });

    test('splits 1 paisa among 3 families', () => {
      const result = calculateEqualFamilySplit(1, [
        { familyId: 'A' },
        { familyId: 'B' },
        { familyId: 'C' },
      ]);
      const total = result.reduce((sum, r) => sum + r.sharePaise, 0);
      expect(total).toBe(1);
    });

    test('throws on invalid inputs', () => {
      expect(() => calculateEqualFamilySplit(-100, [{ familyId: 'A' }])).toThrow();
      expect(() => calculateEqualFamilySplit(100, [])).toThrow();
    });
  });
});
