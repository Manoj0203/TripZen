import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../context/AlertContext';
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
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();

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
      showAlert({
        title: 'Required',
        message: 'Please enter what this expense was for.',
        type: 'warning',
      });
      return;
    }

    let amountPaise;
    try {
      amountPaise = parseRupeesToPaise(amountRupees);
      if (amountPaise <= 0) throw new Error();
    } catch {
      showAlert({
        title: 'Invalid Amount',
        message: 'Please enter a valid rupee amount.',
        type: 'warning',
      });
      return;
    }

    if (!payerFamilyId) {
      showAlert({
        title: 'Required',
        message: 'Please select who paid.',
        type: 'warning',
      });
      return;
    }

    if (liveSplits.length === 0) {
      showAlert({
        title: 'Error',
        message: 'Could not calculate split.',
        type: 'danger',
      });
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
      showAlert({
        title: 'Error',
        message: isEditing ? 'Failed to update expense.' : 'Failed to save expense.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!isEditing) return;
    showAlert({
      title: 'Delete Expense',
      message: `Are you sure you want to delete "${expense.title}"?`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setDeleting(true);
        try {
          await deleteExpense(expense.id);
          navigation.goBack();
        } catch (e) {
          console.error(e);
          showAlert({
            title: 'Error',
            message: 'Failed to delete expense.',
            type: 'danger',
          });
        } finally {
          setDeleting(false);
        }
      },
    });
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
        <Text style={[styles.screenTitle, { color: colors.text }]}>
          {isEditing ? 'Edit Expense' : 'Log a New Expense'}
        </Text>
        <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
          Record who paid and verify the offline split calculations.
        </Text>

        {/* 1. Title Input */}
        <Input
          label="What was this expense for?"
          placeholder="e.g. Seafood Dinner, Fuel, Airbnb stay"
          value={title}
          onChangeText={setTitle}
        />

        {/* 2. Amount Input */}
        <Input
          label="Amount (in Rupees)"
          placeholder="0.00"
          prefix="₹"
          keyboardType="decimal-pad"
          value={amountRupees}
          onChangeText={setAmountRupees}
        />

        {/* 3. Who Paid? */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {isFriends ? 'Who paid for this?' : 'Which family paid?'}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.payerScroll}
        >
          {participants.map(p => {
            const isSelected = p.id === payerFamilyId;
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.7}
                style={[
                  styles.payerChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setPayerFamilyId(p.id)}
              >
                <Text
                  style={[
                    styles.payerChipText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.text,
                    },
                  ]}
                >
                  {p.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. Split Mode Selector */}
        {!isFriends ? (
          <View style={styles.splitModeSection}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Split Strategy</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                  splitMode === 'weighted_members' && [
                    styles.toggleBtnActive,
                    {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryLight,
                    },
                  ],
                ]}
                onPress={() => setSplitMode('weighted_members')}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: colors.textMuted },
                    splitMode === 'weighted_members' && [
                      styles.toggleBtnTextActive,
                      { color: colors.primaryDark },
                    ],
                  ]}
                >
                  Adult/Child Weight
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                  splitMode === 'equal_family' && [
                    styles.toggleBtnActive,
                    {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryLight,
                    },
                  ],
                ]}
                onPress={() => setSplitMode('equal_family')}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: colors.textMuted },
                    splitMode === 'equal_family' && [
                      styles.toggleBtnTextActive,
                      { color: colors.primaryDark },
                    ],
                  ]}
                >
                  Equal per Family
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
            style={[styles.deleteBtn, { borderColor: colors.danger }]}
            textStyle={{ color: colors.danger }}
          />
        ) : null}
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
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
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
    borderWidth: 1.5,
    marginRight: 8,
  },
  payerChipText: {
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {},
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleBtnTextActive: {},
  saveBtn: {
    marginTop: 10,
  },
  deleteBtn: {
    marginTop: 12,
  },
});
