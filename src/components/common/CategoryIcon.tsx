import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../../constants/colors';

// Fallback map for old MaterialIcons names stored in DB
const ICON_MAP: Record<string, string> = {
  'restaurant': '🍽️', 'ramen-dining': '🍜', 'shopping-cart': '🛒',
  'directions-car': '🚗', 'home': '🏠', 'local-hospital': '🏥',
  'shopping-bag': '🛍️', 'sports-esports': '🎮', 'smartphone': '📱',
  'school': '📚', 'subscriptions': '📺', 'security': '🛡️',
  'face': '💄', 'pets': '🐾', 'payments': '💸',
  'account-balance-wallet': '💰', 'card-giftcard': '🎁', 'work': '💼',
  'trending-up': '📈', 'attach-money': '💵', 'savings': '🏦',
  'lock': '🔒', 'show-chart': '📊', 'leaderboard': '📉',
  'apartment': '🏢', 'sync-alt': '🔄', 'credit-card': '💳',
  'account-balance': '🏦', 'repeat': '🔁', 'add': '➕',
};

function resolveEmoji(icon: string): string {
  if (!icon) return '💸';
  if (/\p{Emoji}/u.test(icon)) return icon;
  return ICON_MAP[icon] ?? '💸';
}

interface CategoryIconProps {
  icon: string;
  color?: string;
  size?: number;
  bgSize?: number;
  borderRadius?: number;
}

export function CategoryIcon({
  icon,
  color = Colors.primary,
  size = 20,
  bgSize = 40,
  borderRadius = 12,
}: CategoryIconProps) {
  const emoji = resolveEmoji(icon);

  return (
    <View style={{
      width: bgSize,
      height: bgSize,
      borderRadius,
      backgroundColor: color + '20',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.9, lineHeight: size * 1.3 }}>{emoji}</Text>
    </View>
  );
}
