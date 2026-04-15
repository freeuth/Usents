import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Transaction } from '../../types';
import { Colors } from '../../constants/colors';
import { OwnerBadge } from '../common/OwnerBadge';
import { CategoryIcon } from './../../components/common/CategoryIcon';
import { formatDateShort, formatCurrency } from '../../lib/helpers';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onPress: (tx: Transaction) => void;
}

export function RecentTransactions({ transactions, onPress }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>아직 거래 내역이 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {transactions.map(tx => (
        <TouchableOpacity
          key={tx.id}
          style={styles.item}
          onPress={() => onPress(tx)}
          activeOpacity={0.7}
        >
          <CategoryIcon
            icon={tx.category?.icon ?? '💸'}
            color={tx.category?.color ?? Colors.primary}
            size={20}
            bgSize={40}
          />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {tx.memo ?? tx.category?.name ?? '거래'}
            </Text>
            <View style={styles.meta}>
              <Text style={styles.date}>{formatDateShort(tx.date)}</Text>
              <OwnerBadge owner={tx.owner} />
            </View>
          </View>
          <Text style={[
            styles.amount,
            tx.type === 'income' ? { color: Colors.income } : { color: Colors.expense },
          ]}>
            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  info: { flex: 1, marginRight: 8, marginLeft: 12 },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 12, color: Colors.textTertiary },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  empty: {
    marginHorizontal: 16,
    padding: 32,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
});
