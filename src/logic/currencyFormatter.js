/**
 * Currency Formatter
 *
 * Converts paise integers to formatted Indian Rupee strings and back.
 * Uses the Indian numbering system (thousands, lakhs, crores):
 *   1,00,000 = 1 lakh
 *   1,00,00,000 = 1 crore
 *
 * Example: 2500050 paise -> "₹25,000.50"
 */

/**
 * Format an integer paise value into a human-readable Indian Rupee string.
 *
 * @param {number} paise - Amount in paise (integer). Can be negative for debts.
 * @returns {string} Formatted string like "₹1,23,456.78" or "-₹500.00"
 */
export function formatPaiseToRupees(paise) {
  if (!Number.isInteger(paise)) {
    throw new Error('Paise must be an integer');
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);

  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  // Format the paise part (always 2 digits)
  const paiseStr = remainderPaise.toString().padStart(2, '0');

  // Format rupees with Indian numbering system
  const rupeesStr = formatIndianNumber(rupees);

  const sign = isNegative ? '-' : '';
  return `${sign}₹${rupeesStr}.${paiseStr}`;
}

/**
 * Format a number using the Indian numbering system (commas).
 * e.g. 1234567 -> "12,34,567"
 *
 * @param {number} num - Non-negative integer
 * @returns {string} Formatted number string
 */
export function formatIndianNumber(num) {
  const str = num.toString();

  if (str.length <= 3) {
    return str;
  }

  // Last 3 digits form the thousands group
  const lastThree = str.substring(str.length - 3);
  const remaining = str.substring(0, str.length - 3);

  // Remaining digits are grouped in pairs (lakhs, crores, etc.)
  let formatted = '';
  for (let i = remaining.length; i > 0; i -= 2) {
    const start = Math.max(0, i - 2);
    const chunk = remaining.substring(start, i);
    if (formatted.length > 0) {
      formatted = chunk + ',' + formatted;
    } else {
      formatted = chunk;
    }
  }

  return formatted + ',' + lastThree;
}

/**
 * Parse a rupee amount string (e.g. "2500.50" or "₹2,500.50") into integer paise.
 *
 * @param {string} rupeeString - Amount in rupees as a string
 * @returns {number} Amount in paise as an integer
 * @throws {Error} If the string cannot be parsed
 */
export function parseRupeesToPaise(rupeeString) {
  if (!rupeeString || rupeeString.length === 0) {
    throw new Error('Rupee string is required');
  }

  // Remove currency symbol, commas, and whitespace
  const cleaned = rupeeString
    .replace(/₹/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();

  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    throw new Error(`Cannot parse "${rupeeString}" as a rupee amount`);
  }

  // Convert to paise (multiply by 100 and round to avoid floating point issues)
  return Math.round(num * 100);
}

/**
 * Format paise as a short display string (no decimal if even rupees).
 *
 * @param {number} paise - Amount in paise
 * @returns {string} e.g. "₹500" or "₹500.50"
 */
export function formatPaiseShort(paise) {
  if (!Number.isInteger(paise)) {
    throw new Error('Paise must be an integer');
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  const rupeesStr = formatIndianNumber(rupees);
  const sign = isNegative ? '-' : '';

  if (remainderPaise === 0) {
    return `${sign}₹${rupeesStr}`;
  }

  const paiseStr = remainderPaise.toString().padStart(2, '0');
  return `${sign}₹${rupeesStr}.${paiseStr}`;
}
