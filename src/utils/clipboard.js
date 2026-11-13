let clipboardModule = null;

function getClipboard() {
  if (clipboardModule) return clipboardModule;
  try {
    const mod = require('@react-native-clipboard/clipboard');
    clipboardModule = mod?.default || mod;
    return clipboardModule;
  } catch (e) {
    // try fallback
  }

  try {
    const RN = require('react-native');
    clipboardModule = RN.Clipboard;
    return clipboardModule;
  } catch (e) {
    return null;
  }
}

/**
 * Robust clipboard helper supporting @react-native-clipboard/clipboard
 * with fallback to react-native's built-in Clipboard if needed.
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    const clip = getClipboard();
    if (clip && typeof clip.setString === 'function') {
      clip.setString(text);
      return true;
    }
  } catch (e) {
    console.warn('Failed to copy to clipboard:', e);
  }
  return false;
}

export async function getFromClipboard() {
  try {
    const clip = getClipboard();
    if (clip && typeof clip.getString === 'function') {
      return await clip.getString();
    }
  } catch (e) {
    console.warn('Failed to read from clipboard:', e);
  }
  return '';
}
