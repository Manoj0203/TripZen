import Clipboard from '@react-native-clipboard/clipboard';
import { Clipboard as RNClipboard } from 'react-native';

/**
 * Robust clipboard helper supporting both @react-native-clipboard/clipboard
 * and fallback to react-native's built-in Clipboard.
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (Clipboard && typeof Clipboard.setString === 'function') {
      Clipboard.setString(text);
      return true;
    }
  } catch (e) {
    // try fallback
  }

  try {
    if (RNClipboard && typeof RNClipboard.setString === 'function') {
      RNClipboard.setString(text);
      return true;
    }
  } catch (e) {
    console.warn('Failed to copy to clipboard:', e);
  }
  return false;
}

export async function getFromClipboard() {
  try {
    if (Clipboard && typeof Clipboard.getString === 'function') {
      return await Clipboard.getString();
    }
  } catch (e) {
    // try fallback
  }

  try {
    if (RNClipboard && typeof RNClipboard.getString === 'function') {
      return await RNClipboard.getString();
    }
  } catch (e) {
    console.warn('Failed to read from clipboard:', e);
  }
  return '';
}
