import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { ParticipantsScreen } from '../screens/ParticipantsScreen';
import { SettlementsScreen } from '../screens/SettlementsScreen';
import { colors } from '../theme/colors';
import { CreditCardIcon, FamilyIcon, UsersIcon, ScaleIcon, SyncIcon } from '../components/Icons';

const Tab = createBottomTabNavigator();

export function TripTabs({ route, navigation }) {
  const { tripId, tripName, tripType = 'families' } = route.params;
  const isFriends = tripType === 'friends';

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '800',
          color: colors.text,
        },
        headerRight: () => (
          <TouchableOpacity
            style={styles.backupHeaderBtn}
            onPress={() => navigation.navigate('SyncBackup', { tripId, tripName })}
            activeOpacity={0.7}
          >
            <SyncIcon size={14} color={colors.secondary} style={{ marginRight: 5 }} />
            <Text style={styles.backupHeaderText}>Sync / QR</Text>
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.border,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
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
          title: tripName || 'Expenses',
          tabBarLabel: 'Expenses',
          tabBarIcon: ({ color }) => <CreditCardIcon size={20} color={color} />,
        }}
      />

      <Tab.Screen
        name="Participants"
        component={ParticipantsScreen}
        initialParams={{ tripId, tripName, tripType }}
        options={{
          title: isFriends ? 'Friends' : 'Families',
          tabBarLabel: isFriends ? 'Friends' : 'Families',
          tabBarIcon: ({ color }) => (
            isFriends ? <UsersIcon size={20} color={color} /> : <FamilyIcon size={20} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Settlements"
        component={SettlementsScreen}
        initialParams={{ tripId, tripName, tripType }}
        options={{
          title: 'Settlement Dashboard',
          tabBarLabel: 'Settlements',
          tabBarIcon: ({ color }) => <ScaleIcon size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  backupHeaderBtn: {
    marginRight: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backupHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
});
