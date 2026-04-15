import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../stores/authStore';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MenuItem {
  icon: IconName;
  label: string;
  screen?: string;
  onPress?: () => void;
  badge?: string;
}

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: '관리',
    items: [
      { icon: 'repeat', label: '반복거래 관리', screen: 'Recurring' },
      { icon: 'label', label: '카테고리 관리', screen: 'Categories' },
    ],
  },
  {
    title: '분석',
    items: [
      { icon: 'bar-chart', label: '리포트', screen: 'Report' },
    ],
  },
  {
    title: '설정',
    items: [
      { icon: 'home', label: '가구 설정', screen: 'HouseholdSettings' },
      { icon: 'person', label: '프로필 설정', screen: 'ProfileSettings' },
    ],
  },
];

export function MoreScreen({ navigation }: any) {
  const { household, member, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>더보기</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: member?.color ?? Colors.primary }]}>
            <Text style={styles.avatarText}>
              {member?.display_name?.charAt(0) ?? '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{member?.display_name ?? '사용자'}</Text>
            <Text style={styles.profileHousehold}>{household?.name ?? '가구 미설정'}</Text>
          </View>
        </View>

        {MENU_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuGroup}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    idx < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => item.screen ? navigation.navigate(item.screen) : item.onPress?.()}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconBox}>
                    <MaterialIcons name={item.icon} size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <MaterialIcons name="chevron-right" size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  profileInfo: {},
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  profileHousehold: { fontSize: 13, color: Colors.textSecondary },

  section: { marginBottom: 16, marginHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  badge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  signOutBtn: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.danger + '10',
    borderRadius: 14,
    alignItems: 'center',
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
});
