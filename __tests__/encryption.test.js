import { encryptData, decryptData } from '../src/logic/encryption';

describe('Encryption Engine (AES-256 + PBKDF2)', () => {
  const sampleTripData = {
    tripId: 'trip-001',
    name: 'Ooty Trip 2026',
    families: [
      {
        familyId: 'sharma',
        name: 'Sharma Family',
        members: [
          { memberId: 's1', name: 'Rahul', memberType: 'adult', weight: 100 },
          { memberId: 's2', name: 'Priya', memberType: 'adult', weight: 100 },
          { memberId: 's3', name: 'Aryan', memberType: 'child', weight: 50 },
        ],
      },
    ],
    expenses: [
      { expenseId: 'e1', title: 'Hotel', amountPaise: 1500000 },
    ],
  };

  test('encrypt and decrypt returns original data', () => {
    const password = 'MySecurePassword123!';
    const encrypted = encryptData(sampleTripData, password);

    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);
    // Encrypted string should NOT contain the original text
    expect(encrypted).not.toContain('Ooty Trip');

    const decrypted = decryptData(encrypted, password);
    expect(decrypted).toEqual(sampleTripData);
  });

  test('different passwords produce different encrypted outputs', () => {
    const enc1 = encryptData(sampleTripData, 'password1');
    const enc2 = encryptData(sampleTripData, 'password2');
    expect(enc1).not.toBe(enc2);
  });

  test('same password produces different outputs (random salt/IV)', () => {
    const enc1 = encryptData(sampleTripData, 'samePassword');
    const enc2 = encryptData(sampleTripData, 'samePassword');
    expect(enc1).not.toBe(enc2);

    // But both decrypt to the same data
    expect(decryptData(enc1, 'samePassword')).toEqual(sampleTripData);
    expect(decryptData(enc2, 'samePassword')).toEqual(sampleTripData);
  });

  test('wrong password fails decryption', () => {
    const encrypted = encryptData(sampleTripData, 'correctPassword');
    expect(() => decryptData(encrypted, 'wrongPassword')).toThrow();
  });

  test('handles empty object', () => {
    const encrypted = encryptData({}, 'password');
    const decrypted = decryptData(encrypted, 'password');
    expect(decrypted).toEqual({});
  });

  test('handles large data (many expenses)', () => {
    const largeData = {
      expenses: Array.from({ length: 500 }, (_, i) => ({
        id: `expense-${i}`,
        title: `Expense #${i}`,
        amountPaise: Math.floor(Math.random() * 10000000),
      })),
    };

    const encrypted = encryptData(largeData, 'password');
    const decrypted = decryptData(encrypted, 'password');
    expect(decrypted.expenses).toHaveLength(500);
    expect(decrypted).toEqual(largeData);
  });

  test('handles unicode characters in data', () => {
    const unicodeData = {
      name: 'गोवा ट्रिप 2026',
      notes: '🏖️ बीच पार्टी! 🎉',
    };

    const encrypted = encryptData(unicodeData, 'password');
    const decrypted = decryptData(encrypted, 'password');
    expect(decrypted).toEqual(unicodeData);
  });

  test('throws on null data', () => {
    expect(() => encryptData(null, 'password')).toThrow('Data is required');
  });

  test('throws on empty password', () => {
    expect(() => encryptData({ a: 1 }, '')).toThrow('Password is required');
  });

  test('throws on null encrypted input', () => {
    expect(() => decryptData(null, 'password')).toThrow('Encrypted data is required');
  });

  test('throws on corrupted encrypted data', () => {
    expect(() => decryptData('not-valid-base64-!!', 'password')).toThrow();
  });
});
