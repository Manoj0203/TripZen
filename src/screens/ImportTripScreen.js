import React, { useState } from 'react';
import { Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { importTripEncrypted } from '../services/tripService';

export function ImportTripScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const [encryptedData, setEncryptedData] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!encryptedData.trim()) {
      Alert.alert('Data Required', 'Please paste the encrypted backup string.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Password Required', 'Please enter the decryption password for this trip.');
      return;
    }

    setLoading(true);
    try {
      const trip = await importTripEncrypted(encryptedData.trim(), password.trim());
      Alert.alert('Trip Imported', `Successfully imported "${trip.name}"!`, [
        {
          text: 'Open Trip',
          onPress: () => {
            navigation.replace('TripDetails', {
              tripId: trip.id,
              tripName: trip.name,
              tripType: trip.tripType,
            });
          },
        },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Import Failed',
        'Could not decrypt trip data. Please verify the password and backup string.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Import Trip</Text>
      <Text style={styles.screenSubtitle}>
        Paste an encrypted trip backup string to restore a trip and all its expenses offline.
      </Text>

      <Card style={styles.card}>
        <Input
          label="Decryption Password"
          placeholder="Password set during export"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.inputLabel}>Encrypted Backup String</Text>
        <TextInput
          style={styles.payloadBox}
          placeholder="Paste the Base64 encrypted string here..."
          placeholderTextColor={colors.textMuted}
          value={encryptedData}
          onChangeText={setEncryptedData}
          multiline
        />

        <Button
          title="Decrypt & Import Trip"
          loading={loading}
          onPress={handleImport}
          style={styles.importBtn}
        />
      </Card>
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
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  card: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  payloadBox: {
    height: 140,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: colors.text,
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  importBtn: {
    marginTop: 8,
  },
});
