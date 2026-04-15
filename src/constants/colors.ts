export const Colors = {
  // Primary brand colors
  primary: '#6366F1',      // indigo-500
  primaryLight: '#818CF8', // indigo-400
  primaryDark: '#4F46E5',  // indigo-600

  // Owner colors
  me: '#3B82F6',           // blue-500
  spouse: '#EC4899',       // pink-500
  joint: '#8B5CF6',        // violet-500

  // Semantic colors
  income: '#10B981',       // emerald-500
  expense: '#EF4444',      // red-500
  transfer: '#F59E0B',     // amber-500
  savings: '#06B6D4',      // cyan-500

  // Neutrals
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Status
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#10B981',
  info: '#3B82F6',

  // Chart palette
  chartColors: [
    '#6366F1', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  ],
};

export const OwnerColors: Record<string, string> = {
  me: Colors.me,
  spouse: Colors.spouse,
  joint: Colors.joint,
};

export const OwnerLabels: Record<string, string> = {
  me: '나',
  spouse: '와이프',
  joint: '공동',
};
