import {
  formatPaiseToRupees,
  formatIndianNumber,
  parseRupeesToPaise,
  formatPaiseShort,
} from '../src/logic/currencyFormatter';

describe('Currency Formatter Engine', () => {
  // ----- formatIndianNumber -----

  describe('formatIndianNumber', () => {
    test('numbers under 1000 have no commas', () => {
      expect(formatIndianNumber(0)).toBe('0');
      expect(formatIndianNumber(5)).toBe('5');
      expect(formatIndianNumber(99)).toBe('99');
      expect(formatIndianNumber(999)).toBe('999');
    });

    test('thousands get first comma', () => {
      expect(formatIndianNumber(1000)).toBe('1,000');
      expect(formatIndianNumber(9999)).toBe('9,999');
      expect(formatIndianNumber(12345)).toBe('12,345');
    });

    test('lakhs use Indian grouping', () => {
      expect(formatIndianNumber(100000)).toBe('1,00,000');
      expect(formatIndianNumber(123456)).toBe('1,23,456');
      expect(formatIndianNumber(999999)).toBe('9,99,999');
    });

    test('crores use Indian grouping', () => {
      expect(formatIndianNumber(10000000)).toBe('1,00,00,000');
      expect(formatIndianNumber(12345678)).toBe('1,23,45,678');
    });

    test('large numbers above crores', () => {
      expect(formatIndianNumber(1000000000)).toBe('1,00,00,00,000');
    });
  });

  // ----- formatPaiseToRupees -----

  describe('formatPaiseToRupees', () => {
    test('basic conversions', () => {
      expect(formatPaiseToRupees(0)).toBe('₹0.00');
      expect(formatPaiseToRupees(100)).toBe('₹1.00');
      expect(formatPaiseToRupees(50)).toBe('₹0.50');
      expect(formatPaiseToRupees(1)).toBe('₹0.01');
      expect(formatPaiseToRupees(99)).toBe('₹0.99');
    });

    test('typical expense amounts', () => {
      expect(formatPaiseToRupees(50025)).toBe('₹500.25');
      expect(formatPaiseToRupees(250000)).toBe('₹2,500.00');
      expect(formatPaiseToRupees(1500075)).toBe('₹15,000.75');
    });

    test('large amounts with Indian numbering', () => {
      expect(formatPaiseToRupees(10000000)).toBe('₹1,00,000.00'); // 1 lakh
      expect(formatPaiseToRupees(100000000)).toBe('₹10,00,000.00'); // 10 lakhs
      expect(formatPaiseToRupees(1000000000)).toBe('₹1,00,00,000.00'); // 1 crore
    });

    test('negative amounts (debts)', () => {
      expect(formatPaiseToRupees(-50000)).toBe('-₹500.00');
      expect(formatPaiseToRupees(-1)).toBe('-₹0.01');
    });

    test('throws on non-integer', () => {
      expect(() => formatPaiseToRupees(100.5)).toThrow('Paise must be an integer');
    });
  });

  // ----- parseRupeesToPaise -----

  describe('parseRupeesToPaise', () => {
    test('plain numbers', () => {
      expect(parseRupeesToPaise('500')).toBe(50000);
      expect(parseRupeesToPaise('500.50')).toBe(50050);
      expect(parseRupeesToPaise('0.01')).toBe(1);
      expect(parseRupeesToPaise('0')).toBe(0);
    });

    test('with rupee symbol', () => {
      expect(parseRupeesToPaise('₹500')).toBe(50000);
      expect(parseRupeesToPaise('₹2,500.50')).toBe(250050);
    });

    test('with Indian comma formatting', () => {
      expect(parseRupeesToPaise('1,00,000')).toBe(10000000);
      expect(parseRupeesToPaise('₹1,23,456.78')).toBe(12345678);
    });

    test('with whitespace', () => {
      expect(parseRupeesToPaise('  ₹ 500  ')).toBe(50000);
    });

    test('throws on empty string', () => {
      expect(() => parseRupeesToPaise('')).toThrow();
    });

    test('throws on garbage input', () => {
      expect(() => parseRupeesToPaise('abc')).toThrow();
    });
  });

  // ----- formatPaiseShort -----

  describe('formatPaiseShort', () => {
    test('even rupee amounts omit decimals', () => {
      expect(formatPaiseShort(50000)).toBe('₹500');
      expect(formatPaiseShort(100)).toBe('₹1');
      expect(formatPaiseShort(0)).toBe('₹0');
    });

    test('amounts with paise show decimals', () => {
      expect(formatPaiseShort(50050)).toBe('₹500.50');
      expect(formatPaiseShort(1)).toBe('₹0.01');
      expect(formatPaiseShort(99)).toBe('₹0.99');
    });

    test('negative amounts', () => {
      expect(formatPaiseShort(-50000)).toBe('-₹500');
      expect(formatPaiseShort(-50050)).toBe('-₹500.50');
    });

    test('large amounts use Indian grouping', () => {
      expect(formatPaiseShort(10000000)).toBe('₹1,00,000');
    });
  });

  // ----- Round-trip tests -----

  describe('round-trip: format -> parse', () => {
    test('formatPaiseToRupees output can be parsed back', () => {
      const testValues = [0, 1, 50, 100, 50025, 250000, 1500075, 10000000];
      for (const paise of testValues) {
        const formatted = formatPaiseToRupees(paise);
        const parsed = parseRupeesToPaise(formatted);
        expect(parsed).toBe(paise);
      }
    });
  });
});
