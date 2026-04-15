import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Owner } from '../../types';
import { OwnerColors, OwnerLabels } from '../../constants/colors';

interface OwnerBadgeProps {
  owner: Owner;
  size?: 'sm' | 'md';
}

export function OwnerBadge({ owner, size = 'sm' }: OwnerBadgeProps) {
  const color = OwnerColors[owner];
  const label = OwnerLabels[owner];

  return (
    <View style={[
      styles.badge,
      { backgroundColor: color + '18', borderColor: color + '40' },
      size === 'md' && styles.badgeMd,
    ]}>
      <Text style={[styles.text, { color }, size === 'md' && styles.textMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  textMd: {
    fontSize: 13,
  },
});
