import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Switch, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { Colors, OwnerColors } from '../../constants/colors';
import { useOwnerLabels } from '../../lib/useOwnerLabels';
import { formatCurrency } from '../../lib/helpers';
import { RecurringTransaction } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { CategoryIcon } from '../../components/common/CategoryIcon';

export function RecurringScreen({ navigation }: any) {
  const ownerLabels = useOwnerLabels();
  const { household } = useAuthStore();
  const { recurringTransactions, loadRecurring, loadCategories, toggleRecurring } = useDataStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!household) return;
    setIsRefreshing(true);
    try {
      await Promise.all([loadRecurring(household.id), loadCategories(household.id)]);
    } finally {
      setIsRefreshing(false);
    }
  }, [household]);

  useEffect(() => { load(); }, [load]);

  const income = recurringTransactions.filter(r => r.type === 'income');
  const expense = recurringTransactions.filter(r => r.type === 'expense');

  const totalMonthlyExpense = expense
    .filter(r => r.is_active)
    .reduce((s, r) => s + r.amount, 0);

  const totalMonthlyIncome = income
    .filter(r => r.is_active)
    .reduce((s, r) => s + r.amount, 0);

  const renderItem = (item: RecurringTransaction) => (
    <View key={item.id} style={[styles.item, !item.is_active && styles.itemInactive]}>
      <CategoryIcon
        icon={item.category?.icon ?? 'payments'}
        color={item.category?.color ?? Colors.primary}
        size={20}
        bgSize={40}
      />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, !item.is_active && styles.nameInactive]}>
            {item.name}
          </Text>
          <View style={[styles.ownerBadge, { backgroundColor: OwnerColors[item.owner] + '20' }]}>
            <Text style={[styles.ownerText, { color: OwnerColors[item.owner] }]}>
              {ownerLabels[item.owner]}
            </Text>
          </View>
        </View>
        <Text style={styles.sub}>
          매월 {item.day_of_month}일 · {item.category?.name ?? '-'}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[
          styles.amount,
          item.type === 'income' ? { color: Colors.income } : { color: Colors.expense },
          !item.is_active && styles.nameInactive,
        ]}>
          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        <Switch
          value={item.is_active}
          onValueChange={(v) => toggleRecurring(item.id, v)}
          trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
          thumbColor={item.is_active ? Colors.primary : Colors.textTertiary}
          style={styles.switch}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>반복거래 관리</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddRecurring')} style={styles.addBtnBox}>
          <MaterialIcons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addBtn}>추가</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={load} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>월 고정수입</Text>
            <Text style={[styles.summaryAmount, { color: Colors.income }]}>
              +{formatCurrency(totalMonthlyIncome)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>월 고정지출</Text>
            <Text style={[styles.summaryAmount, { color: Colors.expense }]}>
              -{formatCurrency(totalMonthlyExpense)}
            </Text>
          </View>
        </View>

        {income.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>고정수입</Text>
            <View style={styles.list}>{income.map(renderItem)}</View>
          </View>
        )}

        {expense.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>고정지출</Text>
            <View style={styles.list}>{expense.map(renderItem)}</View>
          </View>
        )}

        {recurringTransactions.length === 0 && (
          <View style={styles.empty}>
            <MaterialIcons name="repeat" size={40} color={Colors.textTertiary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>등록된 반복거래가 없습니다</Text>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  addBtnBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addBtn: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  summary: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 4 },
  summaryAmount: { fontSize: 17, fontWeight: '800' },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 12 },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  list: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemInactive: { opacity: 0.45 },
  info: { flex: 1, marginRight: 8, marginLeft: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  nameInactive: { color: Colors.textTertiary },
  ownerBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  ownerText: { fontSize: 11, fontWeight: '600' },
  sub: { fontSize: 12, color: Colors.textTertiary },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  switch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: Colors.textTertiary },
});
