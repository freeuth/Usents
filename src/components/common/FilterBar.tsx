import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { FilterOwner } from '../../types';
import { useOwnerLabels } from '../../lib/useOwnerLabels';

interface FilterBarProps {
  selected: FilterOwner;
  onSelect: (owner: FilterOwner) => void;
}

export function FilterBar({ selected, onSelect }: FilterBarProps) {
  const ownerLabels = useOwnerLabels();
  const FILTERS: { key: FilterOwner; label: string }[] = [
    { key: 'all',    label: '전체' },
    { key: 'me',     label: ownerLabels.me },
    { key: 'spouse', label: ownerLabels.spouse },
    { key: 'joint',  label: '공동' },
  ];

  return (
    <View style={styles.container}>
      {FILTERS.map(f => (
        <TouchableOpacity
          key={f.key}
          style={[styles.tab, selected === f.key && styles.tabActive]}
          onPress={() => onSelect(f.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, selected === f.key && styles.tabTextActive]}>
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
