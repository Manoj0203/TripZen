import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { exportTripEncrypted, importTripEncrypted } from '../services/tripService';
import { CopyIcon, CheckIcon, ShareIcon, QrCodeIcon } from '../components/Icons';
import { copyToClipboard, getFromClipboard } from '../utils/clipboard';

export function SyncBackupModal({ route, navigation }) {
  const { tripId, tripName } = route.params || {};

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
      Alert.alert('Password Required', 'Please enter a password to protect this backup.');
      return;
    }

    setLoading(true);
    setCopied(false);
    try {
      const payload = await exportTripEncrypted(tripId, password.trim());
      setEncryptedPayload(payload);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate backup.');
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
      Alert.alert('Copied!', 'Encrypted backup string copied to your clipboard.');
    } catch (e) {
      console.error(e);
      Alert.alert('Notice', 'Please long-press the string below to copy manually.');
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
        Alert.alert('Clipboard Empty', 'No text found in clipboard.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportBackup = async () => {
    if (!importPayload.trim()) {
      Alert.alert('Required', 'Please paste the encrypted backup string.');
      return;
    }
    if (!importPassword.trim()) {
      Alert.alert('Required', 'Please enter the decryption password for this backup.');
      return;
    }

    setImportLoading(true);
    try {
      const imported = await importTripEncrypted(importPayload.trim(), importPassword.trim());
      Alert.alert(
        'Import Successful',
        `Trip "${imported?.name || 'Imported Trip'}" restored successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('Home');
            },
          },
        ]
      );
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Import Failed',
        'Could not decrypt backup. Please check your password and verify the backup string.'
      );
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Offline Backup & Sync</Text>
        <Text style={styles.screenSubtitle}>
          Share, backup, or restore trip data safely without an internet connection using AES-256 encryption.
        </Text>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'export' && styles.tabButtonActive]}
            onPress={() => setActiveTab('export')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'export' && styles.tabTextActive]}>
              Export & Backup
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'import' && styles.tabButtonActive]}
            onPress={() => setActiveTab('import')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'import' && styles.tabTextActive]}>
              Import & Restore
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'export' ? (
          <Card style={styles.card}>
            <Text style={styles.cardHeader}>Export Trip "{tripName}"</Text>
            <Text style={styles.cardSub}>
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
              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Offline QR Code:</Text>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={encryptedPayload.substring(0, 300)}
                    size={180}
                    color={colors.text}
                    backgroundColor="#FFFFFF"
                  />
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.resultLabel}>Encrypted Backup String:</Text>
                  <View style={styles.actionButtonGroup}>
                    <TouchableOpacity
                      style={[styles.copyChip, copied && styles.copyChipSuccess]}
                      onPress={handleCopy}
                      activeOpacity={0.65}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      {copied ? (
                        <CheckIcon size={14} color="#15803D" style={{ marginRight: 4 }} />
                      ) : (
                        <CopyIcon size={14} color={colors.primaryDark} style={{ marginRight: 4 }} />
                      )}
                      <Text style={[styles.copyChipText, copied && styles.copyChipTextSuccess]}>
                        {copied ? 'Copied!' : 'Copy'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareChip}
                      onPress={handleShare}
                      activeOpacity={0.65}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <ShareIcon size={14} color={colors.secondary} style={{ marginRight: 4 }} />
                      <Text style={styles.shareChipText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Selectable text box */}
                <View style={styles.payloadBoxContainer}>
                  <Text selectable={true} style={styles.payloadBox}>
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

                <Text style={styles.helperText}>
                  Tap "Copy" above or select and copy this string to backup your data into a text file or notes app.
                </Text>
              </View>
            ) : null}
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardHeader}>Import / Restore Trip</Text>
            <Text style={styles.cardSub}>
              Paste an encrypted backup string generated from TripZen to restore or synchronize the trip.
            </Text>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.fieldLabel}>Encrypted Backup String</Text>
              <TouchableOpacity
                style={styles.pasteChip}
                onPress={handlePasteFromClipboard}
                activeOpacity={0.65}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.pasteChipText}>Paste from Clipboard</Text>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 16,
  },
  resultContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    color: colors.text,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyChipSuccess: {
    backgroundColor: '#DCFCE7',
  },
  copyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  copyChipTextSuccess: {
    color: '#15803D',
  },
  shareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shareChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  pasteChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  pasteChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  qrWrapper: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  payloadBoxContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 120,
    marginBottom: 12,
  },
  payloadBox: {
    fontSize: 11,
    color: colors.text,
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
    color: colors.textMuted,
    lineHeight: 15,
  },
});
