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
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from '../components/Icons';
import { getFromClipboard } from '../utils/clipboard';

export function HomeScreen({ navigation }) {
  const { colors } = useTheme();
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
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>TripZen</Text>

        <View style={styles.headerActions}>
          <Button
            title="Import"
            icon={<DownloadIcon size={14} color={colors.primary} />}
            variant="outline"
            size="sm"
            style={styles.importHeaderBtn}
            onPress={() => setImportModalVisible(true)}
          />
          <Button
            title="New Trip"
            icon={<PlusIcon size={14} color="#FFFFFF" />}
            size="sm"
            onPress={() => navigation.navigate('CreateTrip')}
          />
        </View>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
            <TripIcon size={36} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Create a trip with friends or family to track expenses and settle balances offline.
          </Text>
          <View style={styles.emptyButtonRow}>
            <Button
              title="Create a Trip"
              icon={<PlusIcon size={14} color="#FFFFFF" />}
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateTrip')}
            />
            <Button
              title="Import Backup"
              icon={<DownloadIcon size={14} color={colors.primary} />}
              variant="outline"
              style={styles.emptyButton}
              onPress={() => setImportModalVisible(true)}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item.id}
          renderItem={renderTripItem}
          contentContainerStyle={styles.list}
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

      {/* Edit Trip Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
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
        animationType="slide"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
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
    paddingTop: 0,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  importHeaderBtn: {
    marginRight: 2,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    minWidth: 130,
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
