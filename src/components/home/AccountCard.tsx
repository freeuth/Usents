import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Account, AccountForecast } from '../../types';
import { Colors, OwnerColors } from '../../constants/colors';
import { formatCurrency } from '../../lib/helpers';
import { ACCOUNT_TYPE_LABELS } from '../../constants/categories';

interface AccountCardProps {
  account: Account;
  forecast: AccountForecast | null;
  onPress: () => void;
}

export function AccountCard({ account, forecast, onPress }: AccountCardProps) {
  const ownerColor = OwnerColors[account.owner];
  const isWarning = forecast?.isWarning ?? false;

  return (
    <TouchableOpacity
      style={[styles.card, isWarning && styles.cardWarning]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.ownerDot, { backgroundColor: ownerColor }]} />
        <Text style={styles.bankName}>{account.bank_name}</Text>
        <View style={[styles.typeBadge, { backgroundColor: ownerColor + '20' }]}>
          <Text style={[styles.typeText, { color: ownerColor }]}>
            {ACCOUNT_TYPE_LABELS[account.account_type]}
          </Text>
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
      <Text style={styles.balance}>{formatCurrency(account.current_balance)}</Text>

      {forecast && (
        <View style={styles.forecast}>
          <Text style={styles.forecastLabel}>월말 예상</Text>
          <Text style={[
            styles.forecastAmount,
            isWarning && { color: Colors.danger },
          ]}>
            {formatCurrency(forecast.forecastBalance)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 175,
    marginRight: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardWarning: {
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ownerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  bankName: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  balance: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  forecast: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forecastLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  forecastAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
