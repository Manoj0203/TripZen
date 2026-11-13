/**
 * Crypto polyfill for React Native environments (Hermes/JSC).
 * Polyfills globalThis.crypto.getRandomValues so uuid and crypto-js work seamlessly.
 */
if (typeof globalThis.crypto !== 'object') {
  globalThis.crypto = {};
}

if (typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto.getRandomValues = function getRandomValues(array) {
    if (!array || !array.length) return array;
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}
