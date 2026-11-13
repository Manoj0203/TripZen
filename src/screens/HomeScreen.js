import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { getTrips } from '../services/tripService';

export function HomeScreen({ navigation }) {
  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const renderTripItem = ({ item }) => {
    const isFriends = item.tripType === 'friends';
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('TripDetails', { tripId: item.id, tripName: item.name, tripType: item.tripType })}
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
            <Text style={styles.arrowText}>View Trip →</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>TripZen</Text>
          <Text style={styles.subtitle}>Offline Group Expense Manager</Text>
        </View>
        <Button
          title="+ New Trip"
          size="sm"
          onPress={() => navigation.navigate('CreateTrip')}
        />
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Trips Yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first trip with families or friends to get started!
          </Text>
          <Button
            title="Create a Trip"
            style={styles.emptyButton}
            onPress={() => navigation.navigate('CreateTrip')}
          />
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
  emptyButton: {
    minWidth: 160,
  },
});
