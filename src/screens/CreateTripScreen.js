import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { createTrip } from '../services/tripService';
import { FamilyIcon, UsersIcon } from '../components/Icons';

export function CreateTripScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tripType, setTripType] = useState('families'); // 'families' | 'friends'
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a trip name.');
      return;
    }

    setLoading(true);
    try {
      const trip = await createTrip({
        name: name.trim(),
        description: description.trim(),
        tripType,
      });
      navigation.navigate('TripDetails', {
        tripId: trip.id,
        tripName: trip.name,
        tripType: trip.tripType,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Create a New Trip</Text>
      <Text style={styles.screenSubtitle}>
        Set up your trip and choose how participants will be organized.
      </Text>

      <Input
        label="Trip Name"
        placeholder="e.g. Goa Vacation 2026, Ladakh Roadtrip"
        value={name}
        onChangeText={setName}
      />

      <Input
        label="Description (Optional)"
        placeholder="Notes, destination, hotel info..."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.sectionLabel}>Trip Participant Mode</Text>

      {/* Option 1: Family Trip */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setTripType('families')}
      >
        <Card style={[styles.typeCard, tripType === 'families' && styles.typeCardSelected]}>
          <View style={styles.typeHeader}>
            <Text style={styles.typeIcon}>👨‍👩‍👧‍👦</Text>
            <View style={styles.typeInfo}>
              <Text style={styles.typeTitle}>Family Trip</Text>
              <Text style={styles.typeDescription}>
                Participants belong to families. Adults (1.0x) and Children (0.5x) have weighted splits.
              </Text>
            </View>
            <View style={[styles.radio, tripType === 'families' && styles.radioSelected]} />
          </View>
        </Card>
      </TouchableOpacity>

      {/* Option 2: Friends Trip */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setTripType('friends')}
      >
        <Card style={[styles.typeCard, tripType === 'friends' && styles.typeCardSelected]}>
          <View style={styles.typeHeader}>
            <Text style={styles.typeIcon}>🧑‍🤝‍🧑</Text>
            <View style={styles.typeInfo}>
              <Text style={styles.typeTitle}>Group of Friends</Text>
              <Text style={styles.typeDescription}>
                Direct list of friends (bachelors, colleagues, roommates). No family grouping or adult/child labels.
              </Text>
            </View>
            <View style={[styles.radio, tripType === 'friends' && styles.radioSelected]} />
          </View>
        </Card>
      </TouchableOpacity>

      <Button
        title="Start Trip"
        size="lg"
        loading={loading}
        onPress={handleCreate}
        style={styles.createButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
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
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    marginTop: 8,
  },
  typeCard: {
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginLeft: 8,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  createButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});
