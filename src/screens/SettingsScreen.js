import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  getStorageStats,
  clearAllData,
  exportAllDataEncrypted,
  importAllDataEncrypted,
  getSetting,
  setSetting,
} from '../services/settingsService';
import {
  SunIcon,
  MoonIcon,
  UsersIcon,
  FamilyIcon,
  ShieldCheckIcon,
  TrashIcon,
  DownloadIcon,
  CopyIcon,
  ShareIcon,
  StarIcon,
  ExternalLinkIcon,
  SyncIcon,
  CheckIcon,
} from '../components/Icons';
import { copyToClipboard, getFromClipboard } from '../utils/clipboard';

export function SettingsScreen({ navigation }) {
  const { colors, isDark, theme, setTheme } = useTheme();
  const insets = React.useContext(SafeAreaInsetsContext) || { top: 0, bottom: 0, left: 0, right: 0 };
  const { showAlert } = useAlert();

  // Storage Stats State
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalExpenses: 0,
    totalSettlements: 0,
    totalParticipants: 0,
  });

  // Trip Defaults State
  const [defaultTripType, setDefaultTripType] = useState('families'); // 'families' | 'friends'
  const [defaultChildWeight, setDefaultChildWeight] = useState(50); // 25 | 50 | 75

  // Export Modal State
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportedPayload, setExportedPayload] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  // Restore Modal State
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restorePayload, setRestorePayload] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  const loadSettingsAndStats = useCallback(async () => {
    try {
      const [storageData, tripTypeSetting, childWeightSetting] = await Promise.all([
        getStorageStats(),
        getSetting('defaultTripType', 'families'),
        getSetting('defaultChildWeight', 50),
      ]);
      setStats(storageData);
      setDefaultTripType(tripTypeSetting || 'families');
      setDefaultChildWeight(Number(childWeightSetting) || 50);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadSettingsAndStats();
    });
    loadSettingsAndStats();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigation, loadSettingsAndStats]);

  // Preference Handlers
  const handleSelectTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const handleSelectTripType = async (type) => {
    setDefaultTripType(type);
    await setSetting('defaultTripType', type);
  };

  const handleSelectChildWeight = async (weight) => {
    setDefaultChildWeight(weight);
    await setSetting('defaultChildWeight', weight);
  };

  // Full Backup Export Handler
  const handleExportFullBackup = async () => {
    if (!exportPassword.trim()) {
      showAlert({
        title: 'Password Required',
        message: 'Please enter a password to encrypt this full backup archive.',
        type: 'warning',
      });
      return;
    }

    setExportLoading(true);
    try {
      const payload = await exportAllDataEncrypted(exportPassword.trim());
      setExportedPayload(payload);
      setCopiedExport(false);
    } catch (e) {
      console.error(e);
      showAlert({
        title: 'Export Failed',
        message: e.message || 'Could not export backup.',
        type: 'danger',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleShareExport = async () => {
    if (!exportedPayload) return;
    try {
      await Share.share({
        title: 'TripZen_Full_Backup.txt',
        message: exportedPayload,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyExport = async () => {
    if (!exportedPayload) return;
    const ok = await copyToClipboard(exportedPayload);
    if (ok) {
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 2500);
    }
  };

  // Restore Full Backup Handler
  const handlePasteToRestore = async () => {
    try {
      const text = await getFromClipboard();
      if (text) {
        setRestorePayload(text);
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

  const handleRestoreFullBackup = async () => {
    if (!restorePayload.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please paste the encrypted full backup string.',
        type: 'warning',
      });
      return;
    }
    if (!restorePassword.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter the password used to encrypt this backup.',
        type: 'warning',
      });
      return;
    }

    setRestoreLoading(true);
    try {
      const res = await importAllDataEncrypted(restorePayload.trim(), restorePassword.trim());
      setRestoreModalVisible(false);
      setRestorePayload('');
      setRestorePassword('');
      await loadSettingsAndStats();
      showAlert({
        title: 'Restore Complete',
        message: `Successfully restored ${res.restoredTripsCount} trip(s) with all expenses and settlements!`,
        type: 'success',
      });
    } catch (e) {
      console.error(e);
      showAlert({
        title: 'Restore Failed',
        message: 'Invalid backup string or incorrect password.',
        type: 'danger',
      });
    } finally {
      setRestoreLoading(false);
    }
  };

  // Clear All Data Handler
  const handleClearAllData = () => {
    showAlert({
      title: 'Clear All Data?',
      message:
        'This will permanently delete all trips, expenses, participants, and settlement records. This cannot be undone.',
      type: 'danger',
      confirmText: 'Wipe Everything',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await clearAllData();
          await loadSettingsAndStats();
          showAlert({
            title: 'Data Cleared',
            message: 'All trips and data have been wiped. You have a fresh slate.',
            type: 'info',
          });
        } catch (e) {
          console.error(e);
          showAlert({
            title: 'Error',
            message: 'Failed to clear data.',
            type: 'danger',
          });
        }
      },
    });
  };

  // External Links Handlers
  const handleRateApp = async () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.tripzen';
    try {
      const supported = await Linking.canOpenURL(playStoreUrl);
      if (supported) {
        await Linking.openURL(playStoreUrl);
      } else {
        showAlert({
          title: 'Rate TripZen',
          message: 'Play Store link will be active once published.',
          type: 'info',
        });
      }
    } catch {
      showAlert({
        title: 'Rate TripZen',
        message: 'Play Store link will be active once published.',
        type: 'info',
      });
    }
  };

  const handleMoreFromDevelax = async () => {
    const develaxUrl = 'https://develax.com';
    try {
      const supported = await Linking.canOpenURL(develaxUrl);
      if (supported) {
        await Linking.openURL(develaxUrl);
      } else {
        showAlert({
          title: 'Develax',
          message: 'Visit develax.com for more developer apps and tools.',
          type: 'info',
        });
      }
    } catch {
      showAlert({
        title: 'Develax',
        message: 'Visit develax.com for more developer apps and tools.',
        type: 'info',
      });
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 16) + 36 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Appearance & Theme Section */}
      <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
        Appearance & Theme
      </Text>
      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Theme Mode</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
          Choose your interface appearance preference
        </Text>

        <View style={styles.themeSelectorRow}>
          {/* Light Theme */}
          <TouchableOpacity
            style={[
              styles.themeChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              theme === 'light' && [
                styles.themeChipActive,
                { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ],
            ]}
            onPress={() => handleSelectTheme('light')}
            activeOpacity={0.7}
          >
            <SunIcon size={18} color={theme === 'light' ? colors.primaryDark : colors.textMuted} />
            <Text
              style={[
                styles.themeChipText,
                { color: colors.textMuted },
                theme === 'light' && [styles.themeChipTextActive, { color: colors.primaryDark }],
              ]}
            >
              Light
            </Text>
          </TouchableOpacity>

          {/* Dark Theme */}
          <TouchableOpacity
            style={[
              styles.themeChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              theme === 'dark' && [
                styles.themeChipActive,
                { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ],
            ]}
            onPress={() => handleSelectTheme('dark')}
            activeOpacity={0.7}
          >
            <MoonIcon size={18} color={theme === 'dark' ? colors.primaryDark : colors.textMuted} />
            <Text
              style={[
                styles.themeChipText,
                { color: colors.textMuted },
                theme === 'dark' && [styles.themeChipTextActive, { color: colors.primaryDark }],
              ]}
            >
              Dark
            </Text>
          </TouchableOpacity>

          {/* System Default */}
          <TouchableOpacity
            style={[
              styles.themeChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              theme === 'system' && [
                styles.themeChipActive,
                { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ],
            ]}
            onPress={() => handleSelectTheme('system')}
            activeOpacity={0.7}
          >
            <SyncIcon size={16} color={theme === 'system' ? colors.primaryDark : colors.textMuted} />
            <Text
              style={[
                styles.themeChipText,
                { color: colors.textMuted },
                theme === 'system' && [styles.themeChipTextActive, { color: colors.primaryDark }],
              ]}
            >
              System
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 2. Trip & Split Defaults Section */}
      <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 24 }]}>
        Trip & Split Defaults
      </Text>
      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Default Group Type</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
          Pre-selected type when creating a new trip
        </Text>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              { borderColor: colors.border, backgroundColor: colors.surface },
              defaultTripType === 'families' && [
                styles.toggleOptionActive,
                { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ],
            ]}
            onPress={() => handleSelectTripType('families')}
            activeOpacity={0.7}
          >
            <FamilyIcon
              size={18}
              color={defaultTripType === 'families' ? colors.primaryDark : colors.textMuted}
            />
            <Text
              style={[
                styles.toggleText,
                { color: colors.textMuted },
                defaultTripType === 'families' && [
                  styles.toggleTextActive,
                  { color: colors.primaryDark },
                ],
              ]}
            >
              Family Trip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleOption,
              { borderColor: colors.border, backgroundColor: colors.surface },
              defaultTripType === 'friends' && [
                styles.toggleOptionActive,
                { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ],
            ]}
            onPress={() => handleSelectTripType('friends')}
            activeOpacity={0.7}
          >
            <UsersIcon
              size={18}
              color={defaultTripType === 'friends' ? colors.primaryDark : colors.textMuted}
            />
            <Text
              style={[
                styles.toggleText,
                { color: colors.textMuted },
                defaultTripType === 'friends' && [
                  styles.toggleTextActive,
                  { color: colors.primaryDark },
                ],
              ]}
            >
              Friends Trip
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.cardTitle, { color: colors.text }]}>Child Split Weight</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
          Default expense share ratio assigned to children in family trips
        </Text>

        <View style={styles.toggleRow}>
          {[
            { label: '0.25x (25%)', val: 25 },
            { label: '0.50x (50%)', val: 50 },
            { label: '0.75x (75%)', val: 75 },
          ].map((item) => (
            <TouchableOpacity
              key={item.val}
              style={[
                styles.weightChip,
                { borderColor: colors.border, backgroundColor: colors.surface },
                defaultChildWeight === item.val && [
                  styles.weightChipActive,
                  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ],
              ]}
              onPress={() => handleSelectChildWeight(item.val)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.weightChipText,
                  { color: colors.textMuted },
                  defaultChildWeight === item.val && [
                    styles.weightChipTextActive,
                    { color: colors.primaryDark },
                  ],
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* 3. Backup & Storage Management */}
      <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 24 }]}>
        Backup & Storage
      </Text>
      <Card style={styles.card}>
        <View style={styles.storageStatsRow}>
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalTrips}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Trips</Text>
          </View>
          <View style={[styles.statSeparator, { backgroundColor: colors.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalExpenses}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expenses</Text>
          </View>
          <View style={[styles.statSeparator, { backgroundColor: colors.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalSettlements}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Payments</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Export All Trips (File / Text) */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => {
            setExportedPayload('');
            setExportPassword('');
            setExportModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBox, { backgroundColor: colors.primaryLight }]}>
            <ShareIcon size={18} color={colors.primaryDark} />
          </View>
          <View style={styles.actionTextBox}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Export All Trips</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textMuted }]}>
              Save encrypted backup as file or text (Google Drive / WhatsApp)
            </Text>
          </View>
        </TouchableOpacity>

        {/* Restore All Trips */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => {
            setRestorePayload('');
            setRestorePassword('');
            setRestoreModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBox, { backgroundColor: colors.secondaryLight }]}>
            <DownloadIcon size={18} color={colors.secondary} />
          </View>
          <View style={styles.actionTextBox}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Restore All Trips</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textMuted }]}>
              Import an encrypted full backup archive
            </Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Clear All Data */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleClearAllData}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBox, { backgroundColor: colors.dangerLight }]}>
            <TrashIcon size={18} color={colors.danger} />
          </View>
          <View style={styles.actionTextBox}>
            <Text style={[styles.actionTitle, { color: colors.danger }]}>Clear All Data</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textMuted }]}>
              Wipe all trips and expenses to start completely fresh
            </Text>
          </View>
        </TouchableOpacity>
      </Card>

      {/* 4. About & Develax Section */}
      <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 24 }]}>
        About & Developer
      </Text>
      <Card style={styles.card}>
        <View style={styles.appInfoRow}>
          <View style={[styles.appIconBadge, { backgroundColor: colors.primaryLight }]}>
            <ShieldCheckIcon size={24} color={colors.primaryDark} />
          </View>
          <View style={styles.appInfoText}>
            <Text style={[styles.appName, { color: colors.text }]}>TripZen</Text>
            <Text style={[styles.appVersion, { color: colors.textMuted }]}>
              Version 1.0.0 • 100% Offline & Private
            </Text>
          </View>
        </View>

        <Text style={[styles.appDescription, { color: colors.textMuted }]}>
          Stress-free group expense tracker and debt simplifier for families and friends. No cloud
          logins, no ads, and zero telemetry.
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Rate This App */}
        <TouchableOpacity style={styles.linkRow} onPress={handleRateApp} activeOpacity={0.7}>
          <View style={styles.linkLeft}>
            <StarIcon size={18} color="#F59E0B" style={{ marginRight: 10 }} />
            <Text style={[styles.linkTitle, { color: colors.text }]}>Rate This App</Text>
          </View>
          <ExternalLinkIcon size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* More from Develax */}
        <TouchableOpacity style={styles.linkRow} onPress={handleMoreFromDevelax} activeOpacity={0.7}>
          <View style={styles.linkLeft}>
            <ExternalLinkIcon size={18} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={[styles.linkTitle, { color: colors.text }]}>More from Develax</Text>
          </View>
          <ExternalLinkIcon size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* Export Full Backup Modal */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Export All Trips</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Generates an AES-256 encrypted archive containing all trips, expenses, and settlements.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {!exportedPayload ? (
                <>
                  <Input
                    label="Encryption Password"
                    placeholder="Enter a strong password"
                    value={exportPassword}
                    onChangeText={setExportPassword}
                    secureTextEntry
                  />
                  <Text style={[styles.passwordHelp, { color: colors.textMuted }]}>
                    Important: Remember this password. You will need it to restore this backup.
                  </Text>
                  <Button
                    title="Generate Backup Archive"
                    loading={exportLoading}
                    onPress={handleExportFullBackup}
                    style={{ marginTop: 12 }}
                  />
                </>
              ) : (
                <>
                  <View style={[styles.successBanner, { backgroundColor: colors.successLight }]}>
                    <CheckIcon size={18} color={colors.primaryDark} style={{ marginRight: 6 }} />
                    <Text style={[styles.successText, { color: colors.primaryDark }]}>
                      Full backup generated successfully!
                    </Text>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>
                    Encrypted Payload
                  </Text>
                  <View style={[styles.payloadPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.payloadText, { color: colors.textMuted }]} numberOfLines={4}>
                      {exportedPayload}
                    </Text>
                  </View>

                  <View style={styles.exportBtnGroup}>
                    <Button
                      title="Share / Save as File"
                      icon={<ShareIcon size={16} color="#FFFFFF" />}
                      onPress={handleShareExport}
                      style={{ marginBottom: 10 }}
                    />
                    <Button
                      title={copiedExport ? 'Copied to Clipboard!' : 'Copy Encrypted Text'}
                      icon={copiedExport ? <CheckIcon size={16} color={colors.primary} /> : <CopyIcon size={16} color={colors.primary} />}
                      variant="outline"
                      onPress={handleCopyExport}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Button
                title="Close"
                variant="outline"
                style={{ width: '100%' }}
                onPress={() => setExportModalVisible(false)}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Restore Full Backup Modal */}
      <Modal
        visible={restoreModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Restore All Trips</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Paste the encrypted full backup string and enter the password used to protect it.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.inputHeaderRow}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Encrypted Backup String
                </Text>
                <TouchableOpacity
                  style={[styles.pasteChip, { backgroundColor: colors.surface }]}
                  onPress={handlePasteToRestore}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.pasteChipText, { color: colors.secondary }]}>
                    Paste from Clipboard
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
                placeholder="Paste encrypted backup string here..."
                value={restorePayload}
                onChangeText={setRestorePayload}
                multiline
                numberOfLines={3}
                inputStyle={styles.restoreInput}
              />

              <Input
                label="Decryption Password"
                placeholder="Enter password set during export"
                value={restorePassword}
                onChangeText={setRestorePassword}
                secureTextEntry
              />

              <Button
                title="Decrypt & Restore Archive"
                icon={<DownloadIcon size={16} color="#FFFFFF" />}
                loading={restoreLoading}
                onPress={handleRestoreFullBackup}
                style={{ marginTop: 12 }}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Button
                title="Cancel"
                variant="outline"
                style={{ width: '100%' }}
                onPress={() => setRestoreModalVisible(false)}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    padding: 16,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  themeChipActive: {},
  themeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeChipTextActive: {
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  toggleOptionActive: {},
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {
    fontWeight: '700',
  },
  weightChip: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
  },
  weightChipActive: {},
  weightChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  weightChipTextActive: {
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  storageStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statSeparator: {
    width: 1,
    height: 32,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextBox: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  appInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  appIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appInfoText: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
  },
  appVersion: {
    fontSize: 12,
    marginTop: 2,
  },
  appDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  passwordHelp: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  successText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  payloadPreview: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  payloadText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  exportBtnGroup: {
    marginTop: 4,
    marginBottom: 10,
  },
  modalFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pasteChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pasteChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  restoreInput: {
    height: 70,
    maxHeight: 75,
    fontSize: 12,
    lineHeight: 16,
  },
});
