import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { createTrip } from '../services/tripService';
import { FamilyIcon, UsersIcon } from '../components/Icons';

export function CreateTripScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tripType, setTripType] = useState('families'); // 'families' | 'friends'
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter a trip name.',
        type: 'warning',
      });
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
      showAlert({
        title: 'Error',
        message: 'Failed to create trip. Please try again.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={[styles.keyboardContainer, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>Create a New Trip</Text>
        <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
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

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Trip Participant Mode</Text>

        {/* Option 1: Family Trip */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setTripType('families')}
        >
          <Card
            style={[
              styles.typeCard,
              { borderColor: colors.border },
              tripType === 'families' && [
                styles.typeCardSelected,
                {
                  borderColor: colors.primary,
                  backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
                },
              ],
            ]}
          >
            <View style={styles.typeHeader}>
              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: colors.surface },
                ]}
              >
                <FamilyIcon
                  size={24}
                  color={tripType === 'families' ? colors.primaryDark : colors.textMuted}
                />
              </View>
              <View style={styles.typeInfo}>
                <Text style={[styles.typeTitle, { color: colors.text }]}>Family Trip</Text>
                <Text style={[styles.typeDescription, { color: colors.textMuted }]}>
                  Participants belong to families. Adults (1.0x) and Children (0.5x) have weighted splits.
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  { borderColor: colors.border },
                  tripType === 'families' && [
                    styles.radioSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary },
                  ],
                ]}
              />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Option 2: Friends Trip */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setTripType('friends')}
        >
          <Card
            style={[
              styles.typeCard,
              { borderColor: colors.border },
              tripType === 'friends' && [
                styles.typeCardSelected,
                {
                  borderColor: colors.primary,
                  backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
                },
              ],
            ]}
          >
            <View style={styles.typeHeader}>
              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: colors.surface },
                ]}
              >
                <UsersIcon
                  size={24}
                  color={tripType === 'friends' ? colors.primaryDark : colors.textMuted}
                />
              </View>
              <View style={styles.typeInfo}>
                <Text style={[styles.typeTitle, { color: colors.text }]}>Group of Friends</Text>
                <Text style={[styles.typeDescription, { color: colors.textMuted }]}>
                  Direct list of friends (bachelors, colleagues, roommates). No family grouping or adult/child labels.
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  { borderColor: colors.border },
                  tripType === 'friends' && [
                    styles.radioSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary },
                  ],
                ]}
              />
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  typeCard: {
    padding: 14,
    borderWidth: 2,
    marginBottom: 12,
  },
  typeCardSelected: {},
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginLeft: 8,
  },
  radioSelected: {},
  createButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});
