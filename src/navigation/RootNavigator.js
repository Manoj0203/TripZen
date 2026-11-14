import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CreateTripScreen } from '../screens/CreateTripScreen';
import { ImportTripScreen } from '../screens/ImportTripScreen';
import { AddExpenseScreen } from '../screens/AddExpenseScreen';
import { SyncBackupModal } from '../screens/SyncBackupModal';
import { TripTabs } from './TripTabs';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBg,
        },
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          color: colors.text,
        },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateTrip"
        component={CreateTripScreen}
        options={{ title: 'New Trip', presentation: 'modal' }}
      />
      <Stack.Screen
        name="ImportTrip"
        component={ImportTripScreen}
        options={{ title: 'Import Trip', presentation: 'modal' }}
      />
      <Stack.Screen
        name="TripDetails"
        component={TripTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: 'Log Expense', presentation: 'modal' }}
      />
      <Stack.Screen
        name="SyncBackup"
        component={SyncBackupModal}
        options={{ title: 'Offline Backup', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
