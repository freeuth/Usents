import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, TextInput, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, OwnerColors, OwnerLabels } from '../../constants/colors';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Member } from '../../types';

export function HouseholdSettingsScreen({ navigation }: any) {
  const { household, member, updateHousehold } = useAuthStore();
  const [householdName, setHouseholdName] = useState(household?.name ?? '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!household) return;
    supabase
      .from('members')
      .select('*')
      .eq('household_id', household.id)
      .then(({ data }) => { if (data) setMembers(data); });
  }, [household]);

  const handleSaveName = async () => {
    if (!household || !householdName.trim()) return;
    setIsSaving(true);
    try {
      await updateHousehold(household.id, { name: householdName.trim() });
      setIsEditingName(false);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const EXPO_DEEP_LINK = 'exp://u.expo.dev/3ef61929-f17a-4cbd-86fe-994f69fe5e97?channel-name=main&runtime-version=1.0.0';

  const handleShareCode = () => {
    if (!household?.invite_code) return;
    Share.share({
      message: `[Usents 가계부] 같이 써요! 💰\n\n① Expo Go 설치 (App Store)\n② 아래 링크로 앱 열기\n${EXPO_DEEP_LINK}\n\n③ 회원가입 후 "참여하기" 선택\n④ 초대 코드 입력: ${household.invite_code}`,
      title: 'Usents 초대',
    });
  };

  const handleCopyCode = () => {
    if (!household?.invite_code) return;
    Alert.alert('초대 코드', household.invite_code, [
      { text: '닫기' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>가구 설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* 가구 이름 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>가구 정보</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowIconBox}>
                  <MaterialIcons name="home" size={18} color={Colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>가구 이름</Text>
                  {isEditingName ? (
                    <View style={styles.editRow}>
                      <TextInput
                        style={styles.editInput}
                        value={householdName}
                        onChangeText={setHouseholdName}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleSaveName}
                      />
                      <TouchableOpacity
                        onPress={handleSaveName}
                        disabled={isSaving}
                        style={styles.saveInlineBtn}
                      >
                        <Text style={styles.saveInlineBtnText}>저장</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => { setIsEditingName(false); setHouseholdName(household?.name ?? ''); }}
                        style={styles.cancelInlineBtn}
                      >
                        <Text style={styles.cancelInlineBtnText}>취소</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.valueRow}>
                      <Text style={styles.rowValue}>{household?.name}</Text>
                      <TouchableOpacity onPress={() => setIsEditingName(true)} style={{ padding: 4 }}>
                        <MaterialIcons name="edit" size={16} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* 초대 코드 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>가구 초대</Text>
            <View style={styles.card}>
              <View style={styles.inviteBox}>
                <MaterialIcons name="people" size={22} color={Colors.primary} style={{ marginBottom: 8 }} />
                <Text style={styles.inviteLabel}>초대 코드</Text>
                <Text style={styles.inviteCode}>{household?.invite_code ?? '-'}</Text>
                <Text style={styles.inviteHint}>이 코드를 공유하면 가족이 같은 가구에 참여할 수 있습니다</Text>
                <View style={styles.inviteBtns}>
                  <TouchableOpacity style={styles.inviteBtn} onPress={handleShareCode}>
                    <MaterialIcons name="share" size={16} color={Colors.primary} />
                    <Text style={styles.inviteBtnText}>공유하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.inviteBtn, styles.inviteBtnSecondary]} onPress={handleCopyCode}>
                    <MaterialIcons name="content-copy" size={16} color={Colors.textSecondary} />
                    <Text style={[styles.inviteBtnText, { color: Colors.textSecondary }]}>코드 보기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* 구성원 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>구성원 ({members.length}명)</Text>
            <View style={styles.card}>
              {members.map((m, idx) => (
                <View
                  key={m.id}
                  style={[styles.memberRow, idx < members.length - 1 && styles.memberBorder]}
                >
                  <View style={[styles.avatar, { backgroundColor: m.color ?? Colors.primary }]}>
                    <Text style={styles.avatarText}>{m.display_name?.charAt(0) ?? '?'}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.display_name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: OwnerColors[m.role] + '20' }]}>
                      <Text style={[styles.roleText, { color: OwnerColors[m.role] }]}>
                        {OwnerLabels[m.role]}
                      </Text>
                    </View>
                  </View>
                  {m.id === member?.id && (
                    <View style={styles.meBadge}>
                      <Text style={styles.meBadgeText}>나</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  section: { marginBottom: 16, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16,
  },
  rowIconBox: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primary + '12',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 4 },
  rowValue: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: {
    flex: 1, height: 36, borderWidth: 1, borderColor: Colors.primary,
    borderRadius: 8, paddingHorizontal: 10, fontSize: 15, color: Colors.textPrimary,
  },
  saveInlineBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.primary, borderRadius: 8,
  },
  saveInlineBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  cancelInlineBtn: { padding: 6 },
  cancelInlineBtnText: { fontSize: 13, color: Colors.textSecondary },

  inviteBox: { padding: 20, alignItems: 'center' },
  inviteLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 6 },
  inviteCode: {
    fontSize: 28, fontWeight: '800', color: Colors.primary,
    letterSpacing: 4, marginBottom: 10,
  },
  inviteHint: {
    fontSize: 12, color: Colors.textTertiary, textAlign: 'center',
    lineHeight: 18, marginBottom: 16,
  },
  inviteBtns: { flexDirection: 'row', gap: 10 },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary + '12', paddingHorizontal: 16,
    paddingVertical: 10, borderRadius: 12,
  },
  inviteBtnSecondary: { backgroundColor: Colors.surfaceAlt },
  inviteBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  memberBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  avatar: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  memberInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: '600' },
  meBadge: { backgroundColor: Colors.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  meBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
});
