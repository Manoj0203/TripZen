import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { SplitPreview } from '../components/SplitPreview';
import { createExpense, updateExpense, deleteExpense } from '../services/tripService';
import { parseRupeesToPaise } from '../logic/currencyFormatter';
import { calculateWeightedSplit, calculateEqualFamilySplit } from '../logic/splitCalculator';
import { TrashIcon } from '../components/Icons';

export function AddExpenseScreen({ route, navigation }) {
  const { tripId, tripType, participants = [], expense } = route.params;
  const isFriends = tripType === 'friends';
  const isEditing = Boolean(expense && expense.id);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Expense' : 'Log Expense',
    });
  }, [navigation, isEditing]);

  const [title, setTitle] = useState(expense?.title || '');
  const [amountRupees, setAmountRupees] = useState(
    expense?.amountPaise ? (expense.amountPaise / 100).toString() : ''
  );
  const [payerFamilyId, setPayerFamilyId] = useState(
    expense?.payerFamilyId || (participants.length > 0 ? participants[0].id : null)
  );
  const [splitMode, setSplitMode] = useState(
    expense?.splitType || (isFriends ? 'equal_family' : 'weighted_members')
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Map family names for split preview
  const familyNamesMap = useMemo(() => {
    const map = {};
    participants.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [participants]);

  // Format participant families structure for split calculator
  const splitInputFamilies = useMemo(() => {
    return participants.map(p => ({
      familyId: p.id,
      members: (p.members || []).map(m => ({
        memberId: m.id,
        weight: m.defaultWeight || 100,
      })),
    }));
  }, [participants]);

  // Live Split Calculations Preview
  const liveSplits = useMemo(() => {
    if (!amountRupees || participants.length === 0) return [];
    try {
      const paise = parseRupeesToPaise(amountRupees);
      if (paise <= 0) return [];

      if (splitMode === 'equal_family') {
        return calculateEqualFamilySplit(paise, splitInputFamilies);
      } else {
        return calculateWeightedSplit(paise, splitInputFamilies);
      }
    } catch {
      return [];
    }
  }, [amountRupees, splitMode, splitInputFamilies, participants]);

  const handleSaveExpense = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter what this expense was for.');
      return;
    }

    let amountPaise;
    try {
      amountPaise = parseRupeesToPaise(amountRupees);
      if (amountPaise <= 0) throw new Error();
    } catch {
      Alert.alert('Invalid Amount', 'Please enter a valid rupee amount.');
      return;
    }

    if (!payerFamilyId) {
      Alert.alert('Required', 'Please select who paid.');
      return;
    }

    if (liveSplits.length === 0) {
      Alert.alert('Error', 'Could not calculate split.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await updateExpense({
          expenseId: expense.id,
          tripId,
          title: title.trim(),
          amountPaise,
          payerFamilyId,
          splitType: splitMode,
          splits: liveSplits,
        });
      } else {
        await createExpense({
          tripId,
          title: title.trim(),
          amountPaise,
          payerFamilyId,
          splitType: splitMode,
          splits: liveSplits,
        });
      }

      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', isEditing ? 'Failed to update expense.' : 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!isEditing) return;
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expense.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteExpense(expense.id);
              navigation.goBack();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete expense.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={styles.screenTitle}>
        {isEditing ? 'Edit Expense' : 'Add New Expense'}
      </Text>
      <Text style={styles.screenSubtitle}>
        {isEditing
          ? 'Update the details or splitting method for this bill.'
          : 'Record a payment and automatically calculate fair shares.'}
      </Text>

      <Input
        label="Expense Title"
        placeholder="e.g. Dinner, Fuel, Hotel, Tickets"
        value={title}
        onChangeText={setTitle}
      />

      <Input
        label="Amount"
        prefix="₹"
        placeholder="0.00"
        value={amountRupees}
        onChangeText={setAmountRupees}
        keyboardType="decimal-pad"
      />

      {/* Payer Selector */}
      <Text style={styles.fieldLabel}>
        {isFriends ? 'Who Paid?' : 'Which Family Paid?'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payerScroll}>
        {participants.map(p => {
          const isSelected = p.id === payerFamilyId;
          return (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.7}
              style={[styles.payerChip, isSelected && styles.payerChipSelected]}
              onPress={() => setPayerFamilyId(p.id)}
            >
              <Text style={[styles.payerChipText, isSelected && styles.payerChipTextSelected]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Split Mode Selector (only for family trips) */}
      {!isFriends ? (
        <View style={styles.splitModeSection}>
          <Text style={styles.fieldLabel}>How to Split?</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.toggleBtn,
                splitMode === 'weighted_members' && styles.toggleBtnActive,
              ]}
              onPress={() => setSplitMode('weighted_members')}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  splitMode === 'weighted_members' && styles.toggleBtnTextActive,
                ]}
              >
                Adult/Child Weight (Default)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.toggleBtn,
                splitMode === 'equal_family' && styles.toggleBtnActive,
              ]}
              onPress={() => setSplitMode('equal_family')}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  splitMode === 'equal_family' && styles.toggleBtnTextActive,
                ]}
              >
                Equal Per Family
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Real-time live split breakdown table */}
      <SplitPreview
        splits={liveSplits}
        familyNames={familyNamesMap}
        isFriendsTrip={isFriends}
      />

      <Button
        title={isEditing ? 'Update Expense' : 'Save Expense'}
        size="lg"
        loading={loading}
        onPress={handleSaveExpense}
        style={styles.saveBtn}
      />

      {isEditing ? (
        <Button
          title="Delete Expense"
          icon={<TrashIcon size={16} color={colors.danger} />}
          variant="outline"
          size="md"
          loading={deleting}
          onPress={handleDelete}
          style={styles.deleteBtn}
          textStyle={{ color: colors.danger }}
        />
      ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  payerScroll: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  payerChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 8,
  },
  payerChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  payerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  payerChipTextSelected: {
    color: '#FFFFFF',
  },
  splitModeSection: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  toggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleBtnTextActive: {
    color: colors.primaryDark,
  },
  saveBtn: {
    marginTop: 10,
  },
  deleteBtn: {
    marginTop: 12,
    borderColor: colors.danger,
  },
});
