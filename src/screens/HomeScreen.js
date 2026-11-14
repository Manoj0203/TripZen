import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { getTrips, deleteTrip, updateTrip, importTripEncrypted } from '../services/tripService';
import {
  EditIcon,
  TrashIcon,
  PlusIcon,
  ArrowRightIcon,
  TripIcon,
  DownloadIcon,
  UsersIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SyncIcon,
  SettingsIcon,
} from '../components/Icons';
import { getFromClipboard } from '../utils/clipboard';

export function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = React.useContext(SafeAreaInsetsContext) || { top: 0, bottom: 0, left: 0, right: 0 };
  const { showAlert } = useAlert();

  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Trip Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Import Modal State
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importPayload, setImportPayload] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importing, setImporting] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      const data = await getTrips();
      setTrips(data || []);
    } catch (e) {
      console.error('Failed to load trips:', e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadTrips();
    });
    loadTrips();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigation, loadTrips]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  const handleOpenEdit = (item) => {
    setEditingTripId(item.id);
    setEditName(item.name || '');
    setEditDescription(item.description || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter a trip name.',
        type: 'warning',
      });
      return;
    }

    setSavingEdit(true);
    try {
      await updateTrip(editingTripId, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      setEditModalVisible(false);
      setEditingTripId(null);
      await loadTrips();
      showAlert({
        title: 'Updated',
        message: 'Trip details updated successfully.',
        type: 'success',
      });
    } catch (e) {
      console.error(e);
      showAlert({
        title: 'Error',
        message: 'Failed to update trip.',
        type: 'danger',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTrip = (item) => {
    showAlert({
      title: 'Delete Trip',
      message: `Are you sure you want to delete "${item.name}"? All associated expenses, splits, and participants will be deleted. This cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteTrip(item.id);
          await loadTrips();
        } catch (e) {
          console.error(e);
          showAlert({
            title: 'Error',
            message: 'Failed to delete trip.',
            type: 'danger',
          });
        }
      },
    });
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

  const handleImportTrip = async () => {
    if (!importPayload.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please paste the encrypted trip backup string.',
        type: 'warning',
      });
      return;
    }
    if (!importPassword.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter the encryption password for this backup.',
        type: 'warning',
      });
      return;
    }

    setImporting(true);
    try {
      const imported = await importTripEncrypted(importPayload.trim(), importPassword.trim());
      setImportModalVisible(false);
      setImportPayload('');
      setImportPassword('');
      await loadTrips();
      showAlert({
        title: 'Success',
        message: `Trip "${imported?.name || 'Trip'}" imported successfully!`,
        type: 'success',
      });
    } catch (e) {
      console.error(e);
      showAlert({
        title: 'Import Failed',
        message: 'Invalid backup string or incorrect password.',
        type: 'danger',
      });
    } finally {
      setImporting(false);
    }
  };

  const renderTripItem = ({ item }) => {
    const isFriends = item.tripType === 'friends';
    return (
      <Card style={styles.tripCard}>
        {/* Card Body Touchable - Opens Trip */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('TripDetails', {
              tripId: item.id,
              tripName: item.name,
              tripType: item.tripType,
            })
          }
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.tripName, { color: colors.text }]}>{item.name}</Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isFriends ? colors.secondaryLight : colors.primaryLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: isFriends ? colors.secondary : colors.primaryDark,
                  },
                ]}
              >
                {isFriends ? 'Friends' : 'Families'}
              </Text>
            </View>
          </View>

          {item.description ? (
            <Text style={[styles.description, { color: colors.textMuted }]}>
              {item.description}
            </Text>
          ) : null}
        </TouchableOpacity>

        {/* Action Footer - Sibling row outside navigation touchable */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerDate, { color: colors.textMuted }]}>
            Created {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}
          </Text>

          <View style={styles.cardActionRow}>
            {/* Edit Trip Button */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => handleOpenEdit(item)}
              style={[styles.actionIconBtn, { backgroundColor: colors.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <EditIcon size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Delete Trip Button */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => handleDeleteTrip(item)}
              style={[styles.actionIconBtn, { backgroundColor: colors.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <TrashIcon size={16} color={colors.danger} />
            </TouchableOpacity>

            {/* View Arrow */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.viewRow}
              onPress={() =>
                navigation.navigate('TripDetails', {
                  tripId: item.id,
                  tripName: item.name,
                  tripType: item.tripType,
                })
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.arrowText, { color: colors.primary }]}>View</Text>
              <ArrowRightIcon size={14} color={colors.primary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modern Clean Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text style={[styles.title, { color: colors.text }]}>TripZen</Text>
          </View>
          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SettingsIcon size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {trips.length === 0 ? (
        <ScrollView
          style={styles.emptyScrollView}
          contentContainerStyle={[
            styles.emptyScrollContent,
            { paddingBottom: Math.max(insets.bottom, 12) + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Hero Welcome Card */}
          <Card style={[styles.heroCard, { borderColor: colors.border }]}>
            <View style={styles.heroHeader}>
              <View style={[styles.heroIconCircle, { backgroundColor: colors.primaryLight }]}>
                <TripIcon size={26} color={colors.primaryDark} />
              </View>
              <View style={[styles.heroBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.heroBadgeText, { color: colors.primaryDark }]}>Get Started</Text>
              </View>
            </View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Plan & Split With Peace of Mind
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Track joint costs on trips, split fairly between friends or families, and settle debts completely offline.
            </Text>

            <View style={styles.heroBtnRow}>
              <Button
                title="Create a Trip"
                icon={<PlusIcon size={14} color="#FFFFFF" />}
                style={styles.heroBtn}
                onPress={() => navigation.navigate('CreateTrip')}
              />
              <Button
                title="Import Backup"
                icon={<DownloadIcon size={14} color={colors.primary} />}
                variant="outline"
                style={styles.heroBtn}
                onPress={() => setImportModalVisible(true)}
              />
            </View>
          </Card>

          {/* How It Works Guide Section */}
          <View style={styles.featuresSection}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              How TripZen Works
            </Text>

            <Card style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: colors.primaryLight }]}>
                <UsersIcon size={20} color={colors.primaryDark} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Families & Friends Split
                </Text>
                <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                  Split equally with friends or use adult (1.0x) and child (0.5x) family weights.
                </Text>
              </View>
            </Card>

            <Card style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: colors.secondaryLight }]}>
                <ScaleIcon size={20} color={colors.secondary} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Smart Debt Settlement
                </Text>
                <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                  Automatically calculates the minimum transactions needed to clear all balances.
                </Text>
              </View>
            </Card>

            <Card style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: colors.surface }]}>
                <ShieldCheckIcon size={20} color={colors.primary} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  100% Offline & Encrypted
                </Text>
                <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                  No cloud, no accounts, no ads. Share or backup trips offline with AES-256 encryption.
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item.id}
          renderItem={renderTripItem}
          ListHeaderComponent={
            <View style={styles.listHeaderRow}>
              <View style={styles.listHeaderTitleCol}>
                <Text style={[styles.listHeaderTitle, { color: colors.text }]}>Your Trips</Text>
                <View style={[styles.tripCountPill, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.tripCountText, { color: colors.primaryDark }]}>
                    {`${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.importHeaderChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setImportModalVisible(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <DownloadIcon size={13} color={colors.secondary} style={{ marginRight: 5 }} />
                <Text style={[styles.importHeaderText, { color: colors.secondary }]}>Import</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            trips.length === 1 ? (
              <View style={[styles.singleTripTipBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.tipIconRow}>
                  <SyncIcon size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.tipTitle, { color: colors.text }]}>Quick Tip</Text>
                </View>
                <Text style={[styles.tipDesc, { color: colors.textMuted }]}>
                  Tap on your trip above to log expenses, manage participants, or view simplified settlement payments.
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={[styles.list, { paddingBottom: 88 + insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* Floating Action Button (FAB) in Bottom Right */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: Math.max(insets.bottom, 12) + 16,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CreateTrip')}
        onLongPress={() => setImportModalVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <PlusIcon size={20} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
        <Text style={styles.fabText}>New Trip</Text>
      </TouchableOpacity>

      {/* Edit Trip Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Trip</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Update trip details
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.modalScrollBody}
            >
              <Input
                label="Trip Name"
                placeholder="e.g. Goa Vacation 2026"
                value={editName}
                onChangeText={setEditName}
              />

              <Input
                label="Description (Optional)"
                placeholder="Notes, destination, hotel info..."
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
              />
            </ScrollView>

            <View style={[styles.modalButtonRow, { borderTopColor: colors.border }]}>
              <Button
                title="Cancel"
                variant="outline"
                style={styles.modalBtn}
                onPress={() => setEditModalVisible(false)}
              />
              <Button
                title="Save Changes"
                loading={savingEdit}
                style={styles.modalBtn}
                onPress={handleSaveEdit}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Import Trip Modal */}
      <Modal
        visible={importModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
        >
          <View style={[styles.importModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Import Trip</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Paste the encrypted trip backup string and enter the password used to protect it.
            </Text>

            <ScrollView
              style={styles.importScrollBody}
              contentContainerStyle={styles.importScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputHeaderRow}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
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
                placeholder="Paste encrypted backup string here..."
                value={importPayload}
                onChangeText={setImportPayload}
                multiline
                numberOfLines={3}
                containerStyle={styles.importPayloadContainer}
                inputStyle={styles.importPayloadInput}
              />

              <Input
                label="Password"
                placeholder="Enter backup password"
                value={importPassword}
                onChangeText={setImportPassword}
                secureTextEntry
              />

              {/* Action Buttons inside scroll body so keyboard never hides or drops clicks */}
              <View style={[styles.modalButtonRow, { borderTopColor: colors.border }]}>
                <Button
                  title="Cancel"
                  variant="outline"
                  style={styles.modalBtn}
                  onPress={() => {
                    setImportModalVisible(false);
                    setImportPayload('');
                    setImportPassword('');
                  }}
                />
                <Button
                  title="Import Trip"
                  icon={<DownloadIcon size={14} color="#FFFFFF" />}
                  loading={importing}
                  style={styles.modalBtn}
                  onPress={handleImportTrip}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleCol: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    padding: 16,
  },
  tripCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tripName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 6,
  },
  footerDate: {
    fontSize: 12,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  arrowText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyScrollView: {
    flex: 1,
  },
  emptyScrollContent: {
    paddingTop: 4,
  },
  heroCard: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  heroBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroBtn: {
    flex: 1,
  },
  featuresSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 6,
  },
  featureCard: {
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  listHeaderTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  tripCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tripCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  importHeaderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  importHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  singleTripTipBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  tipIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  tipDesc: {
    fontSize: 12,
    lineHeight: 18,
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
    padding: 24,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalScrollBody: {
    flexShrink: 1,
  },
  importModalContent: {
    borderRadius: 20,
    padding: 20,
    width: '96%',
    maxWidth: 480,
    maxHeight: '94%',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  importScrollBody: {
    flexShrink: 1,
    marginVertical: 4,
  },
  importScrollContent: {
    paddingBottom: 8,
  },
  importPayloadContainer: {
    marginBottom: 12,
  },
  importPayloadInput: {
    height: 80,
    maxHeight: 85,
    fontSize: 12,
    lineHeight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  modalBtn: {
    minWidth: 100,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
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
});
