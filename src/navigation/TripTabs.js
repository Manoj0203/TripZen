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

  const renderHeaderTitle = (title) => (
    <View style={styles.headerTitleContainer}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.headerSubtitleRow}>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
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
    </View>
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleAlign: 'left',
        headerLeft: () => (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeftIcon size={24} color={colors.primary} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={styles.rightActionsRow}>
            {/* Sync / Backup Button */}
            <TouchableOpacity
              style={styles.backupHeaderBtn}
              onPress={() => navigation.navigate('SyncBackup', { tripId, tripName })}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <SyncIcon size={16} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.backupHeaderText, { color: colors.primary }]}>
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
          headerTitle: () => renderHeaderTitle('Expenses'),
          tabBarIcon: ({ color }) => <CreditCardIcon size={20} color={color} />,
        }}
      />

      <Tab.Screen
        name="Participants"
        component={ParticipantsScreen}
        initialParams={{ tripId, tripName, tripType }}
        options={{
          tabBarLabel: isFriends ? 'Friends' : 'Families',
          headerTitle: () => renderHeaderTitle(isFriends ? 'Friends' : 'Families'),
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
          headerTitle: () => renderHeaderTitle('Settlements'),
          tabBarIcon: ({ color }) => <ScaleIcon size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    marginLeft: 16,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    justifyContent: 'center',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 170,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  backupHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backupHeaderText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
