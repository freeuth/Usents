import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, SectionList, StyleSheet,
  RefreshControl, Alert, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useFilterStore } from '../../stores/filterStore';
import { useDataStore } from '../../stores/dataStore';
import { FilterBar } from '../../components/common/FilterBar';
import { MonthSelector } from '../../components/common/MonthSelector';
import { OwnerBadge } from '../../components/common/OwnerBadge';
import { TransactionDetailSheet } from '../../components/sheets/TransactionDetailSheet';
import { Colors } from '../../constants/colors';
import { formatDate, formatCurrency, groupBy } from '../../lib/helpers';
import { Transaction } from '../../types';
import { MaterialIcons as MI } from '@expo/vector-icons';
import { CategoryIcon } from '../../components/common/CategoryIcon';

export function TransactionsScreen({ navigation }: any) {
  const { household } = useAuthStore();
  const { selectedOwner, selectedMonth, setOwner, prevMonth, nextMonth } = useFilterStore();
  const { loadTransactions, loadCategories, loadAccounts, loadCards, getFilteredTransactions, getMonthSummary, deleteTransaction } = useDataStore();

  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!household) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadCategories(household.id),
        loadAccounts(household.id),
        loadCards(household.id),
      ]);
      await loadTransactions(household.id, selectedMonth, selectedOwner);
    } finally {
      setIsRefreshing(false);
    }
  }, [household, selectedMonth, selectedOwner]);

  useEffect(() => { load(); }, [load]);

  const transactions = getFilteredTransactions(selectedOwner);
  const summary = getMonthSummary(selectedOwner);

  const grouped = groupBy(transactions, t => t.date);
  const sections: { title: string; data: Transaction[]; dayTotal: number }[] = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const txs = grouped[date];
      const dayTotal = txs.reduce((s, t) =>
        s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
      return { title: date, data: txs, dayTotal };
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>거래내역</Text>
      </View>

      <MonthSelector yearMonth={selectedMonth} onPrev={prevMonth} onNext={nextMonth} />
      <FilterBar selected={selectedOwner} onSelect={setOwner} />

      {/* Month summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>수입</Text>
          <Text style={[styles.summaryAmount, { color: Colors.income }]}>
            +{formatCurrency(summary.income)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>지출</Text>
          <Text style={[styles.summaryAmount, { color: Colors.expense }]}>
            -{formatCurrency(summary.expense)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>합계</Text>
          <Text style={[styles.summaryAmount, {
            color: (summary.income - summary.expense) >= 0 ? Colors.income : Colors.expense,
          }]}>
            {formatCurrency(summary.income - summary.expense, true)}
          </Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={load} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionDate}>{formatDate(section.title)}</Text>
            <Text style={[
              styles.sectionTotal,
              { color: section.dayTotal >= 0 ? Colors.income : Colors.expense },
            ]}>
              {formatCurrency(Math.abs(section.dayTotal), true)}
            </Text>
          </View>
        )}
        renderItem={({ item: tx }) => (
          <Pressable
            style={({ pressed }) => [styles.txItem, pressed && { backgroundColor: '#E5E7EB' }]}
            onPress={() => {
              Alert.alert(
                tx.memo ?? tx.category?.name ?? '거래',
                `${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}`,
                [
                  {
                    text: '수정',
                    onPress: () => { setEditTx(tx); setEditVisible(true); },
                  },
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert('삭제 확인', '이 거래를 삭제하시겠습니까?', [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '삭제', style: 'destructive',
                          onPress: async () => {
                            try { await deleteTransaction(tx.id); }
                            catch (e: any) { Alert.alert('오류', e.message); }
                          },
                        },
                      ]);
                    },
                  },
                  { text: '취소', style: 'cancel' },
                ]
              );
            }}
          >
            <CategoryIcon
              icon={tx.category?.icon ?? '💸'}
              color={tx.category?.color ?? Colors.primary}
              size={20}
              bgSize={40}
            />
            <View style={[styles.txInfo, { marginLeft: 12 }]}>
              <Text style={styles.txName} numberOfLines={1}>
                {tx.memo ?? tx.category?.name ?? '거래'}
              </Text>
              <View style={styles.txMeta}>
                {tx.card && (
                  <View style={styles.txMethodBadge}>
                    <MaterialIcons name="credit-card" size={11} color={Colors.textTertiary} />
                    <Text style={styles.txMethodText}>{tx.card.name}</Text>
                  </View>
                )}
                {tx.account && tx.payment_method_type === 'account' && (
                  <View style={styles.txMethodBadge}>
                    <MaterialIcons name="account-balance" size={11} color={Colors.textTertiary} />
                    <Text style={styles.txMethodText}>{tx.account.name}</Text>
                  </View>
                )}
                {tx.payment_method_type === 'cash' && (
                  <View style={styles.txMethodBadge}>
                    <MaterialIcons name="payments" size={11} color={Colors.textTertiary} />
                    <Text style={styles.txMethodText}>현금</Text>
                  </View>
                )}
                <OwnerBadge owner={tx.owner} />
                {tx.is_recurring && (
                  <MaterialIcons name="repeat" size={13} color={Colors.primary} />
                )}
              </View>
            </View>
            <Text style={[
              styles.txAmount,
              tx.type === 'income' ? { color: Colors.income } : { color: Colors.expense },
            ]}>
              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>이번 달 거래 내역이 없습니다</Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TransactionDetailSheet
        transaction={editTx}
        visible={editVisible}
        onClose={() => { setEditVisible(false); setTimeout(() => setEditTx(null), 300); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 4 },
  summaryAmount: { fontSize: 14, fontWeight: '700' },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  sectionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sectionTotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 13,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 2,
    borderRadius: 12,
  },
  txInfo: { flex: 1, marginRight: 4 },
  txName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 5,
  },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  txMethodBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  txMethodText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  empty: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
});
