import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { importTripEncrypted } from '../services/tripService';
import { DownloadIcon } from '../components/Icons';
import { getFromClipboard } from '../utils/clipboard';

export function ImportTripScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = React.useContext(SafeAreaInsetsContext) || { top: 0, bottom: 0, left: 0, right: 0 };
  const { showAlert } = useAlert();

  const [password, setPassword] = useState('');
  const [encryptedData, setEncryptedData] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasteFromClipboard = async () => {
    try {
      const content = await getFromClipboard();
      if (content) {
        setEncryptedData(content);
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

  const handleImport = async () => {
    if (!encryptedData.trim()) {
      showAlert({
        title: 'Data Required',
        message: 'Please paste the encrypted backup string.',
        type: 'warning',
      });
      return;
    }
    if (!password.trim()) {
      showAlert({
        title: 'Password Required',
        message: 'Please enter the decryption password for this trip.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const trip = await importTripEncrypted(encryptedData.trim(), password.trim());
      showAlert({
        title: 'Trip Imported',
        message: `Successfully imported "${trip.name}"!`,
        type: 'success',
        confirmText: 'Open Trip',
        cancelText: null,
        showCancel: false,
        onConfirm: () => {
          navigation.replace('TripDetails', {
            tripId: trip.id,
            tripName: trip.name,
            tripType: trip.tripType,
          });
        },
      });
    } catch (e) {
      console.error(e);
      showAlert({
        title: 'Import Failed',
        message: 'Could not decrypt trip data. Please verify the password and backup string.',
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
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>Import Trip</Text>
        <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
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

          <TextInput
            style={[
              styles.payloadBox,
              {
                borderColor: colors.border,
                backgroundColor: colors.inputBg,
                color: colors.text,
              },
            ]}
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
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
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
  payloadBox: {
    height: 120,
    maxHeight: 140,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  importBtn: {
    marginTop: 8,
  },
});
