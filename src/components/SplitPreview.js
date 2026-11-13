import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { formatPaiseToRupees } from '../logic/currencyFormatter';

export function SplitPreview({ splits, familyNames = {}, isFriendsTrip = false }) {
  if (!splits || splits.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isFriendsTrip ? 'Share Per Friend' : 'Share Per Family'}
      </Text>
      {splits.map((split, index) => {
        const displayName = familyNames[split.familyId] || `Unit ${index + 1}`;
        return (
          <View key={split.familyId || index} style={styles.row}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{displayName}</Text>
              {split.weightUsed !== undefined && !isFriendsTrip ? (
                <Text style={styles.weightBadge}>
                  Weight: {(split.weightUsed / 100).toFixed(1)}x
                </Text>
              ) : null}
            </View>
            <Text style={styles.amount}>
              {formatPaiseToRupees(split.sharePaise)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  weightBadge: {
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
