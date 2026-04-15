import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useFilterStore } from '../../stores/filterStore';
import { useDataStore } from '../../stores/dataStore';
import { FilterBar } from '../../components/common/FilterBar';
import { OwnerBadge } from '../../components/common/OwnerBadge';
import { Colors, OwnerColors } from '../../constants/colors';
import { formatCurrency } from '../../lib/helpers';
import { ACCOUNT_TYPE_LABELS, CARD_TYPE_LABELS } from '../../constants/categories';
import { MaterialIcons } from '@expo/vector-icons';
import { Account, Card } from '../../types';

type TabType = 'accounts' | 'cards';

export function AccountsScreen({ navigation }: any) {
  const { household } = useAuthStore();
  const { selectedOwner, selectedMonth, setOwner } = useFilterStore();
  const {
    accounts, cards,
    loadAccounts, loadCards,
    getCardForecast, getAccountForecast,
  } = useDataStore();

  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!household) return;
    setIsRefreshing(true);
    try {
      await Promise.all([loadAccounts(household.id), loadCards(household.id)]);
    } finally {
      setIsRefreshing(false);
    }
  }, [household]);

  useEffect(() => { load(); }, [load]);

  const filteredAccounts = selectedOwner === 'all'
    ? accounts
    : accounts.filter(a => a.owner === selectedOwner);

  const filteredCards = selectedOwner === 'all'
    ? cards
    : cards.filter(c => c.owner === selectedOwner);

  const totalBalance = filteredAccounts.reduce((s, a) => s + a.current_balance, 0);
  const totalCardDue = filteredCards.reduce((sum, c) => {
    const f = getCardForecast(c.id, selectedMonth);
    return sum + (f?.forecastPaymentAmount ?? 0);
  }, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>통장 · 카드</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate(activeTab === 'accounts' ? 'AddAccount' : 'AddCard')}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ 추가</Text>
        </TouchableOpacity>
      </View>

      <FilterBar selected={selectedOwner} onSelect={setOwner} />

      {/* Tab */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'accounts' && styles.tabActive]}
          onPress={() => setActiveTab('accounts')}
        >
          <Text style={[styles.tabText, activeTab === 'accounts' && styles.tabTextActive]}>
            통장 ({filteredAccounts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cards' && styles.tabActive]}
          onPress={() => setActiveTab('cards')}
        >
          <Text style={[styles.tabText, activeTab === 'cards' && styles.tabTextActive]}>
            카드 ({filteredCards.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={load} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Summary banner */}
        {activeTab === 'accounts' ? (
          <View style={styles.banner}>
            <Text style={styles.bannerLabel}>전체 잔액</Text>
            <Text style={styles.bannerAmount}>{formatCurrency(totalBalance)}</Text>
          </View>
        ) : (
          <View style={[styles.banner, { backgroundColor: Colors.warning + '15' }]}>
            <Text style={styles.bannerLabel}>이번 달 카드 결제 예정</Text>
            <Text style={[styles.bannerAmount, { color: Colors.warning }]}>
              {formatCurrency(totalCardDue)}
            </Text>
          </View>
        )}

        {/* Account list */}
        {activeTab === 'accounts' && filteredAccounts.map(account => {
          const forecast = getAccountForecast(account.id, selectedMonth);
          return (
            <TouchableOpacity
              key={account.id}
              style={[styles.card, forecast?.isWarning && styles.cardWarning]}
              onPress={() => navigation.navigate('AccountDetail', { accountId: account.id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardRow}>
                <View style={[styles.ownerDot, { backgroundColor: OwnerColors[account.owner] }]} />
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardName}>{account.name}</Text>
                    <OwnerBadge owner={account.owner} />
                  </View>
                  <Text style={styles.cardSubtitle}>
                    {account.bank_name} · {ACCOUNT_TYPE_LABELS[account.account_type]}
                  </Text>
                </View>
                <Text style={styles.cardAmount}>{formatCurrency(account.current_balance)}</Text>
              </View>
              {forecast && (
                <View style={styles.forecastRow}>
                  <Text style={styles.forecastItem}>
                    예정 입금 <Text style={{ color: Colors.income }}>+{formatCurrency(forecast.plannedIncome + forecast.upcomingRecurringIncome)}</Text>
                  </Text>
                  <Text style={styles.forecastItem}>
                    예정 출금 <Text style={{ color: Colors.expense }}>-{formatCurrency(forecast.plannedExpense + forecast.cardPayments + forecast.upcomingRecurringExpense)}</Text>
                  </Text>
                  <Text style={[styles.forecastItem, forecast.isWarning && { color: Colors.danger }]}>
                    월말 예상 <Text style={{ fontWeight: '700' }}>{formatCurrency(forecast.forecastBalance)}</Text>
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Card list */}
        {activeTab === 'cards' && filteredCards.map(card => {
          const forecast = getCardForecast(card.id, selectedMonth);
          return (
            <TouchableOpacity
              key={card.id}
              style={styles.card}
              onPress={() => navigation.navigate('CardDetail', { cardId: card.id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardRow}>
                <View style={[styles.ownerDot, { backgroundColor: OwnerColors[card.owner] }]} />
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="credit-card" size={16} color={Colors.textSecondary} />
                      <Text style={styles.cardName}>{card.name}</Text>
                    </View>
                    <OwnerBadge owner={card.owner} />
                  </View>
                  <Text style={styles.cardSubtitle}>
                    {CARD_TYPE_LABELS[card.card_type]} · 매월 {card.payment_day}일 결제
                    {card.linked_account && ` · ${card.linked_account.name}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardAmountSmall}>이번 달 사용</Text>
                  <Text style={[styles.cardAmount, { color: Colors.expense }]}>
                    {formatCurrency(forecast?.usageAmount ?? 0)}
                  </Text>
                </View>
              </View>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastItem}>
                  결제 예정일 <Text style={{ fontWeight: '600' }}>{forecast?.paymentDate ?? '-'}</Text>
                </Text>
                <Text style={[styles.forecastItem, { color: Colors.warning }]}>
                  결제 예정액 <Text style={{ fontWeight: '700' }}>{formatCurrency(forecast?.forecastPaymentAmount ?? 0)}</Text>
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {activeTab === 'accounts' && filteredAccounts.length === 0 && (
          <View style={styles.empty}>
            <MaterialIcons name="account-balance" size={40} color={Colors.textTertiary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>등록된 통장이 없습니다</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddAccount')}>
              <Text style={styles.emptyBtnText}>통장 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}
        {activeTab === 'cards' && filteredCards.length === 0 && (
          <View style={styles.empty}>
            <MaterialIcons name="credit-card" size={40} color={Colors.textTertiary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>등록된 카드가 없습니다</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddCard')}>
              <Text style={styles.emptyBtnText}>카드 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  addBtn: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  tabTextActive: { fontWeight: '700', color: Colors.textPrimary },

  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: Colors.primary + '10',
    borderRadius: 14,
  },
  bannerLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  bannerAmount: { fontSize: 24, fontWeight: '800', color: Colors.primary },

  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardWarning: { borderWidth: 1, borderColor: '#FED7AA' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  ownerDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, flexShrink: 0 },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  cardSubtitle: { fontSize: 12, color: Colors.textSecondary },
  cardAmount: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  cardAmountSmall: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },

  forecastRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 12,
    flexWrap: 'wrap',
  },
  forecastItem: { fontSize: 12, color: Colors.textSecondary },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, marginBottom: 16 },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
