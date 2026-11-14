import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { exportTripEncrypted, importTripEncrypted } from '../services/tripService';
import { CopyIcon, CheckIcon, ShareIcon, QrCodeIcon } from '../components/Icons';
import { copyToClipboard, getFromClipboard } from '../utils/clipboard';

export function SyncBackupModal({ route, navigation }) {
  const { tripId, tripName } = route.params || {};
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'

  // Export state
  const [password, setPassword] = useState('');
  const [encryptedPayload, setEncryptedPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Import state
  const [importPassword, setImportPassword] = useState('');
  const [importPayload, setImportPayload] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const handleGenerateBackup = async () => {
    if (!password.trim()) {
      showAlert({
        title: 'Password Required',
        message: 'Please enter a password to protect this backup.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    setCopied(false);
    try {
      const payload = await exportTripEncrypted(tripId, password.trim());
      setEncryptedPayload(payload);
    } catch (e) {
      console.error(e);
      showAlert({
        title: 'Error',
        message: 'Failed to generate backup.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!encryptedPayload) return;
    try {
      await copyToClipboard(encryptedPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      showAlert({
        title: 'Copied!',
        message: 'Encrypted backup string copied to your clipboard.',
        type: 'success',
      });
    } catch (e) {
      console.error(e);
      showAlert({
        title: 'Notice',
        message: 'Please long-press the string below to copy manually.',
        type: 'info',
      });
    }
  };

  const handleShare = async () => {
    if (!encryptedPayload) return;
    try {
      await Share.share({
        title: `TripZen Backup - ${tripName}`,
        message: encryptedPayload,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const content = await getFromClipboard();
      if (content) {
        setImportPayload(content);
      } else {
        showAlert({
          title: 'Clipboard Empty',
          message: 'No text found in clipboard.',
          type: 'info',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportBackup = async () => {
    if (!importPayload.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please paste the encrypted backup string.',
        type: 'warning',
      });
      return;
    }
    if (!importPassword.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter the decryption password for this backup.',
        type: 'warning',
      });
      return;
    }

    setImportLoading(true);
    try {
      const imported = await importTripEncrypted(importPayload.trim(), importPassword.trim());
      showAlert({
        title: 'Import Successful',
        message: `Trip "${imported?.name || 'Imported Trip'}" restored successfully!`,
        type: 'success',
        confirmText: 'OK',
        cancelText: null,
        showCancel: false,
        onConfirm: () => {
          navigation.navigate('Home');
        },
      });
    } catch (e) {
      console.error(e);
      showAlert({
        title: 'Import Failed',
        message: 'Could not decrypt backup. Please check your password and verify the backup string.',
        type: 'danger',
      });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>Offline Backup & Sync</Text>
        <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
          Share, backup, or restore trip data safely without an internet connection using AES-256 encryption.
        </Text>

        {/* Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'export' && [styles.tabButtonActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setActiveTab('export')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.textMuted },
                activeTab === 'export' && [styles.tabTextActive, { color: colors.text }],
              ]}
            >
              Export & Backup
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'import' && [styles.tabButtonActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setActiveTab('import')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.textMuted },
                activeTab === 'import' && [styles.tabTextActive, { color: colors.text }],
              ]}
            >
              Import & Restore
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'export' ? (
          <Card style={styles.card}>
            <Text style={[styles.cardHeader, { color: colors.text }]}>
              Export Trip "{tripName}"
            </Text>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>
              Enter a password to encrypt this trip. Anyone scanning or importing will need this password.
            </Text>

            <Input
              label="Encryption Password"
              placeholder="Enter a secret password"
              value={password}
              onChangeText={setPassword}
            />

            <Button
              title="Generate Encrypted QR & Data"
              loading={loading}
              onPress={handleGenerateBackup}
            />

            {encryptedPayload ? (
              <View style={[styles.resultContainer, { borderTopColor: colors.border }]}>
                <Text style={[styles.resultLabel, { color: colors.text }]}>Offline QR Code:</Text>
                <View
                  style={[
                    styles.qrWrapper,
                    {
                      backgroundColor: '#FFFFFF',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <QRCode
                    value={encryptedPayload.substring(0, 300)}
                    size={180}
                    color="#0F172A"
                    backgroundColor="#FFFFFF"
                  />
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Encrypted Backup String:
                  </Text>
                  <View style={styles.actionButtonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.copyChip,
                        { backgroundColor: colors.primaryLight },
                        copied && { backgroundColor: colors.successLight },
                      ]}
                      onPress={handleCopy}
                      activeOpacity={0.65}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      {copied ? (
                        <CheckIcon size={14} color={colors.primaryDark} style={{ marginRight: 4 }} />
                      ) : (
                        <CopyIcon size={14} color={colors.primaryDark} style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.copyChipText,
                          { color: colors.primaryDark },
                          copied && { color: colors.primaryDark },
                        ]}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.shareChip, { backgroundColor: colors.secondaryLight }]}
                      onPress={handleShare}
                      activeOpacity={0.65}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <ShareIcon size={14} color={colors.secondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.shareChipText, { color: colors.secondary }]}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Selectable text box */}
                <View
                  style={[
                    styles.payloadBoxContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    selectable={true}
                    style={[styles.payloadBox, { color: colors.text }]}
                  >
                    {encryptedPayload}
                  </Text>
                </View>

                <View style={styles.buttonActionRow}>
                  <Button
                    title={copied ? 'Copied to Clipboard' : 'Copy Encrypted String'}
                    icon={
                      copied ? (
                        <CheckIcon size={16} color="#FFFFFF" />
                      ) : (
                        <CopyIcon size={16} color={colors.primary} />
                      )
                    }
                    variant={copied ? 'primary' : 'outline'}
                    size="md"
                    onPress={handleCopy}
                    style={styles.fullWidthBtn}
                  />
                </View>

                <Text style={[styles.helperText, { color: colors.textMuted }]}>
                  Tap "Copy" above or select and copy this string to backup your data into a text file or notes app.
                </Text>
              </View>
            ) : null}
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={[styles.cardHeader, { color: colors.text }]}>Import / Restore Trip</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>
              Paste an encrypted backup string generated from TripZen to restore or synchronize the trip.
            </Text>

            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Encrypted Backup String
              </Text>
              <TouchableOpacity
                style={[styles.pasteChip, { backgroundColor: colors.surface }]}
                onPress={handlePasteFromClipboard}
                activeOpacity={0.65}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.pasteChipText, { color: colors.secondary }]}>
                  Paste from Clipboard
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              placeholder="Paste AES-256 encrypted string here..."
              value={importPayload}
              onChangeText={setImportPayload}
              multiline
              numberOfLines={4}
              inputStyle={{ height: 85, maxHeight: 90, fontSize: 12, lineHeight: 16 }}
            />

            <Input
              label="Decryption Password"
              placeholder="Password used during export"
              value={importPassword}
              onChangeText={setImportPassword}
              secureTextEntry
            />

            <Button
              title="Decrypt & Import Trip"
              loading={importLoading}
              onPress={handleImportBackup}
              style={{ marginTop: 12 }}
            />
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  resultContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  shareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shareChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pasteChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pasteChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  qrWrapper: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  payloadBoxContainer: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    maxHeight: 120,
    marginBottom: 12,
  },
  payloadBox: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  buttonActionRow: {
    marginBottom: 10,
  },
  fullWidthBtn: {
    width: '100%',
  },
  helperText: {
    fontSize: 11,
    lineHeight: 15,
  },
});
