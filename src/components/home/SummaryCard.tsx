import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { formatCurrencyShort } from '../../lib/helpers';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface SummaryCardProps {
  label: string;
  amount: number;
  color?: string;
  iconName?: IconName;
}

export function SummaryCard({ label, amount, color = Colors.primary, iconName = 'account-balance-wallet' }: SummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
        <MaterialIcons name={iconName} size={18} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { color }]}>{formatCurrencyShort(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
