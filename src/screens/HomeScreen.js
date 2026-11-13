import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
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
      Alert.alert('Required', 'Please enter a trip name.');
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
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update trip.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTrip = (item) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${item.name}"? All associated expenses, splits, and participants will be deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(item.id);
              await loadTrips();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete trip.');
            }
          },
        },
      ]
    );
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

  const handleImportTrip = async () => {
    if (!importPayload.trim()) {
      Alert.alert('Required', 'Please paste the encrypted trip backup string.');
      return;
    }
    if (!importPassword.trim()) {
      Alert.alert('Required', 'Please enter the encryption password for this backup.');
      return;
    }

    setImporting(true);
    try {
      const imported = await importTripEncrypted(importPayload.trim(), importPassword.trim());
      setImportModalVisible(false);
      setImportPayload('');
      setImportPassword('');
      await loadTrips();
      Alert.alert('Success', `Trip "${imported?.name || 'Trip'}" imported successfully!`);
    } catch (e) {
      console.error(e);
      Alert.alert('Import Failed', 'Invalid backup string or incorrect password.');
    } finally {
      setImporting(false);
    }
  };

  const renderTripItem = ({ item }) => {
    const isFriends = item.tripType === 'friends';
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('TripDetails', {
            tripId: item.id,
            tripName: item.name,
            tripType: item.tripType,
          })
        }
      >
        <Card style={styles.tripCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.tripName}>{item.name}</Text>
            <View style={[styles.badge, isFriends ? styles.badgeFriends : styles.badgeFamily]}>
              <Text
                style={[
                  styles.badgeText,
                  isFriends ? styles.badgeTextFriends : styles.badgeTextFamily,
                ]}
              >
                {isFriends ? 'Friends Trip' : 'Family Trip'}
              </Text>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}

          <View style={styles.cardFooter}>
            <Text style={styles.footerDate}>
              Created {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}
            </Text>

            <View style={styles.cardActionRow}>
              {/* Edit Trip Button */}
              <TouchableOpacity
                onPress={() => handleOpenEdit(item)}
                style={styles.actionIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <EditIcon size={16} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Delete Trip Button */}
              <TouchableOpacity
                onPress={() => handleDeleteTrip(item)}
                style={styles.actionIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <TrashIcon size={16} color={colors.danger} />
              </TouchableOpacity>

              {/* View Arrow */}
              <View style={styles.viewRow}>
                <Text style={styles.arrowText}>View</Text>
                <ArrowRightIcon size={14} color={colors.primary} style={{ marginLeft: 2 }} />
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>TripZen</Text>
          <Text style={styles.subtitle}>Offline Group Expense Manager</Text>
        </View>
        <View style={styles.headerActions}>
          <Button
            title="Import"
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
          <TripIcon size={56} color="#CBD5E1" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Trips Yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first trip with families or friends, or import an encrypted backup.
          </Text>
          <View style={styles.emptyButtonRow}>
            <Button
              title="Create a Trip"
              icon={<PlusIcon size={14} color="#FFFFFF" />}
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateTrip')}
            />
            <Button
              title="Import Trip"
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Edit Trip Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Trip</Text>
            <Text style={styles.modalSubtitle}>Update trip details</Text>

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

            <View style={styles.modalButtonRow}>
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
        </View>
      </Modal>

      {/* Import Trip Modal */}
      <Modal
        visible={importModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Import Trip</Text>
            <Text style={styles.modalSubtitle}>
              Paste the encrypted trip backup string and enter the password used to protect it.
            </Text>

            <View style={styles.inputHeaderRow}>
              <Text style={styles.inputLabel}>Encrypted Backup String</Text>
              <TouchableOpacity
                style={styles.pasteChip}
                onPress={handlePasteFromClipboard}
                activeOpacity={0.7}
              >
                <Text style={styles.pasteChipText}>Paste from Clipboard</Text>
              </TouchableOpacity>
            </View>

            <Input
              placeholder="Paste encrypted backup string here..."
              value={importPayload}
              onChangeText={setImportPayload}
              multiline
              numberOfLines={4}
            />

            <Input
              label="Password"
              placeholder="Enter backup password"
              value={importPassword}
              onChangeText={setImportPassword}
              secureTextEntry
            />

            <View style={styles.modalButtonRow}>
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
                title="Import"
                loading={importing}
                style={styles.modalBtn}
                onPress={handleImportTrip}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  importHeaderBtn: {
    marginRight: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
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
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeFamily: {
    backgroundColor: colors.primaryLight,
  },
  badgeFriends: {
    backgroundColor: colors.secondaryLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextFamily: {
    color: colors.primaryDark,
  },
  badgeTextFriends: {
    color: colors.secondary,
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 6,
  },
  footerDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  arrowText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 18,
    lineHeight: 18,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
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
    color: colors.text,
  },
  pasteChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  pasteChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
});
