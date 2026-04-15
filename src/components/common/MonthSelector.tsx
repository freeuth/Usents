import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { formatMonth } from '../../lib/helpers';

interface MonthSelectorProps {
  yearMonth: string;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthSelector({ yearMonth, onPrev, onNext }: MonthSelectorProps) {
  const isCurrentMonth = yearMonth === new Date().toISOString().slice(0, 7);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPrev} style={styles.arrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.arrowText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.monthText}>{formatMonth(yearMonth)}</Text>
      <TouchableOpacity
        onPress={onNext}
        style={[styles.arrow, isCurrentMonth && styles.arrowDisabled]}
        disabled={isCurrentMonth}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.arrowText, isCurrentMonth && styles.arrowTextDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  arrow: {
    padding: 8,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 22,
    color: Colors.textPrimary,
    fontWeight: '300',
  },
  arrowTextDisabled: {
    color: Colors.textTertiary,
  },
  monthText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginHorizontal: 16,
    minWidth: 120,
    textAlign: 'center',
  },
});
