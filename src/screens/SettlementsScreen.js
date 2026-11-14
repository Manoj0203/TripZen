import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  getSettlementDashboard,
  recordSettlement,
  getParticipants,
  deleteSettlement,
} from '../services/tripService';
import { formatPaiseToRupees } from '../logic/currencyFormatter';
import { CheckCircleIcon, ArrowRightSimple, TrashIcon } from '../components/Icons';

export function SettlementsScreen({ route, navigation }) {
  const { tripId, tripType } = route.params;
  const isFriends = tripType === 'friends';
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [dashboard, setDashboard] = useState({
    netBalances: {},
    suggestedSettlements: [],
    recordedSettlements: [],
  });
  const [participants, setParticipants] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dash, parts] = await Promise.all([
        getSettlementDashboard(tripId),
        getParticipants(tripId),
      ]);
      setDashboard(
        dash || {
          netBalances: {},
          suggestedSettlements: [],
          recordedSettlements: [],
        }
      );
      setParticipants(parts || []);
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

  const getName = (familyId) => {
    const found = participants.find(p => p.id === familyId);
    return found ? found.name : 'Unknown';
  };

  const handleSettle = (settlement) => {
    const fromName = getName(settlement.from);
    const toName = getName(settlement.to);
    const amountStr = formatPaiseToRupees(settlement.amountPaise);

    showAlert({
      title: 'Record Payment',
      message: `${fromName} pays ${amountStr} to ${toName}`,
      type: 'info',
      position: 'bottom',
      buttons: [
        {
          text: 'Mark as Settled (Cash)',
          variant: 'primary',
          onPress: async () => {
            await recordSettlement({
              tripId,
              fromFamilyId: settlement.from,
              toFamilyId: settlement.to,
              amountPaise: settlement.amountPaise,
              paymentMethod: 'cash',
            });
            await loadData();
          },
        },
        {
          text: 'Mark as Settled (Online)',
          variant: 'secondary',
          onPress: async () => {
            await recordSettlement({
              tripId,
              fromFamilyId: settlement.from,
              toFamilyId: settlement.to,
              amountPaise: settlement.amountPaise,
              paymentMethod: 'online',
            });
            await loadData();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  const { netBalances, suggestedSettlements, recordedSettlements } = dashboard;
  const participantIds = Object.keys(netBalances);

  const handleDeleteSettlement = (rec) => {
    showAlert({
      title: 'Delete Payment Record',
      message: `Undo and remove the payment of ${formatPaiseToRupees(
        rec.amountPaise
      )} from ${getName(rec.fromFamilyId)} to ${getName(rec.toFamilyId)}?`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteSettlement(rec.id);
          await loadData();
        } catch (e) {
          console.error(e);
          showAlert({
            title: 'Error',
            message: 'Failed to delete payment record.',
            type: 'danger',
          });
        }
      },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* 1. Net Balances Section */}
      <Text style={[styles.sectionHeader, { color: colors.text }]}>
        {isFriends ? 'Balances' : 'Family Balances'}
      </Text>
      <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
        Summary of who owes or is owed money
      </Text>

      {participantIds.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No expenses logged yet to calculate balances.
          </Text>
        </Card>
      ) : (
        <Card style={styles.balancesCard}>
          {participantIds.map(familyId => {
            const balPaise = netBalances[familyId] || 0;
            const isOwed = balPaise > 0;
            const isZero = balPaise === 0;

            return (
              <View
                key={familyId}
                style={[styles.balanceRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.balanceName, { color: colors.text }]}>
                  {getName(familyId)}
                </Text>
                <View
                  style={[
                    styles.balanceBadge,
                    isZero
                      ? { backgroundColor: colors.surface }
                      : isOwed
                      ? { backgroundColor: colors.successLight }
                      : { backgroundColor: colors.dangerLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.balanceBadgeText,
                      isZero
                        ? { color: colors.textMuted }
                        : isOwed
                        ? { color: colors.primaryDark }
                        : { color: colors.danger },
                    ]}
                  >
                    {isZero
                      ? 'Settled'
                      : isOwed
                      ? `+${formatPaiseToRupees(balPaise)}`
                      : `-${formatPaiseToRupees(Math.abs(balPaise))}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* 2. Suggested Settlements */}
      <Text style={[styles.sectionHeader, { marginTop: 24, color: colors.text }]}>
        Suggested Settlements
      </Text>
      <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
        Simplified payments to clear all debts
      </Text>

      {suggestedSettlements.length === 0 ? (
        <Card
          style={[
            styles.allSettledCard,
            {
              backgroundColor: colors.successLight,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.celebrationIconContainer}>
            <CheckCircleIcon size={36} color={colors.primary} />
          </View>
          <Text style={[styles.allSettledTitle, { color: colors.primaryDark }]}>
            All settled up
          </Text>
          <Text style={[styles.allSettledSub, { color: colors.textMuted }]}>
            No outstanding balances between {isFriends ? 'friends' : 'families'}.
          </Text>
        </Card>
      ) : (
        suggestedSettlements.map((settlement, index) => (
          <Card key={index} style={styles.settlementCard}>
            <View style={styles.settlementDetails}>
              <View style={styles.partiesRow}>
                <Text style={[styles.payerParty, { color: colors.danger }]}>
                  {getName(settlement.from)}
                </Text>
                <View style={[styles.arrowParty, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.paysText, { color: colors.textMuted }]}>pays</Text>
                  <ArrowRightSimple size={12} color={colors.textMuted} />
                </View>
                <Text style={[styles.receiverParty, { color: colors.primaryDark }]}>
                  {getName(settlement.to)}
                </Text>
              </View>
              <Text style={[styles.settlementAmount, { color: colors.text }]}>
                {formatPaiseToRupees(settlement.amountPaise)}
              </Text>
            </View>

            <Button
              title="Record Payment"
              size="sm"
              style={styles.settleBtn}
              onPress={() => handleSettle(settlement)}
            />
          </Card>
        ))
      )}

      {/* 3. Recorded Settlements History */}
      {recordedSettlements.length > 0 ? (
        <>
          <Text style={[styles.sectionHeader, { marginTop: 24, color: colors.text }]}>
            Payment History
          </Text>
          {recordedSettlements.map(rec => (
            <Card
              key={rec.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.historyRow}>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyTitle, { color: colors.text }]}>
                    {getName(rec.fromFamilyId)} paid {getName(rec.toFamilyId)}
                  </Text>
                  <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                    {rec.paymentMethod.toUpperCase()} •{' '}
                    {new Date(rec.settledAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.historyActionRight}>
                  <Text style={[styles.historyAmount, { color: colors.text }]}>
                    {formatPaiseToRupees(rec.amountPaise)}
                  </Text>
                  <TouchableOpacity
                    style={styles.deletePaymentBtn}
                    onPress={() => handleDeleteSettlement(rec)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <TrashIcon size={15} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 12,
    marginBottom: 10,
    marginTop: 2,
  },
  balancesCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  balanceName: {
    fontSize: 15,
    fontWeight: '600',
  },
  balanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  balanceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  allSettledCard: {
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
  },
  celebrationIconContainer: {
    marginBottom: 8,
  },
  allSettledTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  allSettledSub: {
    fontSize: 13,
    marginTop: 4,
  },
  settlementCard: {
    padding: 14,
    marginBottom: 10,
  },
  settlementDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  partiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  payerParty: {
    fontSize: 14,
    fontWeight: '700',
  },
  arrowParty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paysText: {
    fontSize: 11,
    fontWeight: '600',
  },
  receiverParty: {
    fontSize: 14,
    fontWeight: '700',
  },
  settlementAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  settleBtn: {
    marginTop: 4,
  },
  historyCard: {
    padding: 12,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    marginRight: 10,
  },
  historyActionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  deletePaymentBtn: {
    padding: 2,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 11,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
