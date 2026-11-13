import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { exportTripEncrypted } from '../services/tripService';

export function SyncBackupModal({ route, navigation }) {
  const { tripId, tripName } = route.params;

  const [password, setPassword] = useState('');
  const [encryptedPayload, setEncryptedPayload] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerateBackup = async () => {
    if (!password.trim()) {
      Alert.alert('Password Required', 'Please enter a password to protect this backup.');
      return;
    }

    setLoading(true);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Offline Backup & Sync</Text>
      <Text style={styles.screenSubtitle}>
        Share or backup trip "{tripName}" safely without an internet connection using AES-256 encryption.
      </Text>

      <Card style={styles.card}>
        <Text style={styles.cardHeader}>Export & Share Trip</Text>
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
                value={encryptedPayload.substring(0, 300)} // compact visual representation
                size={180}
                color={colors.text}
                backgroundColor="#FFFFFF"
              />
            </View>

            <Text style={styles.resultLabel}>Encrypted Backup String:</Text>
            <TextInput
              style={styles.payloadBox}
              value={encryptedPayload}
              editable={false}
              multiline
            />
            <Text style={styles.helperText}>
              Copy this string to backup your data into a text file or notes app.
            </Text>
          </View>
        ) : null}
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
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
    lineHeight: 18,
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
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
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
  payloadBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    fontSize: 11,
    color: colors.textMuted,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
