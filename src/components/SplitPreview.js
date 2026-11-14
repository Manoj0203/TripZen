import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatPaiseToRupees } from '../logic/currencyFormatter';

export function SplitPreview({ splits, familyNames = {}, isFriendsTrip = false }) {
  const { colors } = useTheme();

  if (!splits || splits.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textMuted }]}>
        {isFriendsTrip ? 'Share Per Friend' : 'Share Per Family'}
      </Text>
      {splits.map((split, index) => {
        const displayName = familyNames[split.familyId] || `Unit ${index + 1}`;
        return (
          <View
            key={split.familyId || index}
            style={[styles.row, { borderBottomColor: colors.border }]}
          >
            <View style={styles.nameContainer}>
              <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
              {split.weightUsed !== undefined && !isFriendsTrip ? (
                <Text
                  style={[
                    styles.weightBadge,
                    {
                      color: colors.textMuted,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  Weight: {(split.weightUsed / 100).toFixed(1)}x
                </Text>
              ) : null}
            </View>
            <Text style={[styles.amount, { color: colors.primaryDark }]}>
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
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  weightBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
