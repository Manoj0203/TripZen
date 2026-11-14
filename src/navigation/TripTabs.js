import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { ParticipantsScreen } from '../screens/ParticipantsScreen';
import { SettlementsScreen } from '../screens/SettlementsScreen';
import { useTheme } from '../theme/ThemeContext';
import {
  CreditCardIcon,
  FamilyIcon,
  UsersIcon,
  ScaleIcon,
  SyncIcon,
  ChevronLeftIcon,
} from '../components/Icons';

const Tab = createBottomTabNavigator();

export function TripTabs({ route, navigation }) {
  const { tripId, tripName, tripType = 'families' } = route.params;
  const isFriends = tripType === 'friends';
  const { colors } = useTheme();
  const insets = React.useContext(SafeAreaInsetsContext) || { top: 0, bottom: 0, left: 0, right: 0 };
  const bottomInset = Math.max(insets.bottom, 6);

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitle: () => (
          <View style={styles.titleContainer}>
            <Text style={[styles.tripTitleText, { color: colors.text }]} numberOfLines={1}>
              {tripName || 'Trip Details'}
            </Text>
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: isFriends ? colors.secondaryLight : colors.primaryLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgePillText,
                  {
                    color: isFriends ? colors.secondary : colors.primaryDark,
                  },
                ]}
              >
                {isFriends ? 'Friends' : 'Family'}
              </Text>
            </View>
          </View>
        ),
        headerLeft: () => (
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeftIcon size={20} color={colors.text} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={styles.rightActionsRow}>
            {/* Sync / Backup Button */}
            <TouchableOpacity
              style={[styles.backupHeaderBtn, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('SyncBackup', { tripId, tripName })}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SyncIcon size={14} color={colors.secondary} style={{ marginRight: 5 }} />
              <Text style={[styles.backupHeaderText, { color: colors.secondary }]}>
                Sync
              </Text>
            </TouchableOpacity>
          </View>
        ),
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: bottomInset,
          height: 54 + bottomInset,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        initialParams={{ tripId, tripName, tripType }}
        options={{
          tabBarLabel: 'Expenses',
          tabBarIcon: ({ color }) => <CreditCardIcon size={20} color={color} />,
        }}
      />

      <Tab.Screen
        name="Participants"
        component={ParticipantsScreen}
        initialParams={{ tripId, tripName, tripType }}
        options={{
          tabBarLabel: isFriends ? 'Friends' : 'Families',
          tabBarIcon: ({ color }) =>
            isFriends ? (
              <UsersIcon size={20} color={color} />
            ) : (
              <FamilyIcon size={20} color={color} />
            ),
        }}
      />

      <Tab.Screen
        name="Settlements"
        component={SettlementsScreen}
        initialParams={{ tripId, tripName, tripType }}
        options={{
          tabBarLabel: 'Settlements',
          tabBarIcon: ({ color }) => <ScaleIcon size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    marginLeft: 14,
    padding: 6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 220,
    gap: 8,
  },
  tripTitleText: {
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  backupHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backupHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
