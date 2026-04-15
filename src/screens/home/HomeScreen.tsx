import React, { useEffect, useCallback, useState } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useFilterStore } from '../../stores/filterStore';
import { useDataStore } from '../../stores/dataStore';
import { FilterBar } from '../../components/common/FilterBar';
import { MonthSelector } from '../../components/common/MonthSelector';
import { AccountCard } from '../../components/home/AccountCard';
import { RecentTransactions } from '../../components/home/RecentTransactions';
import { TransactionDetailSheet } from '../../components/sheets/TransactionDetailSheet';
import { Colors } from '../../constants/colors';
import { Transaction } from '../../types';
import { formatCurrency, formatCurrencyShort } from '../../lib/helpers';
import { MaterialIcons } from '@expo/vector-icons';

export function HomeScreen({ navigation }: any) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const { household, member } = useAuthStore();
  const { selectedOwner, selectedMonth, setOwner, prevMonth, nextMonth } = useFilterStore();
  const {
    accounts, cards,
    loadAccounts, loadCards, loadTransactions, loadRecurring, loadCategories,
    generateMonthlyRecurring, getMonthSummary, getAccountForecast, getCardForecast,
    getFilteredTransactions,
  } = useDataStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!household) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadAccounts(household.id),
        loadCards(household.id),
        loadCategories(household.id),
        loadRecurring(household.id),
      ]);
      await loadTransactions(household.id, selectedMonth, selectedOwner);
      await generateMonthlyRecurring(household.id, selectedMonth);
    } finally {
      setIsRefreshing(false);
    }
  }, [household, selectedMonth, selectedOwner]);

  useEffect(() => { load(); }, [load]);

  const summary = getMonthSummary(selectedOwner);

  const filteredAccounts = selectedOwner === 'all'
    ? accounts
    : accounts.filter(a => a.owner === selectedOwner);

  const totalBalance = filteredAccounts.reduce((s, a) => s + a.current_balance, 0);

  const cardPaymentDue = cards
    .filter(c => selectedOwner === 'all' || c.owner === selectedOwner)
    .reduce((sum, c) => {
      const forecast = getCardForecast(c.id, selectedMonth);
      return sum + (forecast?.forecastPaymentAmount ?? 0);
    }, 0);

  const recentTx = getFilteredTransactions(selectedOwner).slice(0, 5);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={load} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Usents</Text>
          <TouchableOpacity onPress={() => navigation.navigate('More')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="settings" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <MonthSelector yearMonth={selectedMonth} onPrev={prevMonth} onNext={nextMonth} />
        <FilterBar selected={selectedOwner} onSelect={setOwner} />

        {/* Total balance hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>총 잔액</Text>
          <Text style={styles.heroAmount}>{formatCurrency(totalBalance)}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroItem}>
              <Text style={styles.heroItemLabel}>수입</Text>
              <Text style={[styles.heroItemAmount, { color: Colors.income }]}>
                {formatCurrencyShort(summary.income)}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroItem}>
              <Text style={styles.heroItemLabel}>지출</Text>
              <Text style={[styles.heroItemAmount, { color: Colors.expense }]}>
                {formatCurrencyShort(summary.expense)}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroItem}>
              <Text style={styles.heroItemLabel}>카드결제 예정</Text>
              <Text style={[styles.heroItemAmount, { color: Colors.warning }]}>
                {formatCurrencyShort(cardPaymentDue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Account cards */}
        {filteredAccounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>통장 현황</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {filteredAccounts.map(account => {
                const forecast = getAccountForecast(account.id, selectedMonth);
                return (
                  <AccountCard
                    key={account.id}
                    account={account}
                    forecast={forecast}
                    onPress={() => navigation.navigate('AccountDetail', { accountId: account.id })}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Warning accounts */}
        {filteredAccounts.some(a => getAccountForecast(a.id, selectedMonth)?.isWarning) && (
          <View style={styles.warningBanner}>
            <MaterialIcons name="warning" size={18} color="#92400E" style={{ marginRight: 8 }} />
            <Text style={styles.warningText}>
              월말 잔액 부족이 예상되는 통장이 있습니다
            </Text>
          </View>
        )}

        {/* Recent transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 거래</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAll}>전체보기</Text>
            </TouchableOpacity>
          </View>
          <RecentTransactions
            transactions={recentTx}
            onPress={(tx) => { setSelectedTx(tx); setDetailVisible(true); }}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TransactionDetailSheet
        transaction={selectedTx}
        visible={detailVisible}
        onClose={() => { setDetailVisible(false); setSelectedTx(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },

  heroCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  heroItem: { flex: 1, alignItems: 'center' },
  heroItemLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  heroItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },

  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  horizontalScroll: { paddingLeft: 16 },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
  },
});
