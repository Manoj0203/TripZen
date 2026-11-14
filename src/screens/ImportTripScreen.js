import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { importTripEncrypted } from '../services/tripService';
import { DownloadIcon } from '../components/Icons';
import { getFromClipboard } from '../utils/clipboard';

export function ImportTripScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const [encryptedData, setEncryptedData] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasteFromClipboard = async () => {
    try {
      const content = await getFromClipboard();
      if (content) {
        setEncryptedData(content);
      } else {
        Alert.alert('Clipboard Empty', 'No text found in clipboard.');
      }
    } catch (e) {
      console.error(e);
    }
  };

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={styles.keyboardContainer}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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

          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Encrypted Backup String</Text>
            <TouchableOpacity
              style={styles.pasteChip}
              onPress={handlePasteFromClipboard}
              activeOpacity={0.65}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.pasteChipText}>Paste from Clipboard</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.payloadBox}
            placeholder="Paste the Base64 encrypted string here..."
            placeholderTextColor={colors.textMuted}
            value={encryptedData}
            onChangeText={setEncryptedData}
            multiline
            numberOfLines={4}
          />

          <Button
            title="Decrypt & Import Trip"
            icon={<DownloadIcon size={16} color="#FFFFFF" />}
            loading={loading}
            onPress={handleImport}
            style={styles.importBtn}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  labelRow: {
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
  payloadBox: {
    height: 120,
    maxHeight: 140,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    color: colors.text,
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  importBtn: {
    marginTop: 8,
  },
});
