/**
 * Encrypt / Decrypt Serializer
 *
 * Uses crypto-js for AES-256 encryption with PBKDF2 key derivation.
 * Designed for offline backup: the user sets a password, the trip data
 * is encrypted into a portable string that can be shared via QR code or file.
 */

import CryptoJS from 'crypto-js';

// PBKDF2 configuration
const PBKDF2_ITERATIONS = 10000;
const PBKDF2_KEY_SIZE = 256 / 32; // 256 bits = 8 words of 32 bits
const SALT_SIZE = 128 / 8;        // 128-bit salt = 16 bytes
const IV_SIZE = 128 / 8;          // 128-bit IV = 16 bytes (AES block size)

/**
 * Encrypt a JavaScript object (trip data) with a user-supplied password.
 *
 * Process:
 *   1. Generate a random salt and IV.
 *   2. Derive a 256-bit key from the password using PBKDF2.
 *   3. Encrypt the JSON-serialized data with AES-256-CBC.
 *   4. Return a single Base64 string containing salt + IV + ciphertext.
 *
 * @param {object} data - The trip data object to encrypt (will be JSON.stringify'd)
 * @param {string} password - User-supplied password
 * @returns {string} Encrypted payload as a Base64 string
 * @throws {Error} If data or password is missing
 */
export function encryptData(data, password) {
  if (!data) {
    throw new Error('Data is required for encryption');
  }
  if (!password || password.length === 0) {
    throw new Error('Password is required for encryption');
  }

  const jsonString = JSON.stringify(data);

  // 1. Generate random salt and IV
  const salt = CryptoJS.lib.WordArray.random(SALT_SIZE);
  const iv = CryptoJS.lib.WordArray.random(IV_SIZE);

  // 2. Derive key using PBKDF2
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: PBKDF2_KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
  });

  // 3. Encrypt with AES-256-CBC
  const encrypted = CryptoJS.AES.encrypt(jsonString, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // 4. Combine salt + iv + ciphertext into a single string
  const combined = salt
    .concat(iv)
    .concat(encrypted.ciphertext);

  return CryptoJS.enc.Base64.stringify(combined);
}

/**
 * Decrypt a previously encrypted payload back to a JavaScript object.
 *
 * @param {string} encryptedBase64 - The Base64 encrypted payload from encryptData
 * @param {string} password - The same password used for encryption
 * @returns {object} The decrypted trip data object
 * @throws {Error} If decryption fails (wrong password or corrupted data)
 */
export function decryptData(encryptedBase64, password) {
  if (!encryptedBase64 || encryptedBase64.length === 0) {
    throw new Error('Encrypted data is required for decryption');
  }
  if (!password || password.length === 0) {
    throw new Error('Password is required for decryption');
  }

  try {
    // 1. Decode the combined Base64 string
    const combined = CryptoJS.enc.Base64.parse(encryptedBase64);
    const combinedBytes = combined.toString(CryptoJS.enc.Hex);

    // 2. Extract salt (first 16 bytes = 32 hex chars)
    const saltHex = combinedBytes.substring(0, SALT_SIZE * 2);
    const salt = CryptoJS.enc.Hex.parse(saltHex);

    // 3. Extract IV (next 16 bytes = 32 hex chars)
    const ivHex = combinedBytes.substring(SALT_SIZE * 2, (SALT_SIZE + IV_SIZE) * 2);
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    // 4. Extract ciphertext (remaining bytes)
    const ciphertextHex = combinedBytes.substring((SALT_SIZE + IV_SIZE) * 2);
    const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);

    // 5. Derive same key using PBKDF2
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: PBKDF2_KEY_SIZE,
      iterations: PBKDF2_ITERATIONS,
    });

    // 6. Decrypt
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!jsonString) {
      throw new Error('Decryption produced empty result - wrong password or corrupted data');
    }

    return JSON.parse(jsonString);
  } catch (error) {
    if (error.message.includes('Decryption produced empty result')) {
      throw error;
    }
    throw new Error('Decryption failed - wrong password or corrupted data');
  }
}
