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
import { getTrips, deleteTrip, importTripEncrypted } from '../services/tripService';

export function HomeScreen({ navigation }) {
  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
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

  const handleDeleteTrip = (item) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${item.name}" and all its expenses? This action cannot be undone.`,
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
      Alert.alert('Success', `Trip "${imported.name}" imported successfully!`);
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
        onPress={() => navigation.navigate('TripDetails', { tripId: item.id, tripName: item.name, tripType: item.tripType })}
        onLongPress={() => handleDeleteTrip(item)}
      >
        <Card style={styles.tripCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.tripName}>{item.name}</Text>
            <View style={[styles.badge, isFriends ? styles.badgeFriends : styles.badgeFamily]}>
              <Text style={[styles.badgeText, isFriends ? styles.badgeTextFriends : styles.badgeTextFamily]}>
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
            <View style={styles.footerActions}>
              <TouchableOpacity
                onPress={() => handleDeleteTrip(item)}
                style={styles.deleteButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
              <Text style={styles.arrowText}>View Trip →</Text>
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
            title="+ New Trip"
            size="sm"
            onPress={() => navigation.navigate('CreateTrip')}
          />
        </View>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Trips Yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first trip with families or friends, or import a shared trip!
          </Text>
          <View style={styles.emptyButtonRow}>
            <Button
              title="Create a Trip"
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

            <Input
              label="Encrypted Backup String"
              placeholder="Paste encrypted backup string here..."
              value={importPayload}
              onChangeText={setImportPayload}
              multiline
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
    marginRight: 6,
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
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  deleteButtonText: {
    fontSize: 14,
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
});
