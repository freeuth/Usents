import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useFilterStore } from '../../stores/filterStore';
import { useDataStore } from '../../stores/dataStore';
import { FilterBar } from '../../components/common/FilterBar';
import { MonthSelector } from '../../components/common/MonthSelector';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatCurrencyShort, groupBy } from '../../lib/helpers';

const { width } = Dimensions.get('window');

export function ReportScreen({ navigation }: any) {
  const { household } = useAuthStore();
  const { selectedOwner, selectedMonth, setOwner, prevMonth, nextMonth } = useFilterStore();
  const { loadTransactions, loadCategories, getFilteredTransactions, getMonthSummary } = useDataStore();

  const load = useCallback(async () => {
    if (!household) return;
    await Promise.all([
      loadCategories(household.id),
      loadTransactions(household.id, selectedMonth, selectedOwner),
    ]);
  }, [household, selectedMonth, selectedOwner]);

  useEffect(() => { load(); }, [load]);

  const transactions = getFilteredTransactions(selectedOwner);
  const summary = getMonthSummary(selectedOwner);

  // Category breakdown (expense only)
  const expenseTxs = transactions.filter(t => t.type === 'expense');
  const byCat = groupBy(expenseTxs, t => t.category?.name ?? '기타');
  const catSummary = Object.entries(byCat)
    .map(([name, txs]) => ({
      name,
      icon: txs[0]?.category?.icon ?? '💸',
      color: txs[0]?.category?.color ?? Colors.primary,
      amount: txs.reduce((s, t) => s + t.amount, 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  // Owner breakdown
  const meExpense = transactions.filter(t => t.type === 'expense' && t.owner === 'me')
    .reduce((s, t) => s + t.amount, 0);
  const spouseExpense = transactions.filter(t => t.type === 'expense' && t.owner === 'spouse')
    .reduce((s, t) => s + t.amount, 0);
  const jointExpense = transactions.filter(t => t.type === 'expense' && t.owner === 'joint')
    .reduce((s, t) => s + t.amount, 0);

  const maxOwner = Math.max(meExpense, spouseExpense, jointExpense, 1);

  const savingsRate = summary.income > 0
    ? Math.round(((summary.income - summary.expense) / summary.income) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>리포트</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <MonthSelector yearMonth={selectedMonth} onPrev={prevMonth} onNext={nextMonth} />
        <FilterBar selected={selectedOwner} onSelect={setOwner} />

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderTopColor: Colors.income }]}>
            <Text style={styles.summaryLabel}>수입</Text>
            <Text style={[styles.summaryAmount, { color: Colors.income }]}>
              {formatCurrencyShort(summary.income)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: Colors.expense }]}>
            <Text style={styles.summaryLabel}>지출</Text>
            <Text style={[styles.summaryAmount, { color: Colors.expense }]}>
              {formatCurrencyShort(summary.expense)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: Colors.primary }]}>
            <Text style={styles.summaryLabel}>저축률</Text>
            <Text style={[styles.summaryAmount, { color: Colors.primary }]}>
              {savingsRate}%
            </Text>
          </View>
        </View>

        {/* Owner breakdown */}
        {selectedOwner === 'all' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>주체별 지출</Text>
            <View style={styles.card}>
              {[
                { label: '나', amount: meExpense, color: Colors.me },
                { label: '와이프', amount: spouseExpense, color: Colors.spouse },
                { label: '공동', amount: jointExpense, color: Colors.joint },
              ].map(item => (
                <View key={item.label} style={styles.ownerRow}>
                  <Text style={styles.ownerLabel}>{item.label}</Text>
                  <View style={styles.barBg}>
                    <View style={[
                      styles.barFill,
                      {
                        width: `${(item.amount / maxOwner) * 100}%`,
                        backgroundColor: item.color,
                      },
                    ]} />
                  </View>
                  <Text style={[styles.ownerAmount, { color: item.color }]}>
                    {formatCurrencyShort(item.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category breakdown */}
        {catSummary.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>카테고리별 지출</Text>
            <View style={styles.card}>
              {catSummary.slice(0, 8).map((cat, idx) => {
                const pct = summary.expense > 0
                  ? Math.round((cat.amount / summary.expense) * 100)
                  : 0;
                return (
                  <View key={cat.name} style={styles.catRow}>
                    <Text style={styles.catRank}>{idx + 1}</Text>
                    <Text style={styles.catIcon}>{cat.icon}</Text>
                    <View style={styles.catInfo}>
                      <View style={styles.catNameRow}>
                        <Text style={styles.catName}>{cat.name}</Text>
                        <Text style={styles.catPct}>{pct}%</Text>
                      </View>
                      <View style={styles.catBarBg}>
                        <View style={[
                          styles.catBarFill,
                          { width: `${pct}%`, backgroundColor: cat.color },
                        ]} />
                      </View>
                    </View>
                    <Text style={styles.catAmount}>{formatCurrencyShort(cat.amount)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {transactions.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>이번 달 데이터가 없습니다</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  back: { fontSize: 16, color: Colors.primary, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 6 },
  summaryAmount: { fontSize: 18, fontWeight: '800' },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ownerLabel: { width: 48, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  barBg: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  ownerAmount: { width: 60, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  catRank: {
    width: 20,
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  catIcon: { fontSize: 20, marginRight: 10 },
  catInfo: { flex: 1, marginRight: 8 },
  catNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  catPct: { fontSize: 12, color: Colors.textTertiary },
  catBarBg: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  catBarFill: { height: '100%', borderRadius: 2 },
  catAmount: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },

  empty: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.textTertiary },
});
