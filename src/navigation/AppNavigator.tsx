import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SetupHouseholdScreen } from '../screens/auth/SetupHouseholdScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { AddAccountScreen } from '../screens/accounts/AddAccountScreen';
import { AddCardScreen } from '../screens/accounts/AddCardScreen';
import { MoreScreen } from '../screens/more/MoreScreen';
import { RecurringScreen } from '../screens/more/RecurringScreen';
import { ReportScreen } from '../screens/more/ReportScreen';
import { CategoriesScreen } from '../screens/more/CategoriesScreen';
import { HouseholdSettingsScreen } from '../screens/more/HouseholdSettingsScreen';
import { ProfileSettingsScreen } from '../screens/more/ProfileSettingsScreen';
import { AddRecurringScreen } from '../screens/more/AddRecurringScreen';
import { AccountDetailScreen } from '../screens/accounts/AccountDetailScreen';
import { CardDetailScreen } from '../screens/accounts/CardDetailScreen';
import { TransactionSheet } from '../components/sheets/TransactionSheet';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Tab Navigator ───────────────────────────────────────────

function MainTabs() {
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: '홈',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{
            tabBarLabel: '거래',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="receipt-long" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Add"
          component={HomeScreen}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setSheetVisible(true);
            },
          }}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => (
              <View style={styles.fabIcon}>
                <MaterialIcons name="add" size={28} color="#fff" />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Accounts"
          component={AccountsScreen}
          options={{
            tabBarLabel: '통장·카드',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="account-balance" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="More"
          component={MoreScreen}
          options={{
            tabBarLabel: '더보기',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="more-horiz" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>

      {/* Global FAB Bottom Sheet */}
      {sheetVisible && (
        <TransactionSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onSuccess={() => setSheetVisible(false)}
        />
      )}
    </>
  );
}

// ─── Auth Stack ──────────────────────────────────────────────

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SetupHousehold" component={SetupHouseholdScreen} />
    </Stack.Navigator>
  );
}

// ─── Main App Stack ──────────────────────────────────────────

function PlaceholderScreen({ route, navigation }: any) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
      <Text style={{ fontSize: 16, color: Colors.textSecondary, marginBottom: 20 }}>
        {route.name} — 준비 중
      </Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ color: Colors.primary, fontWeight: '600' }}>돌아가기</Text>
      </TouchableOpacity>
    </View>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="AddAccount" component={AddAccountScreen} />
      <Stack.Screen name="AddCard" component={AddCardScreen} />
      <Stack.Screen name="Recurring" component={RecurringScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="HouseholdSettings" component={HouseholdSettingsScreen} />
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen name="AddRecurring" component={AddRecurringScreen} />
      <Stack.Screen name="AccountDetail" component={AccountDetailScreen} />
      <Stack.Screen name="CardDetail" component={CardDetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Root Navigator ──────────────────────────────────────────

export function AppNavigator() {
  const { session, household, isLoading, isInitialized, initialize, setSession } = useAuthStore();

  useEffect(() => {
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        useAuthStore.getState().loadHousehold(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isInitialized) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingLogo}>Usents</Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  // Determine which stack to show
  const showAuth = !session;
  const showSetup = session && !household;

  return (
    <NavigationContainer>
      {showAuth ? (
        <AuthStack />
      ) : showSetup ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="SetupHousehold" component={SetupHouseholdScreen} />
        </Stack.Navigator>
      ) : (
        <AppStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingLogo: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1,
  },
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
    height: 72,
    paddingBottom: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  fabIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
