import { generateUUID } from '../src/utils/uuid';

describe('UUID Generator', () => {
  test('generates valid RFC 4122 v4 UUID format', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (let i = 0; i < 20; i++) {
      const id = generateUUID();
      expect(id).toMatch(uuidRegex);
    }
  });

  test('generates unique values', () => {
    const set = new Set();
    for (let i = 0; i < 100; i++) {
      set.add(generateUUID());
    }
    expect(set.size).toBe(100);
  });
});
