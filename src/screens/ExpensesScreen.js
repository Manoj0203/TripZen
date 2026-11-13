import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { getExpenses, getParticipants, deleteExpense } from '../services/tripService';
import { formatPaiseToRupees } from '../logic/currencyFormatter';

export function ExpensesScreen({ route, navigation }) {
  const { tripId, tripType } = route.params;
  const isFriends = tripType === 'friends';

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

  const handleDeleteExpense = (item) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${item.title}" (${formatPaiseToRupees(item.amountPaise)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(item.id);
              await loadData();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete expense.');
            }
          },
        },
      ]
    );
  };

  const renderExpenseItem = ({ item }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => handleDeleteExpense(item)}
      >
        <Card style={styles.expenseCard}>
          <View style={styles.expenseHeader}>
            <View style={styles.titleInfo}>
              <Text style={styles.expenseTitle}>{item.title}</Text>
              <Text style={styles.expenseSub}>
                Paid by <Text style={styles.payerBold}>{getPayerName(item.payerFamilyId)}</Text> •{' '}
                {new Date(item.expenseDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.amountActionCol}>
              <Text style={styles.expenseAmount}>
                {formatPaiseToRupees(item.amountPaise)}
              </Text>
              <TouchableOpacity
                style={styles.deleteExpenseBtn}
                onPress={() => handleDeleteExpense(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteExpenseText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryBar}>
        <View>
          <Text style={styles.summaryLabel}>Total Trip Spend</Text>
          <Text style={styles.summaryAmount}>
            {formatPaiseToRupees(totalPaise)}
          </Text>
        </View>
        <Button
          title="+ Add Expense"
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
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Expenses Logged</Text>
            <Text style={styles.emptySubtitle}>
              {participants.length === 0
                ? isFriends
                  ? 'Add friends first to start logging expenses!'
                  : 'Add families first to start logging expenses!'
                : 'Click "+ Add Expense" above to record the first bill.'}
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
    backgroundColor: colors.background,
  },
  summaryBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 2,
  },
  list: {
    padding: 16,
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
    color: colors.text,
  },
  expenseSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  payerBold: {
    fontWeight: '700',
    color: colors.text,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  amountActionCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  deleteExpenseBtn: {
    padding: 2,
  },
  deleteExpenseText: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
