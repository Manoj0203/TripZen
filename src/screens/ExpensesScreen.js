import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { getExpenses, getParticipants, deleteExpense } from '../services/tripService';
import { formatPaiseToRupees } from '../logic/currencyFormatter';
import { PlusIcon, EditIcon, TrashIcon, ReceiptIcon } from '../components/Icons';

export function ExpensesScreen({ route, navigation }) {
  const { tripId, tripType } = route.params;
  const isFriends = tripType === 'friends';
  const { colors } = useTheme();
  const { showAlert } = useAlert();

  const [expensesList, setExpensesList] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [expData, partData] = await Promise.all([
        getExpenses(tripId),
        getParticipants(tripId),
      ]);
      setExpensesList(expData || []);
      setParticipants(partData || []);
    } catch (e) {
      console.error(e);
    }
  }, [tripId]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadData();
    });
    loadData();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigation, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getPayerName = (payerFamilyId) => {
    const family = participants.find(p => p.id === payerFamilyId);
    return family ? family.name : 'Unknown';
  };

  const totalPaise = expensesList.reduce((sum, item) => sum + item.amountPaise, 0);

  const handleEditExpense = (item) => {
    navigation.navigate('AddExpense', {
      tripId,
      tripType,
      participants: JSON.parse(JSON.stringify(participants)),
      expense: item,
    });
  };

  const handleDeleteExpense = (item) => {
    showAlert({
      title: 'Delete Expense',
      message: `Are you sure you want to delete "${item.title}" (${formatPaiseToRupees(item.amountPaise)})?`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteExpense(item.id);
          await loadData();
        } catch (e) {
          console.error(e);
          showAlert({
            title: 'Error',
            message: 'Failed to delete expense.',
            type: 'danger',
          });
        }
      },
    });
  };

  const renderExpenseItem = ({ item }) => {
    return (
      <Card style={styles.expenseCard}>
        <View style={styles.expenseHeader}>
          <TouchableOpacity
            style={styles.titleInfo}
            activeOpacity={0.7}
            onPress={() => handleEditExpense(item)}
          >
            <Text style={[styles.expenseTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.expenseSub, { color: colors.textMuted }]}>
              Paid by <Text style={[styles.payerBold, { color: colors.text }]}>{getPayerName(item.payerFamilyId)}</Text> •{' '}
              {new Date(item.expenseDate).toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          <View style={styles.amountActionCol}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleEditExpense(item)}
            >
              <Text style={[styles.expenseAmount, { color: colors.text }]}>
                {formatPaiseToRupees(item.amountPaise)}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionButtonGroup}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                activeOpacity={0.6}
                onPress={() => handleEditExpense(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <EditIcon size={15} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                activeOpacity={0.6}
                onPress={() => handleDeleteExpense(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <TrashIcon size={15} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total spent</Text>
          <Text style={[styles.summaryAmount, { color: colors.primaryDark }]}>
            {formatPaiseToRupees(totalPaise)}
          </Text>
        </View>
        <Button
          title="Add Expense"
          icon={<PlusIcon size={14} color="#FFFFFF" />}
          size="sm"
          onPress={() =>
            navigation.navigate('AddExpense', {
              tripId,
              tripType,
              participants: JSON.parse(JSON.stringify(participants)),
            })
          }
        />
      </View>

      <FlatList
        data={expensesList}
        keyExtractor={item => item.id}
        renderItem={renderExpenseItem}
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ReceiptIcon size={44} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No expenses yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {participants.length === 0
                ? isFriends
                  ? 'Add friends first to start logging expenses.'
                  : 'Add families first to start logging expenses.'
                : 'Log your first expense to start tracking trip costs.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  expenseCard: {
    padding: 14,
    marginBottom: 10,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleInfo: {
    flex: 1,
    marginRight: 10,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  expenseSub: {
    fontSize: 12,
    marginTop: 3,
  },
  payerBold: {
    fontWeight: '700',
  },
  amountActionCol: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 5,
    borderRadius: 7,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});
