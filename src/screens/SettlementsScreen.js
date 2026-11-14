import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { getSettlementDashboard, recordSettlement, getParticipants, deleteSettlement } from '../services/tripService';
import { formatPaiseToRupees } from '../logic/currencyFormatter';
import { CheckCircleIcon, ArrowRightSimple, TrashIcon } from '../components/Icons';

export function SettlementsScreen({ route, navigation }) {
  const { tripId, tripType } = route.params;
  const isFriends = tripType === 'friends';

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
      setDashboard(dash || {
        netBalances: {},
        suggestedSettlements: [],
        recordedSettlements: [],
      });
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

    Alert.alert(
      'Confirm Settlement',
      `Record payment of ${amountStr} from ${fromName} to ${toName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Settled (Cash)',
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
      ]
    );
  };

  const { netBalances, suggestedSettlements, recordedSettlements } = dashboard;
  const participantIds = Object.keys(netBalances);

  const handleDeleteSettlement = (rec) => {
    Alert.alert(
      'Delete Payment Record',
      `Undo and remove the payment of ${formatPaiseToRupees(rec.amountPaise)} from ${getName(rec.fromFamilyId)} to ${getName(rec.toFamilyId)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSettlement(rec.id);
              await loadData();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete payment record.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.sectionHeader}>Net Balances</Text>
      <Text style={styles.sectionSub}>Overall financial standing for each participant</Text>

      {participantIds.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No balances to display yet.</Text>
        </Card>
      ) : (
        <Card style={styles.balancesCard}>
          {participantIds.map(id => {
            const bal = netBalances[id] || 0;
            const isPositive = bal > 0;
            const isZero = bal === 0;

            return (
              <View key={id} style={styles.balanceRow}>
                <Text style={styles.balanceName}>{getName(id)}</Text>
                <View
                  style={[
                    styles.balanceBadge,
                    isZero
                      ? styles.badgeSettled
                      : isPositive
                      ? styles.badgeOwed
                      : styles.badgeOwes,
                  ]}
                >
                  <Text
                    style={[
                      styles.balanceBadgeText,
                      isZero
                        ? styles.textSettled
                        : isPositive
                        ? styles.textOwed
                        : styles.textOwes,
                    ]}
                  >
                    {isZero
                      ? 'Settled'
                      : isPositive
                      ? `gets back ${formatPaiseToRupees(bal)}`
                      : `owes ${formatPaiseToRupees(-bal)}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Suggested Simplified Settlements */}
      <Text style={[styles.sectionHeader, { marginTop: 20 }]}>
        Simplified Settlements (Min-Cash-Flow)
      </Text>
      <Text style={styles.sectionSub}>Fewest payments needed to clear all debts</Text>

      {suggestedSettlements.length === 0 ? (
        <Card style={styles.allSettledCard}>
          <View style={styles.celebrationIconContainer}>
            <CheckCircleIcon size={36} color={colors.primary} />
          </View>
          <Text style={styles.allSettledTitle}>All Settled Up!</Text>
          <Text style={styles.allSettledSub}>
            Nobody owes any money. Everyone is square!
          </Text>
        </Card>
      ) : (
        suggestedSettlements.map((s, idx) => (
          <Card key={idx} style={styles.settlementCard}>
            <View style={styles.settlementDetails}>
              <View style={styles.partiesRow}>
                <Text style={styles.payerParty}>{getName(s.from)}</Text>
                <View style={styles.arrowParty}>
                  <Text style={styles.paysText}>pays</Text>
                  <ArrowRightSimple size={14} color={colors.textMuted} />
                </View>
                <Text style={styles.receiverParty}>{getName(s.to)}</Text>
              </View>
              <Text style={styles.settlementAmount}>
                {formatPaiseToRupees(s.amountPaise)}
              </Text>
            </View>
            <Button
              title="Mark as Settled"
              size="sm"
              variant="outline"
              style={styles.settleBtn}
              onPress={() => handleSettle(s)}
            />
          </Card>
        ))
      )}

      {/* History of Past Recorded Settlements */}
      {recordedSettlements.length > 0 ? (
        <>
          <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Payment History</Text>
          {recordedSettlements.map(rec => (
            <Card key={rec.id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>
                    {getName(rec.fromFamilyId)} paid {getName(rec.toFamilyId)}
                  </Text>
                  <Text style={styles.historyDate}>
                    {rec.paymentMethod.toUpperCase()} •{' '}
                    {new Date(rec.settledAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.historyActionRight}>
                  <Text style={styles.historyAmount}>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.textMuted,
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
    borderBottomColor: '#F1F5F9',
  },
  balanceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  balanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeOwed: {
    backgroundColor: '#DCFCE7',
  },
  badgeOwes: {
    backgroundColor: '#FEE2E2',
  },
  badgeSettled: {
    backgroundColor: '#F1F5F9',
  },
  balanceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textOwed: {
    color: '#15803D',
  },
  textOwes: {
    color: '#B91C1C',
  },
  textSettled: {
    color: colors.textMuted,
  },
  allSettledCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  celebrationIconContainer: {
    marginBottom: 8,
  },
  allSettledTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  allSettledSub: {
    fontSize: 13,
    color: colors.textMuted,
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
    color: '#B91C1C',
  },
  arrowParty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paysText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  receiverParty: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
  },
  settlementAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginLeft: 8,
  },
  settleBtn: {
    marginTop: 4,
  },
  historyCard: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
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
  deletePaymentText: {
    fontSize: 12,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  historyDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
